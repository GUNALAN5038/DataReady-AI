import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { applyTransformations } from '@/lib/analysis/transformations'
import { detectDuplicates } from '@/lib/analysis/duplicates'
import { TransformationRequest, TransformationPreviewResult } from '@/types/transformations'

function countMissingCells(data: Record<string, unknown>[], columns: string[]): number {
  let count = 0
  for (const row of data) {
    for (const col of columns) {
      const val = row[col]
      if (val === null || val === undefined || (typeof val === 'number' && isNaN(val)) || (typeof val === 'string' && val.trim() === '')) {
        count++
      }
    }
  }
  return count
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => null) as TransformationRequest | null
    if (!body || !body.transformations || !Array.isArray(body.transformations) || body.transformations.length === 0) {
      return NextResponse.json({ error: 'No transformations provided for preview.' }, { status: 400 })
    }

    const { transformations } = body

    // 2. Fetch dataset and verify ownership
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (datasetError || !dataset) {
      return NextResponse.json({ error: 'Dataset not found.' }, { status: 404 })
    }

    const currentFilePath = dataset.current_file_path || dataset.original_file_path

    // 3. Download current file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('datasets')
      .download(currentFilePath)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download dataset for preview.' }, { status: 404 })
    }

    // 4. Parse file
    let parsedData: Record<string, unknown>[] = []
    let columns: string[] = []
    const ext = currentFilePath.split('.').pop()?.toLowerCase() || 'csv'

    if (ext === 'csv') {
      const text = await fileData.text()
      const results = Papa.parse(text, { header: true, skipEmptyLines: true })
      parsedData = results.data as Record<string, unknown>[]
      columns = results.meta.fields || []
    } else if (ext === 'xlsx' || ext === 'xls') {
      const arrayBuffer = await fileData.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      parsedData = XLSX.utils.sheet_to_json(worksheet)
      if (parsedData.length > 0) columns = Object.keys(parsedData[0])
    } else if (ext === 'json') {
      const text = await fileData.text()
      parsedData = JSON.parse(text)
      if (Array.isArray(parsedData) && parsedData.length > 0) columns = Object.keys(parsedData[0])
    } else {
      return NextResponse.json({ error: 'Unsupported file format.' }, { status: 400 })
    }

    const rowsBefore = parsedData.length
    const columnsBefore = columns.length
    const missingValuesBefore = countMissingCells(parsedData, columns)
    const duplicatesBefore = detectDuplicates(parsedData).duplicateCount

    // 5. Apply transformations in-memory
    let outcome
    try {
      outcome = applyTransformations(parsedData, columns, transformations)
    } catch (err: unknown) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Transformation preview failed.' },
        { status: 422 }
      )
    }

    const { data: transformedData, columns: newColumns, affectedRows, affectedColumns } = outcome
    const rowsAfter = transformedData.length
    const columnsAfter = newColumns.length
    const missingValuesAfter = countMissingCells(transformedData, newColumns)
    const duplicatesAfter = detectDuplicates(transformedData).duplicateCount

    const previewResponse: TransformationPreviewResult = {
      success: true,
      rowsBefore,
      rowsAfter,
      columnsBefore,
      columnsAfter,
      missingValuesBefore,
      missingValuesAfter,
      duplicatesBefore,
      duplicatesAfter,
      affectedRows,
      affectedColumns,
      samplePreview: transformedData.slice(0, 10),
      columns: newColumns
    }

    return NextResponse.json(previewResponse)

  } catch (err: unknown) {
    console.error('Preview error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error generating preview.' },
      { status: 500 }
    )
  }
}
