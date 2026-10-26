import { createClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai/provider'
import { generateObject } from 'ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const maxDuration = 45

const insightsSchema = z.object({
  summary: z.object({
    dataset_overview: z.string().describe('Concise description of dataset contents, row/column counts, and primary data types.'),
    quality_overview: z.string().describe('Clear assessment of overall data quality based on completeness, uniqueness, consistency, and validity.'),
    ml_readiness_overview: z.string().describe('Evaluation of dataset suitability for machine learning workflows.'),
    strengths: z.array(z.string()).describe('2 to 4 major strengths of the dataset.'),
    weaknesses: z.array(z.string()).describe('2 to 4 major weaknesses or risks in the dataset.')
  }),
  score_breakdown: z.object({
    completeness: z.object({
      score: z.number().describe('Calculated completeness score from analysis (0-100)'),
      explanation: z.string().describe('Concise 1-2 sentence explanation of completeness referring to actual missing values and percentages')
    }),
    consistency: z.object({
      score: z.number().describe('Calculated consistency score from analysis (0-100)'),
      explanation: z.string().describe('Concise 1-2 sentence explanation of data type consistency across columns')
    }),
    validity: z.object({
      score: z.number().describe('Calculated validity score from analysis (0-100)'),
      explanation: z.string().describe('Concise 1-2 sentence explanation of validity and statistical outlier distribution')
    }),
    uniqueness: z.object({
      score: z.number().describe('Calculated uniqueness score from analysis (0-100)'),
      explanation: z.string().describe('Concise 1-2 sentence explanation of duplicate rows or unique record distribution')
    }),
    feature_quality: z.object({
      score: z.number().describe('Calculated feature quality score from analysis (0-100)'),
      explanation: z.string().describe('Concise 1-2 sentence explanation of row-to-column ratio and feature utility for ML')
    })
  }),
  key_findings: z.array(
    z.object({
      title: z.string().describe('Concise finding headline (e.g., High missing-value rate in income column)'),
      explanation: z.string().describe('Detailed observation grounded exclusively in the provided statistics'),
      severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    })
  ).describe('3 to 6 most critical findings discovered in the data'),
  anomalies: z.array(
    z.object({
      column: z.string().describe('Column name where anomaly exists or "Dataset-level"'),
      description: z.string().describe('Specific anomaly description grounded in analysis data'),
      severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      why_it_matters: z.string().describe('Impact or reason why this anomaly affects analysis or ML'),
      suggested_action: z.string().describe('Actionable step to resolve or investigate')
    })
  ).describe('List of reliable anomalies detected in the dataset. Return an empty array if no significant anomalies exist.'),
  recommendations: z.array(
    z.object({
      title: z.string().describe('Short title for the recommendation'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      problem: z.string().describe('The underlying data issue being addressed'),
      action: z.string().describe('Recommended action to take'),
      reason: z.string().describe('Why this action should be taken'),
      transformation_suggestion: z.object({
        action: z.enum(['drop_duplicates', 'drop_missing', 'fill_missing', 'drop_column', 'rename_column', 'handle_outliers', 'convert_type', 'none']),
        columns: z.array(z.string()).optional(),
        column: z.string().optional(),
        method: z.enum(['mean', 'median', 'mode', 'custom', 'remove', 'cap', 'drop_row']).optional(),
        customValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
        newName: z.string().optional(),
        targetType: z.enum(['string', 'integer', 'float', 'boolean', 'date']).optional(),
        is_supported: z.boolean().describe('True ONLY if this exact operation is supported by the transformation engine. False otherwise.'),
        button_label: z.string().optional().describe('Action button text e.g. "Remove Duplicates" or "Drop Missing Rows"')
      }).optional()
    })
  ).describe('Actionable recommendations prioritized by importance'),
  ml_readiness: z.object({
    assessment: z.string().describe('Detailed explanation of why the dataset received its ML readiness score'),
    score_driver: z.string().describe('Key factors driving the score higher or lower'),
    blocking_issues: z.array(z.string()).describe('Specific issues that must or should be addressed before model training'),
    recommended_actions: z.array(z.string()).describe('Ordered steps to prepare this dataset for ML')
  })
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in.' }, { status: 401 })
    }

    // 1. Fetch dataset and verify ownership
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('id, name, row_count, column_count, column_metadata, current_version, status, processing_error')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (datasetError || !dataset) {
      return NextResponse.json({ error: 'Dataset not found or access denied.' }, { status: 404 })
    }

    if (dataset.status === 'processing' || dataset.status === 'uploading' || dataset.status === 'failed') {
      return NextResponse.json(
        { error: 'AI insights require a completed dataset analysis.' },
        { status: 400 }
      )
    }

    const currentVersion = dataset.current_version ?? 0

    // 2. Fetch full analysis and ML readiness analysis for the current dataset version
    let fullAnalysis = null
    const { data: versionedFull } = await supabase
      .from('analyses')
      .select('*')
      .eq('dataset_id', id)
      .eq('analysis_type', 'full_analysis')
      .eq('dataset_version', currentVersion)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (versionedFull) {
      fullAnalysis = versionedFull
    } else {
      const { data: latestFull } = await supabase
        .from('analyses')
        .select('*')
        .eq('dataset_id', id)
        .eq('analysis_type', 'full_analysis')
        .order('dataset_version', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      fullAnalysis = latestFull
    }

    let mlReadinessAnalysis = null
    const { data: versionedML } = await supabase
      .from('analyses')
      .select('*')
      .eq('dataset_id', id)
      .eq('analysis_type', 'ml_readiness')
      .eq('dataset_version', currentVersion)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (versionedML) {
      mlReadinessAnalysis = versionedML
    } else {
      const { data: latestML } = await supabase
        .from('analyses')
        .select('*')
        .eq('dataset_id', id)
        .eq('analysis_type', 'ml_readiness')
        .order('dataset_version', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      mlReadinessAnalysis = latestML
    }

    if (!fullAnalysis) {
      return NextResponse.json({ error: 'AI insights require a completed dataset analysis.' }, { status: 400 })
    }

    // Fetch transformation history if applicable
    const { data: transformations } = await supabase
      .from('dataset_transformations')
      .select('transformation_type, affected_rows, affected_columns, new_version, created_at')
      .eq('dataset_id', id)
      .order('new_version', { ascending: true })

    // Resolve AI model prioritizing user's configured key
    let model
    try {
      model = await getAIProvider(user.id)
    } catch (providerError: unknown) {
      return NextResponse.json(
        { error: providerError instanceof Error ? providerError.message : 'AI provider not configured. Please add an API key in Settings.' },
        { status: 503 }
      )
    }

    // 3. Prepare structured, token-efficient analysis data for Gemini
    const results = fullAnalysis.results || {}
    const mlComponents = mlReadinessAnalysis?.results?.components || results.mlReadiness?.components || {
      completeness: 100,
      consistency: 100,
      validity: 100,
      uniqueness: 100,
      featureQuality: 100
    }
    const overallScore = fullAnalysis.ml_readiness_score ?? mlReadinessAnalysis?.ml_readiness_score ?? 0

    // Missing values breakdown
    const missingValuesSummary = Object.entries(results.missingValues || {})
      .filter(([, val]) => (val as { missingCount: number }).missingCount > 0)
      .map(([col, val]) => {
        const mv = val as { missingCount: number; missingPercentage: number; severity: string }
        return {
          column: col,
          missingCount: mv.missingCount,
          missingPercentage: Number(mv.missingPercentage.toFixed(1)),
          severity: mv.severity
        }
      })

    // Outliers breakdown
    const outliersSummary = Object.entries(results.outliers || {})
      .filter(([, val]) => (val as { outlierCount: number }).outlierCount > 0)
      .map(([col, val]) => {
        const out = val as { outlierCount: number; outlierPercentage: number; lowerBound: number; upperBound: number }
        return {
          column: col,
          outlierCount: out.outlierCount,
          outlierPercentage: Number(out.outlierPercentage.toFixed(1)),
          lowerBound: Number(out.lowerBound.toFixed(2)),
          upperBound: Number(out.upperBound.toFixed(2))
        }
      })

    // Column types breakdown
    const columnTypes = results.types || {}
    const typeDistribution: Record<string, number> = {}
    Object.values(columnTypes).forEach(t => {
      const typeStr = String(t)
      typeDistribution[typeStr] = (typeDistribution[typeStr] || 0) + 1
    })

    // Column metadata with stats
    const columnProfiles = (dataset.column_metadata || []).map((col: { name: string; type?: string }) => {
      const colName = col.name
      const type = columnTypes[colName] || col.type || 'unknown'
      const stat = results.stats?.[colName]
      const mv = results.missingValues?.[colName]
      const out = results.outliers?.[colName]

      return {
        name: colName,
        type,
        missingPercentage: mv ? Number(mv.missingPercentage.toFixed(1)) : 0,
        outliersCount: out ? out.outlierCount : 0,
        ...(type === 'numeric' && stat?.mean !== undefined ? {
          mean: Number(stat.mean.toFixed(2)),
          median: Number(stat.median.toFixed(2)),
          min: Number(stat.min.toFixed(2)),
          max: Number(stat.max.toFixed(2))
        } : {}),
        ...(type === 'string' && stat?.unique !== undefined ? {
          uniqueValues: stat.unique,
          mode: stat.mode
        } : {})
      }
    })

    const structuredPromptData = {
      datasetMetadata: {
        name: dataset.name,
        rowCount: dataset.row_count,
        columnCount: dataset.column_count,
        currentVersion: dataset.current_version || 0,
        typeDistribution
      },
      qualityScores: {
        overallMLReadinessScore: overallScore,
        components: {
          completeness: mlComponents.completeness,
          consistency: mlComponents.consistency,
          validity: mlComponents.validity,
          uniqueness: mlComponents.uniqueness,
          featureQuality: mlComponents.featureQuality
        }
      },
      duplicates: {
        duplicateRowCount: results.duplicates?.duplicateCount || 0,
        duplicatePercentage: Number((results.duplicates?.duplicatePercentage || 0).toFixed(1)),
        uniqueRowCount: results.duplicates?.uniqueRows || dataset.row_count
      },
      missingValues: missingValuesSummary,
      outliers: outliersSummary,
      columns: columnProfiles,
      ruleBasedRecommendations: fullAnalysis.recommendations || [],
      transformationHistory: transformations && transformations.length > 0 ? transformations : 'No transformations applied yet (Version 0 raw upload).'
    }

    // 4. Generate structured insights with Gemini
    const { object } = await generateObject({
      model,
      schema: insightsSchema,
      prompt: `You are a professional data quality and machine learning readiness analyst for the DataReady AI platform.

Analyze the structured dataset statistics provided below and generate high-value, precise, actionable dataset insights.

==================================================
STRUCTURED DATASET ANALYSIS DATA
==================================================
${JSON.stringify(structuredPromptData, null, 2)}

==================================================
CRITICAL ANALYSIS RULES
==================================================
1. STRICT ACCURACY: Use ONLY the numbers and facts provided in the analysis statistics above. NEVER hallucinate or invent dataset statistics, rows, column names, or percentages.
2. SUMMARY:
   - Provide a concise dataset overview explaining what the dataset contains, its scale (rows, columns), and primary column types.
   - Provide a quality overview assessing overall cleanliness based on completeness, uniqueness, consistency, and validity.
   - Provide an ML readiness overview evaluating whether it is ready for model training or needs preprocessing.
   - List 2-4 concrete strengths and 2-4 concrete weaknesses grounded in the numbers.
3. SCORE BREAKDOWN:
   - For each quality score component (completeness: ${mlComponents.completeness}, consistency: ${mlComponents.consistency}, validity: ${mlComponents.validity}, uniqueness: ${mlComponents.uniqueness}, feature_quality: ${mlComponents.featureQuality}), preserve the exact score and write a 1-2 sentence explanation referencing real analysis values (e.g., exact missing columns or outlier counts).
4. KEY FINDINGS:
   - Identify 3-6 of the most impactful observations.
   - Categorize each finding with an appropriate severity: 'CRITICAL', 'HIGH', 'MEDIUM', or 'LOW'.
5. POTENTIAL ANOMALIES:
   - Identify legitimate anomalies from the statistics (such as high outlier rates, extreme missingness, or duplicate anomalies).
   - If NO significant anomalies are present in the analysis data, return an empty array [] for anomalies.
6. SMART RECOMMENDATIONS & TRANSFORMATION BRIDGE:
   - Provide prioritized recommendations ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW').
   - For recommendations that map directly to our supported transformations, populate transformation_suggestion with is_supported: true:
     * 'drop_duplicates': remove duplicate rows (parameters: { button_label: 'Remove Duplicates' })
     * 'drop_missing': remove rows with missing values (parameters: { columns: ['col_name'] } or columns: ['all'], button_label: 'Drop Missing Rows')
     * 'fill_missing': impute missing values (parameters: { column: 'col_name', method: 'mean'|'median'|'mode'|'custom', customValue?: ... }, button_label: 'Fill Missing Values')
     * 'handle_outliers': treat outliers (parameters: { column: 'col_name', method: 'remove'|'cap' }, button_label: 'Handle Outliers')
     * 'drop_column': drop unnecessary/high-missing column (parameters: { columns: ['col_name'] }, button_label: 'Drop Column')
     * 'rename_column': rename column (parameters: { column: 'old_name', newName: 'new_name' }, button_label: 'Rename Column')
     * 'convert_type': cast column type (parameters: { column: 'col_name', targetType: 'integer'|'float'|'string'|'boolean'|'date' }, button_label: 'Convert Type')
   - If the recommended action requires manual inspection, custom logic, or is NOT directly supported by the above operations, set is_supported: false and action to 'none'.
7. ML READINESS:
   - Explain why the dataset scored ${overallScore}/100.
   - Detail the primary positive and negative score drivers.
   - List blocking issues that must be addressed prior to model training.
   - Provide ordered recommended steps.`
    })

    return NextResponse.json(object)

  } catch (error: unknown) {
    console.error('Insights generation error:', error)
    if (error instanceof Error) {
      if (error.message?.includes('AI provider not configured') || error.message?.includes('AI provider is not configured') || error.message?.includes('API key is not configured') || error.message?.includes('API key not valid')) {
        return NextResponse.json(
          { error: 'AI provider not configured. Please add an API key in Settings.' },
          { status: 503 }
        )
      }
      if (error.message?.includes('fetch failed') || error.message?.includes('network') || error.message?.includes('503') || error.message?.includes('429')) {
        return NextResponse.json(
          { error: 'AI insights are temporarily unavailable. Please try again.' },
          { status: 503 }
        )
      }
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate AI insights.' },
      { status: 500 }
    )
  }
}
