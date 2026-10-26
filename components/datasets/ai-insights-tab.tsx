'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Sparkles, 
  Loader2, 
  Bot, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Wand2, 
  RefreshCw, 
  Activity, 
  Check, 
  Layers, 
  Info,
  TrendingUp,
  BrainCircuit,
  FileSpreadsheet
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AIInsightsResponse, AISmartRecommendation, SeverityLevel, PriorityLevel } from '@/types/insights'
import { DatasetTransformation, FillMissingMethod } from '@/types/transformations'

interface AIInsightsTabProps {
  datasetId: string
  analysis: Record<string, unknown> | null
  dataset: Record<string, unknown>
}

export function AIInsightsTab({ datasetId, analysis, dataset }: AIInsightsTabProps) {
  const [insights, setInsights] = useState<AIInsightsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null)
  const [transformationSuccess, setTransformationSuccess] = useState<string | null>(null)
  const router = useRouter()

  const refreshInsights = async (showLoadingOverlay = false) => {
    if (showLoadingOverlay) {
      setLoading(true)
    } else {
      setIsRefreshing(true)
    }
    setError(null)
    setTransformationSuccess(null)

    try {
      const res = await fetch(`/api/datasets/${datasetId}/insights`, {
        cache: 'no-store'
      })

      if (!res.ok) {
        let errMsg = `Failed to generate AI insights (${res.status})`
        try {
          const errData = await res.json()
          if (errData.error) errMsg = errData.error
        } catch {
          // JSON parse failed, use fallback
        }
        throw new Error(errMsg)
      }

      const data: AIInsightsResponse = await res.json()
      setInsights(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while fetching AI insights.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    let ignore = false

    async function loadInitialInsights() {
      try {
        setError(null)
        setTransformationSuccess(null)
        const res = await fetch(`/api/datasets/${datasetId}/insights`, {
          cache: 'no-store'
        })

        if (!res.ok) {
          let errMsg = `Failed to generate AI insights (${res.status})`
          try {
            const errData = await res.json()
            if (errData.error) errMsg = errData.error
          } catch {
            // fallback
          }
          throw new Error(errMsg)
        }

        const data: AIInsightsResponse = await res.json()
        if (!ignore) {
          setInsights(data)
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'An unexpected error occurred while fetching AI insights.')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadInitialInsights()

    return () => {
      ignore = true
    }
  }, [datasetId])

  // Execute a recommended transformation via the backend bridge
  const handleApplyTransformation = async (rec: AISmartRecommendation, index: number) => {
    const suggestion = rec.transformation_suggestion
    if (!suggestion || !suggestion.is_supported || suggestion.action === 'none') {
      return
    }

    try {
      setApplyingIndex(index)
      setError(null)
      setTransformationSuccess(null)

      let transformPayload: DatasetTransformation | null = null

      if (suggestion.action === 'drop_duplicates') {
        transformPayload = {
          action: 'drop_duplicates',
          columns: suggestion.columns && suggestion.columns.length > 0 ? suggestion.columns : 'all'
        }
      } else if (suggestion.action === 'drop_missing') {
        transformPayload = {
          action: 'drop_missing',
          columns: suggestion.columns && suggestion.columns.length > 0 ? suggestion.columns : (suggestion.column ? [suggestion.column] : 'all')
        }
      } else if (suggestion.action === 'fill_missing' && suggestion.column) {
        const validMethods: FillMissingMethod[] = ['mean', 'median', 'mode', 'custom', 'drop_row']
        const method: FillMissingMethod = suggestion.method && validMethods.includes(suggestion.method as FillMissingMethod)
          ? (suggestion.method as FillMissingMethod)
          : 'mean'

        transformPayload = {
          action: 'fill_missing',
          column: suggestion.column,
          method,
          customValue: suggestion.customValue
        }
      } else if (suggestion.action === 'handle_outliers' && suggestion.column) {
        transformPayload = {
          action: 'handle_outliers',
          column: suggestion.column,
          method: (suggestion.method === 'cap' ? 'cap' : 'remove')
        }
      } else if (suggestion.action === 'drop_column') {
        const cols = suggestion.columns && suggestion.columns.length > 0 ? suggestion.columns : (suggestion.column ? [suggestion.column] : [])
        if (cols.length > 0) {
          transformPayload = { action: 'drop_column', columns: cols }
        }
      } else if (suggestion.action === 'rename_column' && suggestion.column && suggestion.newName) {
        transformPayload = {
          action: 'rename_column',
          column: suggestion.column,
          newName: suggestion.newName
        }
      } else if (suggestion.action === 'convert_type' && suggestion.column && suggestion.targetType) {
        transformPayload = {
          action: 'convert_type',
          column: suggestion.column,
          targetType: suggestion.targetType
        }
      }

      if (!transformPayload) {
        throw new Error('Unable to construct transformation payload from this recommendation.')
      }

      const res = await fetch(`/api/datasets/${datasetId}/transform`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transformations: [transformPayload]
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute transformation.')
      }

      setTransformationSuccess(`Transformation applied! Created Version ${data.newVersion} (${data.affectedRows} rows, ${data.affectedColumns} columns modified).`)
      
      // Refresh page data and re-fetch AI insights
      router.refresh()
      await refreshInsights(false)

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transformation failed.')
    } finally {
      setApplyingIndex(null)
    }
  }

  // Visual helper for severity
  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'CRITICAL':
        return <Badge variant="destructive" className="font-semibold uppercase text-xs">Critical</Badge>
      case 'HIGH':
        return <Badge className="bg-orange-600 hover:bg-orange-700 text-white font-semibold uppercase text-xs">High</Badge>
      case 'MEDIUM':
        return <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold uppercase text-xs">Medium</Badge>
      case 'LOW':
      default:
        return <Badge variant="secondary" className="font-semibold uppercase text-xs">Low</Badge>
    }
  }

  // Visual helper for priority
  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'CRITICAL':
        return <Badge variant="destructive" className="font-semibold uppercase text-xs">Critical Priority</Badge>
      case 'HIGH':
        return <Badge className="bg-orange-600 hover:bg-orange-700 text-white font-semibold uppercase text-xs">High Priority</Badge>
      case 'MEDIUM':
        return <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold uppercase text-xs">Medium Priority</Badge>
      case 'LOW':
      default:
        return <Badge variant="secondary" className="font-semibold uppercase text-xs">Low Priority</Badge>
    }
  }

  // Visual helper for score category
  const getScoreCategoryBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Excellent</Badge>
    if (score >= 70) return <Badge className="bg-green-600 hover:bg-green-700 text-white">Good</Badge>
    if (score >= 50) return <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white">Fair</Badge>
    if (score >= 30) return <Badge className="bg-orange-600 hover:bg-orange-700 text-white">Needs Improvement</Badge>
    return <Badge variant="destructive">Poor</Badge>
  }

  const mlScore = (analysis?.ml_readiness_score as number) ?? 0

  return (
    <div className="space-y-8">
      {/* Action / Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">AI-Powered Insights</h2>
              <Badge variant="outline" className="text-xs">
                v{Number(dataset.current_version || 0)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Automated data quality analysis, ML readiness evaluation, and smart recommendations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshInsights(false)}
            disabled={loading || isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Regenerating...' : 'Regenerate Insights'}
          </Button>
        </div>
      </div>

      {/* Success Banner */}
      {transformationSuccess && (
        <Alert className="border-emerald-500 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <AlertTitle className="font-semibold">Success</AlertTitle>
          <AlertDescription>{transformationSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Error Banner with Retry */}
      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/30">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-semibold">AI Insights Unavailable</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshInsights(true)}
              className="border-red-300 text-red-900 hover:bg-red-100 dark:text-red-200 dark:hover:bg-red-900/50 flex-shrink-0"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-6">
          <Card className="border-dashed border-2">
            <CardContent className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center animate-pulse">
                  <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <Loader2 className="h-6 w-6 text-purple-600 animate-spin absolute -top-1 -right-1" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Analyzing your dataset...</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-1">
                  Synthesizing statistical profiles, data quality metrics, ML readiness, and detecting anomalies...
                </p>
              </div>
              <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-purple-600 animate-[pulse_1.5s_infinite] w-3/4 rounded-full"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : insights ? (
        <div className="space-y-8">
          
          {/* ============================================================ */}
          {/* 1. AI DATASET SUMMARY & STRENGTHS/WEAKNESSES */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  AI Dataset Summary
                </CardTitle>
                <CardDescription>
                  Grounded executive summary of dataset characteristics and data health.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/40 border space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileSpreadsheet className="h-4 w-4 text-blue-500" /> Dataset Overview
                    </h4>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {Number(dataset.row_count || 0).toLocaleString()} rows
                      </Badge>
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {Number(dataset.column_count || 0)} columns
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">
                    {insights.summary.dataset_overview || insights.summary.overview}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-emerald-500" /> Quality Overview
                    </h4>
                    <p className="text-sm leading-relaxed text-foreground">
                      {insights.summary.quality_overview}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-purple-500" /> ML Readiness Overview
                    </h4>
                    <p className="text-sm leading-relaxed text-foreground">
                      {insights.summary.ml_readiness_overview}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Strengths & Weaknesses */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-500" /> Strengths &amp; Weaknesses
                </CardTitle>
                <CardDescription>Key architectural takeaways.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-2">
                    <Check className="h-3.5 w-3.5" /> Strengths
                  </span>
                  <ul className="space-y-1.5">
                    {insights.summary.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-2">
                    <AlertTriangle className="h-3.5 w-3.5" /> Weaknesses &amp; Risks
                  </span>
                  <ul className="space-y-1.5">
                    {insights.summary.weaknesses.map((w, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ============================================================ */}
          {/* 2. ML READINESS & SCORE BREAKDOWN */}
          {/* ============================================================ */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="h-5 w-5 text-blue-500" />
                    ML Readiness &amp; Quality Breakdown
                  </CardTitle>
                  <CardDescription>
                    Detailed assessment of data fitness for predictive modeling and machine learning.
                  </CardDescription>
                </div>
                {getScoreCategoryBadge(mlScore)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                {/* Score Dial */}
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-muted/40 border min-w-[200px]">
                  <div className="relative flex items-center justify-center w-36 h-36 rounded-full border-8 border-muted">
                    <div 
                      className={`absolute inset-0 rounded-full border-8 ${
                        mlScore >= 80 ? 'border-emerald-500' : mlScore >= 50 ? 'border-yellow-500' : 'border-red-500'
                      }`}
                      style={{
                        clipPath: mlScore === 100 
                          ? 'none' 
                          : `polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${mlScore}% 0%)`
                      }}
                    />
                    <div className="text-center z-10">
                      <span className="text-4xl font-extrabold tracking-tight">{mlScore}</span>
                      <p className="text-xs text-muted-foreground font-semibold uppercase mt-0.5">/ 100</p>
                    </div>
                  </div>
                  <span className="mt-3 text-sm font-semibold">ML Readiness Score</span>
                </div>

                {/* AI Explanation of ML Readiness */}
                <div className="flex-1 space-y-4 w-full">
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold flex items-center gap-1.5">
                      <Info className="h-4 w-4 text-blue-500" /> Assessment &amp; Score Driver
                    </h4>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {insights.ml_readiness.assessment}
                    </p>
                    <p className="text-xs font-medium text-foreground bg-muted/50 p-2.5 rounded-lg border">
                      <span className="font-bold text-blue-600 dark:text-blue-400">Score Driver: </span>
                      {insights.ml_readiness.score_driver}
                    </p>
                  </div>

                  {insights.ml_readiness.blocking_issues.length > 0 && (
                    <div className="space-y-1.5">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                        Blocking Issues for ML
                      </h5>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {insights.ml_readiness.blocking_issues.map((issue, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground bg-red-50/50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-900/50 flex items-start gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* 5 Component Breakdown Bars */}
              <div className="pt-6 border-t space-y-4">
                <h4 className="text-sm font-bold text-foreground">Score Component Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(['completeness', 'consistency', 'validity', 'uniqueness', 'feature_quality'] as const).map(compKey => {
                    const comp = insights.score_breakdown[compKey]
                    if (!comp) return null
                    const score = comp.score
                    const title = compKey.replace(/_/g, ' ')

                    return (
                      <div key={compKey} className="p-3.5 rounded-lg border bg-card/60 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold capitalize">{title}</span>
                          <span className="font-mono font-bold text-xs">{score}/100</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                          {comp.explanation}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ============================================================ */}
          {/* 3. KEY FINDINGS */}
          {/* ============================================================ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Key Findings
              </CardTitle>
              <CardDescription>
                Most critical statistical patterns, inconsistencies, and anomalies discovered.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.key_findings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.key_findings.map((finding, idx) => (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                        finding.severity === 'CRITICAL' 
                          ? 'border-red-300 dark:border-red-900 bg-red-50/40 dark:bg-red-950/20'
                          : finding.severity === 'HIGH'
                          ? 'border-orange-300 dark:border-orange-900 bg-orange-50/40 dark:bg-orange-950/20'
                          : finding.severity === 'MEDIUM'
                          ? 'border-yellow-300 dark:border-yellow-900 bg-yellow-50/40 dark:bg-yellow-950/20'
                          : 'border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm leading-snug text-foreground">
                            {finding.title}
                          </h4>
                          {getSeverityBadge(finding.severity)}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {finding.explanation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600 font-medium py-4">
                  <CheckCircle2 className="h-5 w-5" /> No critical issues discovered in the dataset.
                </div>
              )}
            </CardContent>
          </Card>

          {/* ============================================================ */}
          {/* 4. POTENTIAL ANOMALIES */}
          {/* ============================================================ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                Potential Anomalies
              </CardTitle>
              <CardDescription>
                Suspicious statistical outliers, distribution skews, or severe data inconsistencies.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.anomalies.length > 0 ? (
                <div className="space-y-3">
                  {insights.anomalies.map((anomaly, idx) => (
                    <div key={idx} className="p-4 rounded-xl border bg-card/80 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-xs">
                            {anomaly.column}
                          </Badge>
                          <span className="font-semibold text-sm text-foreground">{anomaly.description}</span>
                        </div>
                        {getSeverityBadge(anomaly.severity)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                        <div className="p-2.5 rounded bg-muted/40 border">
                          <span className="font-bold text-foreground block mb-0.5">Why it matters:</span>
                          <span className="text-muted-foreground leading-relaxed">{anomaly.why_it_matters}</span>
                        </div>
                        <div className="p-2.5 rounded bg-muted/40 border">
                          <span className="font-bold text-foreground block mb-0.5">Suggested action:</span>
                          <span className="text-muted-foreground leading-relaxed">{anomaly.suggested_action}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <p className="text-sm font-medium">
                    No significant anomalies were identified from the available analysis.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ============================================================ */}
          {/* 5. SMART RECOMMENDATIONS & AI -> TRANSFORMATION BRIDGE */}
          {/* ============================================================ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Wand2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Smart Recommendations &amp; Automated Actions
              </CardTitle>
              <CardDescription>
                Prioritized data preparation steps. Supported operations can be executed with 1-click.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.recommendations.length > 0 ? (
                <div className="space-y-4">
                  {insights.recommendations.map((rec, idx) => {
                    const suggestion = rec.transformation_suggestion
                    const isSupported = suggestion?.is_supported && suggestion.action !== 'none'
                    const isApplying = applyingIndex === idx

                    return (
                      <div 
                        key={idx} 
                        className={`p-5 rounded-xl border transition-all ${
                          rec.priority === 'CRITICAL' 
                            ? 'border-red-300 dark:border-red-900/60 bg-red-50/20' 
                            : rec.priority === 'HIGH'
                            ? 'border-orange-300 dark:border-orange-900/60 bg-orange-50/20'
                            : 'border-border bg-card'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-base text-foreground">{rec.title}</h4>
                              {getPriorityBadge(rec.priority)}
                            </div>

                            <p className="text-xs text-muted-foreground">
                              <strong className="text-foreground font-semibold">Problem: </strong>
                              {rec.problem}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              <strong className="text-foreground font-semibold">Reason: </strong>
                              {rec.reason}
                            </p>

                            <div className="p-3 rounded-lg bg-muted/60 border text-xs text-foreground font-medium flex items-start gap-2">
                              <Wand2 className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-bold">Recommended Action: </span>
                                {rec.action}
                              </div>
                            </div>
                          </div>

                          {/* Action Button / Manual Badge */}
                          <div className="flex flex-col items-end justify-center pt-2 md:pt-0">
                            {isSupported ? (
                              <Button
                                size="sm"
                                onClick={() => handleApplyTransformation(rec, idx)}
                                disabled={applyingIndex !== null}
                                className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                              >
                                {isApplying ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Applying Fix...
                                  </>
                                ) : (
                                  <>
                                    <Wand2 className="h-4 w-4" />
                                    {suggestion.button_label || 'Apply Transformation'}
                                  </>
                                )}
                              </Button>
                            ) : (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-muted/40 text-muted-foreground text-xs font-medium">
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                Manual action recommended
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <p className="text-sm font-medium">
                    Your dataset looks great! No immediate data cleaning recommendations.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      ) : null}
    </div>
  )
}
