import { createClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai/provider'
import { classifyAIError, executeWithSafeRetry } from '@/lib/ai/errors'
import { generateText, generateObject } from 'ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createNotification } from '@/lib/notifications'

export const maxDuration = 45

// In-flight concurrency deduplication map: key = `${userId}:${datasetId}:${currentVersion}`
const inFlightInsights = new Map<string, Promise<Record<string, unknown>>>()

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

function extractAndParseJSON(rawText: string): Record<string, unknown> {
  let text = rawText.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  }
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    const sanitized = text.replace(/,\s*([}\]])/g, '$1')
    parsed = JSON.parse(sanitized)
  }

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      // keep as string
    }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('AI output was not a valid JSON object.')
  }

  return parsed as Record<string, unknown>
}

function normalizeAIInsights(
  raw: Record<string, unknown>,
  dataset: Record<string, unknown>,
  analysisData: { overallScore: number; components?: Record<string, number> }
): z.infer<typeof insightsSchema> {
  const summaryRaw = (raw.summary || raw.dataset_summary || {}) as Record<string, unknown>
  const scoreBreakdownRaw = (raw.score_breakdown || raw.scoreBreakdown || {}) as Record<string, unknown>
  const mlReadinessRaw = (raw.ml_readiness || raw.mlReadiness || {}) as Record<string, unknown>

  const datasetOverview = (summaryRaw.dataset_overview 
    || summaryRaw.datasetOverview 
    || summaryRaw.overview 
    || `Dataset contains ${dataset.row_count || 0} rows and ${dataset.column_count || 0} columns.`) as string

  const qualityOverview = (summaryRaw.quality_overview 
    || summaryRaw.qualityOverview 
    || 'Overall dataset quality evaluated based on completeness, uniqueness, and consistency.') as string

  const mlReadinessOverview = (summaryRaw.ml_readiness_overview 
    || summaryRaw.mlReadinessOverview 
    || `ML Readiness score calculated at ${analysisData.overallScore || 80}/100.`) as string

  const strengths = Array.isArray(summaryRaw.strengths) && summaryRaw.strengths.length > 0
    ? summaryRaw.strengths.map(String)
    : ['High structural consistency', 'Standardized tabular schema']

  const weaknesses = Array.isArray(summaryRaw.weaknesses) && summaryRaw.weaknesses.length > 0
    ? summaryRaw.weaknesses.map(String)
    : ['Requires outlier handling and feature normalization']

  const scoreComponent = (compName: string, defaultScore = 100) => {
    const c = (scoreBreakdownRaw[compName] || {}) as Record<string, unknown>
    return {
      score: typeof c.score === 'number' ? Math.round(Math.min(100, Math.max(0, c.score))) : defaultScore,
      explanation: typeof c.explanation === 'string' && c.explanation.length > 0
        ? c.explanation
        : `${compName} evaluated based on verified dataset statistics.`
    }
  }

  const scoreBreakdown = {
    completeness: scoreComponent('completeness', analysisData.components?.completeness ?? 100),
    consistency: scoreComponent('consistency', analysisData.components?.consistency ?? 100),
    validity: scoreComponent('validity', analysisData.components?.validity ?? 100),
    uniqueness: scoreComponent('uniqueness', analysisData.components?.uniqueness ?? 100),
    feature_quality: scoreComponent('feature_quality', analysisData.components?.featureQuality ?? 100)
  }

  const rawFindings = (raw.key_findings || raw.keyFindings || raw.findings || []) as Array<Record<string, unknown>>
  const keyFindings = Array.isArray(rawFindings) && rawFindings.length > 0
    ? rawFindings.map((f, idx) => ({
        title: String(f.title || f.category || f.heading || `Finding ${idx + 1}`),
        explanation: String(f.explanation || f.description || f.finding || 'Observation derived from dataset statistics.'),
        severity: (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(String(f.severity || '').toUpperCase())
          ? String(f.severity).toUpperCase()
          : 'MEDIUM') as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
      }))
    : [{
        title: 'Initial Quality Profile',
        explanation: `Analyzed ${dataset.row_count || 0} rows across ${dataset.column_count || 0} columns with calculated ML readiness of ${analysisData.overallScore || 0}/100.`,
        severity: 'LOW' as const
      }]

  const rawAnomalies = (raw.anomalies || raw.potential_anomalies || raw.potentialAnomalies || []) as Array<Record<string, unknown>>
  const anomalies = Array.isArray(rawAnomalies)
    ? rawAnomalies.map((a) => ({
        column: String(a.column || a.targetColumn || 'Dataset-level'),
        description: String(a.description || a.anomalyType || a.anomaly_type || 'Statistical anomaly detected in feature distribution'),
        severity: (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(String(a.severity || '').toUpperCase())
          ? String(a.severity).toUpperCase()
          : 'MEDIUM') as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
        why_it_matters: String(a.why_it_matters || a.whyItMatters || a.impact || 'May affect statistical inference or model performance.'),
        suggested_action: String(a.suggested_action || a.suggestedAction || a.action || 'Apply capping or imputation transformations.')
      }))
    : []

  const rawRecs = (raw.recommendations || raw.smart_recommendations || []) as Array<Record<string, unknown>>
  const validActions = ['drop_duplicates', 'drop_missing', 'fill_missing', 'drop_column', 'rename_column', 'handle_outliers', 'convert_type', 'none'] as const
  type ValidAction = typeof validActions[number]

  const validMethods = ['mean', 'median', 'mode', 'custom', 'remove', 'cap', 'drop_row'] as const
  type ValidMethod = typeof validMethods[number]

  const recommendations = Array.isArray(rawRecs) && rawRecs.length > 0
    ? rawRecs.map((r, idx) => {
        const trans = (r.transformation_suggestion || r.transformationSuggestion || {}) as Record<string, unknown>
        const params = (trans.parameters || {}) as Record<string, unknown>
        const actionType = String(trans.action || trans.actionType || trans.operation || 'none')
        const normalizedAction: ValidAction = (validActions as readonly string[]).includes(actionType) ? (actionType as ValidAction) : 'none'

        const rawMethod = String(trans.method || params.method || 'cap')
        const normalizedMethod: ValidMethod | undefined = (validMethods as readonly string[]).includes(rawMethod) ? (rawMethod as ValidMethod) : undefined

        const rawCols = trans.columns || params.columns
        const normalizedCols = Array.isArray(rawCols) ? rawCols.map(String) : undefined

        return {
          title: String(r.title || r.action || `Recommendation ${idx + 1}`),
          priority: (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(String(r.priority || '').toUpperCase())
            ? String(r.priority).toUpperCase()
            : 'MEDIUM') as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
          problem: String(r.problem || r.issue || r.reason || 'Data distribution requires adjustment for optimal ML performance.'),
          action: String(r.action || r.title || 'Apply recommended preprocessing.'),
          reason: String(r.reason || r.problem || 'Improves machine learning readiness score and model convergence.'),
          transformation_suggestion: {
            action: normalizedAction,
            column: (trans.column || params.column || r.targetColumn) ? String(trans.column || params.column || r.targetColumn) : undefined,
            columns: normalizedCols,
            method: normalizedMethod,
            customValue: (trans.customValue || params.customValue) as string | number | boolean | undefined,
            newName: (trans.newName || params.newName) ? String(trans.newName || params.newName) : undefined,
            targetType: (trans.targetType || params.targetType) as 'string' | 'integer' | 'float' | 'boolean' | 'date' | undefined,
            is_supported: Boolean(trans.is_supported ?? trans.isSupported ?? (normalizedAction !== 'none')),
            button_label: (trans.button_label || params.button_label) ? String(trans.button_label || params.button_label) : 'Apply'
          }
        }
      })
    : [{
        title: 'Maintain Current Quality',
        priority: 'LOW' as const,
        problem: 'No critical data quality issues detected.',
        action: 'Proceed with feature engineering.',
        reason: 'Dataset demonstrates adequate readiness.',
        transformation_suggestion: {
          action: 'none' as const,
          is_supported: false
        }
      }]

  const assessment = String(
    mlReadinessRaw.assessment
    || mlReadinessRaw.overview
    || mlReadinessRaw.summary
    || `Dataset scored ${mlReadinessRaw.overall_score || mlReadinessRaw.overallScore || analysisData.overallScore || 80}/100 for machine learning readiness.`
  )

  const rawPositiveDrivers = (mlReadinessRaw.positive_drivers || mlReadinessRaw.positiveDrivers) as unknown
  const positiveDriversList = Array.isArray(rawPositiveDrivers) ? rawPositiveDrivers.map(String) : []
  const scoreDriver = String(
    mlReadinessRaw.score_driver
    || mlReadinessRaw.scoreDriver
    || (positiveDriversList.length > 0
        ? positiveDriversList.join('. ')
        : 'Scores determined by completeness, consistency, validity, and uniqueness metrics.')
  )

  const rawBlocking = (mlReadinessRaw.blocking_issues || mlReadinessRaw.blockingIssues) as unknown
  const blockingIssues = Array.isArray(rawBlocking) ? rawBlocking.map(String) : []

  const rawRecommended = (mlReadinessRaw.recommended_actions || mlReadinessRaw.recommendedNextSteps || mlReadinessRaw.recommended_steps) as unknown
  const recommendedActions = Array.isArray(rawRecommended)
    ? rawRecommended.map(String)
    : ['Address identified outliers', 'Normalize numeric features', 'Encode categorical variables']

  return {
    summary: {
      dataset_overview: datasetOverview,
      quality_overview: qualityOverview,
      ml_readiness_overview: mlReadinessOverview,
      strengths,
      weaknesses
    },
    score_breakdown: scoreBreakdown,
    key_findings: keyFindings,
    anomalies: anomalies,
    recommendations: recommendations,
    ml_readiness: {
      assessment,
      score_driver: scoreDriver,
      blocking_issues: blockingIssues,
      recommended_actions: recommendedActions
    }
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  try {
    const supabase = await createClient(request)
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

    // Handle distinct non-ready dataset states
    if (dataset.status === 'processing') {
      return NextResponse.json(
        {
          error: 'Dataset analysis is currently in progress. Please wait a moment while processing finishes.',
          code: 'ANALYSIS_PENDING',
          status: 'processing',
          retryable: true,
        },
        { status: 409 }
      )
    }

    if (dataset.status === 'uploading') {
      return NextResponse.json(
        {
          error: 'Dataset is currently uploading. Please wait for upload to complete.',
          code: 'DATASET_UPLOADING',
          status: 'uploading',
          retryable: true,
        },
        { status: 409 }
      )
    }

    if (dataset.status === 'failed') {
      return NextResponse.json(
        {
          error: dataset.processing_error || 'Dataset analysis failed. Please run or retry dataset analysis.',
          code: 'ANALYSIS_FAILED',
          status: 'failed',
          canRunAnalysis: true,
          retryable: false,
        },
        { status: 422 }
      )
    }

    const currentVersion = dataset.current_version ?? 0

    // Parse refresh query parameter
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true' || searchParams.get('force') === 'true'

    // 2. Cache Check: Return cached AI insights for this exact version if available and not explicitly refreshing
    if (!forceRefresh) {
      const { data: cachedInsights } = await supabase
        .from('analyses')
        .select('results, created_at')
        .eq('dataset_id', id)
        .eq('user_id', user.id)
        .eq('analysis_type', 'ai_insights')
        .eq('dataset_version', currentVersion)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cachedInsights?.results && typeof cachedInsights.results === 'object') {
        return NextResponse.json(cachedInsights.results, {
          headers: {
            'X-Insights-Cache': 'HIT',
            'X-Insights-Version': String(currentVersion),
          }
        })
      }
    }

    // 3. In-flight concurrency deduplication: prevent duplicate concurrent Gemini calls for the same dataset version
    const inFlightKey = `${user.id}:${id}:${currentVersion}`
    if (!forceRefresh && inFlightInsights.has(inFlightKey)) {
      try {
        const deduplicatedResult = await inFlightInsights.get(inFlightKey)!
        return NextResponse.json(deduplicatedResult, {
          headers: {
            'X-Insights-Cache': 'DEDUPLICATED',
            'X-Insights-Version': String(currentVersion),
          }
        })
      } catch (inFlightErr) {
        // If in-flight failed, proceed to initiate fresh call
        console.warn('In-flight insights promise failed, retrying independently:', inFlightErr)
      }
    }

    // 4. Fetch analysis records for this dataset and authenticated user
    const { data: analysesRecords, error: analysesError } = await supabase
      .from('analyses')
      .select('id, analysis_type, dataset_version, ml_readiness_score, results, recommendations, created_at')
      .eq('dataset_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (analysesError) {
      return NextResponse.json(
        {
          error: `Database error retrieving dataset analysis: ${analysesError.message}`,
          code: 'DATABASE_ERROR',
          retryable: true,
        },
        { status: 500 }
      )
    }

    const records = analysesRecords || []

    // If completely empty or no records exist
    if (records.length === 0) {
      return NextResponse.json(
        {
          error: 'AI insights require a completed dataset analysis. Click "Run Dataset Analysis" below to start analysis.',
          code: 'ANALYSIS_MISSING',
          canRunAnalysis: true,
          retryable: false,
        },
        { status: 400 }
      )
    }

    // Filter by version (or version 0 / null when currentVersion is 0)
    const matchesVersion = (v: number | null | undefined) => {
      if (v === currentVersion) return true
      if (currentVersion === 0 && (v === null || v === undefined || v === 0)) return true
      return false
    }

    const versionedFull = records.find(r => r.analysis_type === 'full_analysis' && matchesVersion(r.dataset_version))
    const fallbackFull = records.find(r => r.analysis_type === 'full_analysis')
    const genericFull = records.find(r => r.results && typeof r.results === 'object' && (r.results.missingValues || r.results.stats || r.results.types))
    const fullAnalysis = versionedFull || fallbackFull || genericFull || null

    const versionedML = records.find(r => r.analysis_type === 'ml_readiness' && matchesVersion(r.dataset_version))
    const fallbackML = records.find(r => r.analysis_type === 'ml_readiness')
    const genericML = records.find(r => r.results && typeof r.results === 'object' && (r.results.components || r.results.overallScore !== undefined))
    const mlReadinessAnalysis = versionedML || fallbackML || genericML || null

    // Confirm that at least one usable analysis record exists with valid result data
    const usableRecord = fullAnalysis || mlReadinessAnalysis || records.find(r => r.results && typeof r.results === 'object' && Object.keys(r.results).length > 0)

    if (!usableRecord || !usableRecord.results || typeof usableRecord.results !== 'object') {
      return NextResponse.json(
        {
          error: 'AI insights require a completed dataset analysis. The analysis record is empty or malformed. Please rerun dataset analysis.',
          code: 'ANALYSIS_INCOMPLETE',
          canRunAnalysis: true,
          retryable: false,
        },
        { status: 400 }
      )
    }

    // Fetch transformation history if applicable
    const { data: transformations } = await supabase
      .from('dataset_transformations')
      .select('transformation_type, affected_rows, affected_columns, new_version, created_at')
      .eq('dataset_id', id)
      .eq('user_id', user.id)
      .order('new_version', { ascending: true })

    // Resolve AI model prioritizing user's configured key (AFTER confirming usable analysis exists)
    let model
    try {
      model = await getAIProvider(user.id, supabase)
    } catch (providerError: unknown) {
      const classified = classifyAIError(providerError)
      return NextResponse.json(
        {
          error: classified.friendlyMessage,
          code: classified.code,
          isDailyQuota: classified.isDailyQuota,
          retryable: classified.retryable,
          retryAfterSeconds: classified.retryAfterSeconds,
          configureKeyUrl: classified.configureKeyUrl,
        },
        { status: classified.status }
      )
    }

    // 5. Prepare structured, token-efficient analysis data for Gemini
    // Combine full_analysis, ml_readiness, and dataset record
    const baseResults = (fullAnalysis?.results && typeof fullAnalysis.results === 'object' ? fullAnalysis.results : {}) as Record<string, unknown>
    const mlResults = (mlReadinessAnalysis?.results && typeof mlReadinessAnalysis.results === 'object' ? mlReadinessAnalysis.results : {}) as Record<string, unknown>

    const combinedMLReadiness = (baseResults.mlReadiness && typeof baseResults.mlReadiness === 'object' ? baseResults.mlReadiness : mlResults) as Record<string, unknown>
    const results = {
      ...mlResults,
      ...baseResults,
      mlReadiness: combinedMLReadiness,
    } as Record<string, unknown>

    const mlComponents = (mlResults.components || combinedMLReadiness.components || baseResults.components || {
      completeness: 100,
      consistency: 100,
      validity: 100,
      uniqueness: 100,
      featureQuality: 100
    }) as Record<string, number>

    const overallScore = fullAnalysis?.ml_readiness_score 
      ?? mlReadinessAnalysis?.ml_readiness_score 
      ?? (typeof combinedMLReadiness.overallScore === 'number' ? combinedMLReadiness.overallScore : (typeof mlResults.overallScore === 'number' ? mlResults.overallScore : 0))

    // Missing values breakdown
    const missingValuesObj = (results.missingValues || {}) as Record<string, unknown>
    const missingValuesSummary = Object.entries(missingValuesObj)
      .filter(([, val]) => val && typeof val === 'object' && (val as { missingCount?: number }).missingCount! > 0)
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
    const outliersObj = (results.outliers || {}) as Record<string, unknown>
    const outliersSummary = Object.entries(outliersObj)
      .filter(([, val]) => val && typeof val === 'object' && (val as { outlierCount?: number }).outlierCount! > 0)
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
    const columnTypes = (results.types || {}) as Record<string, unknown>
    const typeDistribution: Record<string, number> = {}
    Object.values(columnTypes).forEach(t => {
      const typeStr = String(t)
      typeDistribution[typeStr] = (typeDistribution[typeStr] || 0) + 1
    })

    // Column metadata with stats
    const statsObj = (results.stats || {}) as Record<string, Record<string, number>>
    const columnProfiles = (dataset.column_metadata || []).map((col: { name: string; type?: string }) => {
      const colName = col.name
      const type = (columnTypes[colName] as string) || col.type || 'unknown'
      const stat = statsObj[colName]
      const mv = missingValuesObj[colName] as { missingPercentage?: number } | undefined
      const out = outliersObj[colName] as { outlierCount?: number } | undefined

      return {
        name: colName,
        type,
        missingPercentage: mv && typeof mv.missingPercentage === 'number' ? Number(mv.missingPercentage.toFixed(1)) : 0,
        outliersCount: out && typeof out.outlierCount === 'number' ? out.outlierCount : 0,
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
        duplicateRowCount: ((results.duplicates as { duplicateCount?: number } | undefined)?.duplicateCount) || 0,
        duplicatePercentage: Number((((results.duplicates as { duplicatePercentage?: number } | undefined)?.duplicatePercentage) || 0).toFixed(1)),
        uniqueRowCount: ((results.duplicates as { uniqueRows?: number } | undefined)?.uniqueRows) || dataset.row_count || 0
      },
      missingValues: missingValuesSummary,
      outliers: outliersSummary,
      columns: columnProfiles,
      ruleBasedRecommendations: (fullAnalysis?.recommendations || results.recommendations || []) as unknown[],
      transformationHistory: transformations && transformations.length > 0 ? transformations : 'No transformations applied yet (Version 0 raw upload).'
    }

    // 5. Generate structured insights with Gemini using executeWithSafeRetry and maxRetries: 0
    const executeGeneration = async (): Promise<Record<string, unknown>> => {
      const startTime = Date.now()
      const { text } = await executeWithSafeRetry(
        async () => {
          return await generateText({
            model,
            maxRetries: 0, // CRITICAL: Stop AI SDK from blindly retrying quota errors 3 times
            prompt: `You are a professional data quality and machine learning readiness analyst for the DataReady AI platform.

Analyze the structured dataset statistics provided below and generate high-value, precise, actionable dataset insights.

==================================================
STRUCTURED DATASET ANALYSIS DATA
==================================================
${JSON.stringify(structuredPromptData, null, 2)}

==================================================
RESPONSE FORMAT (STRICT JSON OBJECT)
==================================================
Respond strictly with a valid JSON object matching the following structure:
{
  "summary": {
    "dataset_overview": "Concise description of dataset contents, rows (${structuredPromptData.datasetMetadata.rowCount}), columns (${structuredPromptData.datasetMetadata.columnCount}), and primary column types.",
    "quality_overview": "Assessment of data cleanliness based on completeness, uniqueness, consistency, and validity.",
    "ml_readiness_overview": "Evaluation of whether this dataset is ready for ML model training.",
    "strengths": ["2-4 major concrete dataset strengths"],
    "weaknesses": ["2-4 major concrete dataset weaknesses"]
  },
  "score_breakdown": {
    "completeness": { "score": ${mlComponents.completeness}, "explanation": "1-2 sentence explanation of completeness referring to actual missing values and percentages." },
    "consistency": { "score": ${mlComponents.consistency}, "explanation": "1-2 sentence explanation of data type consistency." },
    "validity": { "score": ${mlComponents.validity}, "explanation": "1-2 sentence explanation of validity and statistical outlier distribution." },
    "uniqueness": { "score": ${mlComponents.uniqueness}, "explanation": "1-2 sentence explanation of duplicate rows or unique record distribution." },
    "feature_quality": { "score": ${mlComponents.featureQuality}, "explanation": "1-2 sentence explanation of feature utility for ML." }
  },
  "key_findings": [
    {
      "title": "Finding headline",
      "explanation": "Detailed observation grounded in provided statistics.",
      "severity": "CRITICAL"
    }
  ],
  "anomalies": [
    {
      "column": "Column name or 'Dataset-level'",
      "description": "Specific anomaly description.",
      "severity": "HIGH",
      "why_it_matters": "Why this affects analysis or ML.",
      "suggested_action": "Actionable step to resolve."
    }
  ],
  "recommendations": [
    {
      "title": "Recommendation title",
      "priority": "HIGH",
      "problem": "Underlying data issue being addressed.",
      "action": "Recommended action to take.",
      "reason": "Why this action should be taken.",
      "transformation_suggestion": {
        "action": "handle_outliers",
        "column": "column_name",
        "method": "cap",
        "is_supported": true,
        "button_label": "Handle Outliers"
      }
    }
  ],
  "ml_readiness": {
    "assessment": "Detailed explanation of why the dataset scored ${overallScore}/100.",
    "score_driver": "Key factors driving the score higher or lower.",
    "blocking_issues": ["Specific issues that must or should be addressed before model training."],
    "recommended_actions": ["Ordered steps to prepare this dataset for ML."]
  }
}

==================================================
CRITICAL ANALYSIS RULES
==================================================
1. STRICT ACCURACY: Use ONLY the numbers and facts provided in the analysis statistics above. NEVER hallucinate or invent dataset statistics, rows, column names, or percentages.
2. Return ONLY the raw JSON object. Do NOT wrap in markdown fences or preface with introductory text.`
          })
        },
        {
          maxTransientRetries: 1, // Only 1 bounded retry for transient rate limits or 503
          baseDelayMs: 1500,
          maxDelayMs: 4000,
        }
      )

      const duration = Date.now() - startTime

      // Extract and robustly normalize JSON
      const parsedRaw = extractAndParseJSON(text)
      const object = normalizeAIInsights(parsedRaw, dataset, { overallScore, components: mlComponents })

      // Cache successful insights in analyses table
      try {
        await supabase.from('analyses').insert({
          dataset_id: id,
          user_id: user.id,
          analysis_type: 'ai_insights',
          dataset_version: currentVersion,
          results: object,
          processing_duration_ms: duration,
        })

        // Dispatch in-app notification
        await createNotification({
          userId: user.id,
          title: 'AI Insights Ready',
          message: `Generated automated AI Insights for dataset "${dataset.name}" (Version ${currentVersion}).`,
          type: 'info',
        }).catch(() => {})
      } catch (cacheErr) {
        console.warn('Failed to cache AI insights in analyses table:', cacheErr)
      }

      return object as Record<string, unknown>
    }

    let generatedResult: Record<string, unknown>
    const generationPromise = executeGeneration()
    inFlightInsights.set(inFlightKey, generationPromise)

    try {
      generatedResult = await generationPromise
    } finally {
      inFlightInsights.delete(inFlightKey)
    }

    return NextResponse.json(generatedResult, {
      headers: {
        'X-Insights-Cache': 'MISS',
        'X-Insights-Version': String(currentVersion),
      }
    })

  } catch (error: unknown) {
    console.error('Insights generation error:', error)
    const classified = classifyAIError(error)
    return NextResponse.json(
      {
        error: classified.friendlyMessage,
        code: classified.code,
        isDailyQuota: classified.isDailyQuota,
        retryable: classified.retryable,
        retryAfterSeconds: classified.retryAfterSeconds,
        configureKeyUrl: classified.configureKeyUrl,
      },
      { status: classified.status }
    )
  }
}
