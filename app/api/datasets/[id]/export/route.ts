import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { createNotification } from '@/lib/notifications'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient(request)

  // 1. Authenticate user
  const user = (await getAuthenticatedUser()) || (await supabase.auth.getUser()).data?.user
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Please log in to export this dataset.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'current' // 'current' or 'original'
  const format = (searchParams.get('format') || 'csv').toLowerCase() // 'csv' or 'xlsx'
  const versionQuery = searchParams.get('version')

  if (format !== 'csv' && format !== 'xlsx') {
    return NextResponse.json(
      { error: `Unsupported export format "${format}". Supported formats are "csv" and "xlsx".` },
      { status: 400 }
    )
  }

  try {
    // 2. Fetch dataset metadata and verify ownership
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('id, name, original_file_path, current_file_path, current_version')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (datasetError || !dataset) {
      return NextResponse.json({ error: 'Dataset not found or access denied.' }, { status: 404 })
    }

    let targetPath = dataset.current_file_path || dataset.original_file_path
    let exportVersion = dataset.current_version ?? 0

    if (type === 'original' || versionQuery === '0') {
      targetPath = dataset.original_file_path
      exportVersion = 0
    } else if (versionQuery !== null && !isNaN(Number(versionQuery))) {
      const parsedVer = Number(versionQuery)
      if (parsedVer === dataset.current_version) {
        targetPath = dataset.current_file_path || dataset.original_file_path
        exportVersion = dataset.current_version
      } else if (parsedVer === 0) {
        targetPath = dataset.original_file_path
        exportVersion = 0
      } else {
        // Target specific version file in versions/
        targetPath = `${user.id}/${dataset.id}/versions/version_${parsedVer}.csv`
        exportVersion = parsedVer
      }
    } else {
      targetPath = dataset.current_file_path || dataset.original_file_path
      exportVersion = dataset.current_version ?? 0
    }

    if (!targetPath) {
      return NextResponse.json({ error: 'No file path found for the requested dataset version.' }, { status: 400 })
    }

    // 3. Download file from private Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('datasets')
      .download(targetPath)

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: `Failed to retrieve dataset file: ${downloadError?.message || 'File not found in storage.'}` },
        { status: 404 }
      )
    }

    const originalExt = targetPath.split('.').pop()?.toLowerCase() || 'csv'
    const safeBaseName = (dataset.name || 'dataset')
      .replace(/\.[^/.]+$/, '')
      .replace(/[/\\?%*:|"<>]/g, '_')
      .trim() || 'dataset'

    const versionSuffix = type === 'original' || exportVersion === 0 ? '_original' : `_v${exportVersion}`
    const downloadFileName = `${safeBaseName}${versionSuffix}.${format}`
    const safeAsciiName = downloadFileName.replace(/[^\x20-\x7E]/g, '_')

    // 4. Format Conversion & Delivery
    if (format === 'xlsx') {
      let sheetData: Record<string, unknown>[] = []

      if (originalExt === 'csv') {
        const csvText = await fileData.text()
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true })
        sheetData = parsed.data as Record<string, unknown>[]
      } else if (originalExt === 'xlsx' || originalExt === 'xls') {
        const buffer = await fileData.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        sheetData = XLSX.utils.sheet_to_json(sheet)
      } else if (originalExt === 'json') {
        const text = await fileData.text()
        sheetData = JSON.parse(text)
      }

      const worksheet = XLSX.utils.json_to_sheet(sheetData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

      await createNotification({
        userId: user.id,
        title: 'Dataset Exported',
        message: `Exported dataset "${dataset.name}" (Version ${exportVersion}) as XLSX.`,
        type: 'success',
      }).catch(() => {})

      return new Response(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${encodeURIComponent(downloadFileName)}`,
          'Access-Control-Expose-Headers': 'Content-Disposition',
        },
      })
    }

    // Default: CSV format
    let finalCsv = ''
    if (originalExt === 'csv') {
      const csvText = await fileData.text()
      finalCsv = csvText.startsWith('\uFEFF') ? csvText : '\uFEFF' + csvText
    } else {
      // Convert XLSX or JSON to CSV
      let parsedRows: Record<string, unknown>[] = []
      let headers: string[] = []

      if (originalExt === 'xlsx' || originalExt === 'xls') {
        const buffer = await fileData.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        parsedRows = XLSX.utils.sheet_to_json(sheet)
        if (parsedRows.length > 0) headers = Object.keys(parsedRows[0])
      } else if (originalExt === 'json') {
        const text = await fileData.text()
        parsedRows = JSON.parse(text)
        if (Array.isArray(parsedRows) && parsedRows.length > 0) headers = Object.keys(parsedRows[0])
      }

      const csvContent = Papa.unparse({
        fields: headers,
        data: parsedRows,
      })
      finalCsv = '\uFEFF' + csvContent
    }

    await createNotification({
      userId: user.id,
      title: 'Dataset Exported',
      message: `Exported dataset "${dataset.name}" (Version ${exportVersion}) as CSV.`,
      type: 'success',
    }).catch(() => {})

    return new Response(finalCsv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${encodeURIComponent(downloadFileName)}`,
        'Access-Control-Expose-Headers': 'Content-Disposition',
      },
    })

  } catch (err: unknown) {
    console.error('Export error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to export dataset.' },
      { status: 500 }
    )
  }
}

