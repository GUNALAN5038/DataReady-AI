import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { applyTransformations } from '@/lib/analysis/transformations'
import { TransformationRequest } from '@/types/transformations'
import { inferColumnTypes } from '@/lib/analysis/data-types'
import { analyzeMissingValues } from '@/lib/analysis/missing-values'
import { calculateStatistics } from '@/lib/analysis/statistics'
import { detectDuplicates } from '@/lib/analysis/duplicates'
import { detectOutliers } from '@/lib/analysis/outliers'
import { calculateMLReadiness } from '@/lib/analysis/ml-readiness'
import { generateRecommendations } from '@/lib/analysis/recommendations'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Please log in to transform this dataset.' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => null) as TransformationRequest | null
    if (!body || !body.transformations || !Array.isArray(body.transformations) || body.transformations.length === 0) {
      return NextResponse.json({ error: 'No valid transformations provided in request body.' }, { status: 400 })
    }

    const { transformations } = body

    // 2. Fetch current dataset and verify ownership
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (datasetError || !dataset) {
      return NextResponse.json({ error: 'Dataset not found or access denied.' }, { status: 404 })
    }

    if (dataset.status === 'processing') {
      return NextResponse.json({ error: 'Dataset is currently processing. Please wait.' }, { status: 400 })
    }

    const currentFilePath = dataset.current_file_path || dataset.original_file_path
    const currentVersion = dataset.current_version ?? 0
    const newVersion = currentVersion + 1

    // 3. Download current file from private storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('datasets')
      .download(currentFilePath)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: `Failed to retrieve current dataset file: ${downloadError?.message || 'File not found'}` }, { status: 404 })
    }

    // 4. Parse file contents
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
      return NextResponse.json({ error: 'Unsupported file format for transformation.' }, { status: 400 })
    }

    const rowsBefore = parsedData.length

    // 5. Apply transformations safely
    let outcome
    try {
      outcome = applyTransformations(parsedData, columns, transformations)
    } catch (transformErr: unknown) {
      return NextResponse.json(
        { error: transformErr instanceof Error ? transformErr.message : 'Transformation execution failed.' },
        { status: 422 }
      )
    }

    const { data: transformedData, columns: newColumns, affectedRows, affectedColumns } = outcome
    const rowsAfter = transformedData.length

    if (newColumns.length === 0) {
      return NextResponse.json({ error: 'Transformation would result in a dataset with zero columns.' }, { status: 422 })
    }

    // 6. Convert transformed dataset to standard CSV
    const csvContent = Papa.unparse({
      fields: newColumns,
      data: transformedData
    })

    // 7. Save transformed dataset as new version in Supabase Storage
    const newFileName = `versions/version_${newVersion}.csv`
    const newFilePath = `${user.id}/${dataset.id}/${newFileName}`

    const { error: uploadError } = await supabase.storage
      .from('datasets')
      .upload(newFilePath, csvContent, {
        contentType: 'text/csv',
        upsert: false
      })

    if (uploadError) {
      return NextResponse.json({ error: `Failed to save new dataset version: ${uploadError.message}` }, { status: 500 })
    }

    // 8. Re-run analysis engine on the transformed data
    const startTime = Date.now()
    const types = inferColumnTypes(transformedData, newColumns)
    const missingValues = analyzeMissingValues(transformedData, newColumns)
    const stats = calculateStatistics(transformedData, newColumns, types)
    const duplicates = detectDuplicates(transformedData)
    const outliers = detectOutliers(transformedData, newColumns, types)
    const mlReadiness = calculateMLReadiness(missingValues, duplicates, outliers, types, rowsAfter, newColumns.length)
    const recommendations = generateRecommendations(missingValues, duplicates, outliers, types)
    const processingDuration = Date.now() - startTime

    // 9. Atomic optimistic database update
    const { data: updatedDataset, error: updateError } = await supabase
      .from('datasets')
      .update({
        current_file_path: newFilePath,
        current_version: newVersion,
        row_count: rowsAfter,
        column_count: newColumns.length,
        column_metadata: newColumns.map(c => ({ name: c, type: types[c] || 'unknown' })),
        sample_data: transformedData.slice(0, 100),
        status: 'analyzed'
      })
      .eq('id', id)
      .eq('current_version', currentVersion)
      .select()
      .single()

    if (updateError || !updatedDataset) {
      // Concurrency conflict or failure: clean up new storage file
      await supabase.storage.from('datasets').remove([newFilePath])
      return NextResponse.json(
        { error: 'Update conflict: Dataset was modified by another process. Please refresh and try again.' },
        { status: 409 }
      )
    }

    // 10. Record transformation history in dataset_transformations
    const primaryTransformType = transformations.length === 1 ? transformations[0].action : 'multi_transformation'
    const { error: auditError } = await supabase.from('dataset_transformations').insert({
      dataset_id: id,
      user_id: user.id,
      previous_version: currentVersion,
      new_version: newVersion,
      transformation_type: primaryTransformType,
      configuration: transformations,
      affected_rows: affectedRows,
      affected_columns: affectedColumns,
      status: 'completed'
    })

    if (auditError) {
      console.error('Failed to write transformation audit record:', auditError)
    }

    // 11. Insert new analysis records tagged with dataset_version = newVersion
    const fullAnalysisRecord = {
      dataset_id: id,
      user_id: user.id,
      analysis_type: 'full_analysis',
      dataset_version: newVersion,
      results: { types, missingValues, stats, duplicates, outliers, mlReadiness },
      summary: stats,
      ml_readiness_score: mlReadiness.overallScore,
      recommendations,
      processing_duration_ms: processingDuration
    }

    await supabase.from('analyses').insert(fullAnalysisRecord)

    await supabase.from('analyses').insert({
      dataset_id: id,
      user_id: user.id,
      analysis_type: 'ml_readiness',
      dataset_version: newVersion,
      results: mlReadiness,
      ml_readiness_score: mlReadiness.overallScore
    })

    return NextResponse.json({
      success: true,
      rowsBefore,
      rowsAfter,
      affectedRows,
      affectedColumns,
      newVersion,
      dataset: {
        id: updatedDataset.id,
        name: updatedDataset.name,
        current_version: updatedDataset.current_version,
        row_count: updatedDataset.row_count,
        column_count: updatedDataset.column_count
      }
    })

  } catch (err: unknown) {
    console.error('Transformation route unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected server error occurred during transformation.' },
      { status: 500 }
    )
  }
}
