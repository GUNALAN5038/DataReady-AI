import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as Papa from 'papaparse'
import * as XLSX from 'xlsx'
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
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  try {
    // 2. Validate request body
    const body = await request.json().catch(() => ({}))
    const { targetVersion } = body

    if (
      targetVersion === undefined ||
      targetVersion === null ||
      typeof targetVersion !== 'number' ||
      !Number.isInteger(targetVersion) ||
      targetVersion < 0
    ) {
      return NextResponse.json(
        { error: 'Invalid version. targetVersion must be a non-negative integer.' },
        { status: 400 }
      )
    }

    // 3. Fetch dataset and verify ownership
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (datasetError || !dataset) {
      return NextResponse.json({ error: 'Dataset not found.' }, { status: 404 })
    }

    if (dataset.status === 'processing') {
      return NextResponse.json({ error: 'Dataset is currently processing.' }, { status: 400 })
    }

    const currentVersion = dataset.current_version ?? 0

    if (targetVersion === currentVersion) {
      return NextResponse.json(
        { error: `Dataset is already at version ${targetVersion}.` },
        { status: 400 }
      )
    }

    if (targetVersion > currentVersion) {
      return NextResponse.json(
        { error: `Invalid version. Target version ${targetVersion} exceeds current version ${currentVersion}.` },
        { status: 400 }
      )
    }

    // 4. Locate target file path in Storage
    let targetFilePath = dataset.original_file_path
    if (targetVersion > 0) {
      targetFilePath = `${user.id}/${dataset.id}/versions/version_${targetVersion}.csv`
    }

    // 5. Download target file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('datasets')
      .download(targetFilePath)

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: 'Requested dataset version does not exist in storage.' },
        { status: 404 }
      )
    }

    // 6. Parse target dataset contents
    let parsedData: Record<string, unknown>[] = []
    let columns: string[] = []
    const ext = targetFilePath.split('.').pop()?.toLowerCase() || 'csv'

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
      return NextResponse.json(
        { error: 'Unsupported file format for version rollback.' },
        { status: 400 }
      )
    }

    const rowCount = parsedData.length
    const colCount = columns.length
    const newVersion = currentVersion + 1

    // 7. Serialize to standard CSV and write to new version path
    const csvContent = Papa.unparse({
      fields: columns,
      data: parsedData
    })

    const newFileName = `versions/version_${newVersion}.csv`
    const newFilePath = `${user.id}/${dataset.id}/${newFileName}`

    const { error: uploadError } = await supabase.storage
      .from('datasets')
      .upload(newFilePath, csvContent, {
        contentType: 'text/csv',
        upsert: false
      })

    if (uploadError) {
      return NextResponse.json(
        { error: `Unable to restore dataset version: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // 8. Re-run analysis on the reverted dataset
    const startTime = Date.now()
    const types = inferColumnTypes(parsedData, columns)
    const missingValues = analyzeMissingValues(parsedData, columns)
    const stats = calculateStatistics(parsedData, columns, types)
    const duplicates = detectDuplicates(parsedData)
    const outliers = detectOutliers(parsedData, columns, types)
    const mlReadiness = calculateMLReadiness(missingValues, duplicates, outliers, types, rowCount, colCount)
    const recommendations = generateRecommendations(missingValues, duplicates, outliers, types)
    const processingDuration = Date.now() - startTime

    // 9. Update dataset record atomically
    const { data: updatedDataset, error: updateError } = await supabase
      .from('datasets')
      .update({
        current_file_path: newFilePath,
        current_version: newVersion,
        row_count: rowCount,
        column_count: colCount,
        column_metadata: columns.map(c => ({ name: c, type: types[c] || 'unknown' })),
        sample_data: parsedData.slice(0, 100),
        status: 'analyzed'
      })
      .eq('id', id)
      .eq('current_version', currentVersion)
      .select()
      .single()

    if (updateError || !updatedDataset) {
      // Concurrency conflict / failure: clean up new file
      await supabase.storage.from('datasets').remove([newFilePath])
      return NextResponse.json(
        { error: 'Update conflict: Dataset was modified by another process. Please refresh and try again.' },
        { status: 409 }
      )
    }

    // 10. Record new analyses records referencing dataset_version = newVersion
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

    // 11. Record rollback history in dataset_transformations
    const affectedRows = Math.abs(rowCount - (dataset.row_count || 0))
    const affectedCols = Math.abs(colCount - (dataset.column_count || 0))

    await supabase.from('dataset_transformations').insert({
      dataset_id: id,
      user_id: user.id,
      transformation_type: 'revert',
      configuration: {
        action: 'revert',
        target_version: targetVersion,
        source_version: currentVersion,
        description: `Reverted dataset to Version ${targetVersion}`
      },
      previous_version: currentVersion,
      new_version: newVersion,
      affected_rows: affectedRows,
      affected_columns: affectedCols,
      status: 'completed'
    })

    return NextResponse.json({
      success: true,
      newVersion,
      targetVersion,
      rowCount,
      columnCount: colCount,
      message: `Dataset reverted successfully to Version ${targetVersion}.`
    })

  } catch (err: unknown) {
    console.error('Revert version error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to restore dataset version.' },
      { status: 500 }
    )
  }
}
