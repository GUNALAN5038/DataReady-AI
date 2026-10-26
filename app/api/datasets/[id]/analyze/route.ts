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

  // 1. Verify user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 2. Fetch dataset record
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (datasetError || !dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
    }

    // Mark as processing
    await supabase.from('datasets').update({ status: 'processing' }).eq('id', id)

    // 3. Download file from storage (prefer current_file_path if transformed)
    const targetFilePath = dataset.current_file_path || dataset.original_file_path
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('datasets')
      .download(targetFilePath)

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`)
    }

    // 4. Parse file
    let parsedData: Record<string, unknown>[] = []
    let columns: string[] = []

    const ext = targetFilePath.split('.').pop()?.toLowerCase() || dataset.file_name.split('.').pop()?.toLowerCase()
    
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
      if (parsedData.length > 0) {
        columns = Object.keys(parsedData[0])
      }
    } else if (ext === 'json') {
      const text = await fileData.text()
      parsedData = JSON.parse(text)
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        columns = Object.keys(parsedData[0])
      }
    } else {
      throw new Error('Unsupported format during analysis')
    }

    const rowCount = parsedData.length
    const colCount = columns.length
    const currentVersion = dataset.current_version ?? 0

    // 5. Run Analysis
    const startTime = Date.now()
    const types = inferColumnTypes(parsedData, columns)
    const missingValues = analyzeMissingValues(parsedData, columns)
    const stats = calculateStatistics(parsedData, columns, types)
    const duplicates = detectDuplicates(parsedData)
    const outliers = detectOutliers(parsedData, columns, types)
    const mlReadiness = calculateMLReadiness(missingValues, duplicates, outliers, types, rowCount, colCount)
    const recommendations = generateRecommendations(missingValues, duplicates, outliers, types)
    const processing_duration_ms = Date.now() - startTime

    // 6. Save results to analyses table
    const analysisRecord = {
      dataset_id: id,
      user_id: user.id,
      analysis_type: 'full_analysis',
      dataset_version: currentVersion,
      results: { types, missingValues, stats, duplicates, outliers, mlReadiness },
      summary: stats,
      ml_readiness_score: mlReadiness.overallScore,
      recommendations,
      processing_duration_ms
    }

    // Clean up previous analyses for THIS specific version only, preserving historical versions
    await supabase.from('analyses').delete().eq('dataset_id', id).eq('dataset_version', currentVersion)
    
    // Insert new
    await supabase.from('analyses').insert(analysisRecord)

    // Save specific ML Readiness score for easy querying
    await supabase.from('analyses').insert({
      dataset_id: id,
      user_id: user.id,
      analysis_type: 'ml_readiness',
      dataset_version: currentVersion,
      results: mlReadiness,
      ml_readiness_score: mlReadiness.overallScore
    })

    // 7. Update dataset status and metadata
    await supabase.from('datasets').update({ 
      status: 'analyzed',
      row_count: rowCount,
      column_count: colCount,
      column_metadata: columns.map(c => ({ name: c, type: types[c] || 'unknown' })),
      sample_data: parsedData.slice(0, 100)
    }).eq('id', id)

    return NextResponse.json({ success: true })

  } catch (err: unknown) {
    // Save error state
    const errorMessage = err instanceof Error ? err.message : String(err);
    await supabase.from('datasets').update({ 
      status: 'failed',
      processing_error: errorMessage
    }).eq('id', id)

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
