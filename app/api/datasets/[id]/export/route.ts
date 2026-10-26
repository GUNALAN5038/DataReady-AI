import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as Papa from 'papaparse'
import * as XLSX from 'xlsx'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Please log in.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'current' // 'current' or 'original'
  const format = (searchParams.get('format') || 'csv').toLowerCase() // 'csv' or 'xlsx'

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

    const currentVersion = dataset.current_version ?? 0
    let targetPath = dataset.current_file_path || dataset.original_file_path
    if (type === 'original') {
      targetPath = dataset.original_file_path
    }

    if (!targetPath) {
      return NextResponse.json({ error: 'File path not found for this dataset.' }, { status: 400 })
    }

    // 3. Download file from private Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('datasets')
      .download(targetPath)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to retrieve dataset file from storage.' }, { status: 404 })
    }

    const originalExt = targetPath.split('.').pop()?.toLowerCase() || 'csv'
    const baseName = dataset.name.replace(/\.[^/.]+$/, '')
    const versionSuffix = type === 'current' ? `_v${currentVersion}` : '_original'

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

      const downloadFileName = `${baseName}${versionSuffix}.xlsx`

      return new Response(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadFileName)}"`,
        },
      })
    }

    // Default: CSV format
    if (originalExt === 'csv') {
      // Return direct stream or generate signed URL
      const downloadFileName = `${baseName}${versionSuffix}.csv`
      const csvText = await fileData.text()

      return new Response(csvText, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadFileName)}"`,
        },
      })
    } else {
      // Need to convert XLSX or JSON to CSV
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
        data: parsedRows
      })

      const downloadFileName = `${baseName}${versionSuffix}.csv`

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadFileName)}"`,
        },
      })
    }

  } catch (err: unknown) {
    console.error('Export error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to export dataset.' },
      { status: 500 }
    )
  }
}
