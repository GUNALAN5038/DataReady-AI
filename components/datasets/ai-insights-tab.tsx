'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
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
  FileSpreadsheet,
  Key,
  Clock
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AIInsightsResponse, AISmartRecommendation, SeverityLevel, PriorityLevel } from '@/types/insights'
import { DatasetTransformation, FillMissingMethod } from '@/types/transformations'
import { cn } from '@/lib/utils'

export interface InsightErrorState {
  message: string
  code?: string
  isDailyQuota?: boolean
  retryable?: boolean
  canRunAnalysis?: boolean
  configureKeyUrl?: string
}

interface AIInsightsTabProps {
  datasetId: string
  analysis: Record<string, unknown> | null
  dataset: Record<string, unknown>
  initialInsights?: AIInsightsResponse | null
}

export function AIInsightsTab({ datasetId, analysis, dataset, initialInsights }: AIInsightsTabProps) {
  const [insights, setInsights] = useState<AIInsightsResponse | null>(initialInsights || null)
  const [loading, setLoading] = useState<boolean>(!initialInsights)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [errorState, setErrorState] = useState<InsightErrorState | null>(null)
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null)
  const [transformationSuccess, setTransformationSuccess] = useState<string | null>(null)
  const [analysisSuccess, setAnalysisSuccess] = useState<string | null>(null)
  const router = useRouter()

  const handleRunAnalysis = async () => {
    try {
      setIsAnalyzing(true)
      setErrorState(null)
      setTransformationSuccess(null)
      setAnalysisSuccess(null)

      const res = await fetch(`/api/datasets/${datasetId}/analyze`, {
        method: 'POST'
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze dataset.')
      }

      setAnalysisSuccess('Dataset analysis completed successfully! Generating AI insights...')
      router.refresh()
      await refreshInsights(true, true)
    } catch (err: unknown) {
      setErrorState({
        message: err instanceof Error ? err.message : 'Dataset analysis failed. Please try again.',
        code: 'ANALYSIS_FAILED',
        canRunAnalysis: true,
        retryable: true,
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const refreshInsights = async (showLoadingOverlay = false, forceRefresh = false) => {
    if (showLoadingOverlay) {
      setLoading(true)
    } else {
      setIsRefreshing(true)
    }
    setErrorState(null)
    setTransformationSuccess(null)

    try {
      const url = `/api/datasets/${datasetId}/insights${forceRefresh ? '?refresh=true' : ''}`
      const res = await fetch(url, {
        cache: 'no-store'
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setErrorState({
          message: data.error || `Failed to generate AI insights (${res.status})`,
          code: data.code,
          isDailyQuota: Boolean(data.isDailyQuota),
          retryable: Boolean(data.retryable),
          canRunAnalysis: Boolean(data.canRunAnalysis),
          configureKeyUrl: data.configureKeyUrl,
        })
        return
      }

      setInsights(data as AIInsightsResponse)
    } catch (err: unknown) {
      setErrorState({
        message: err instanceof Error ? err.message : 'An unexpected error occurred while fetching AI insights.',
        retryable: true,
      })
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    let ignore = false

    // If initialInsights were already supplied for this version, do not refetch
    if (initialInsights) {
      setInsights(initialInsights)
      setLoading(false)
      return
    }

    async function loadInitialInsights() {
      try {
        setErrorState(null)
        setTransformationSuccess(null)
        const res = await fetch(`/api/datasets/${datasetId}/insights`, {
          cache: 'no-store'
        })

        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          if (!ignore) {
            setErrorState({
              message: data.error || `Failed to generate AI insights (${res.status})`,
              code: data.code,
              isDailyQuota: Boolean(data.isDailyQuota),
              retryable: Boolean(data.retryable),
              canRunAnalysis: Boolean(data.canRunAnalysis),
              configureKeyUrl: data.configureKeyUrl,
            })
          }
          return
        }

        if (!ignore) {
          setInsights(data as AIInsightsResponse)
        }
      } catch (err: unknown) {
        if (!ignore) {
          setErrorState({
            message: err instanceof Error ? err.message : 'An unexpected error occurred while fetching AI insights.',
            retryable: true,
          })
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
  }, [datasetId, initialInsights])

  // Execute a recommended transformation via the backend bridge
  const handleApplyTransformation = async (rec: AISmartRecommendation, index: number) => {
    const suggestion = rec.transformation_suggestion
    if (!suggestion || !suggestion.is_supported || suggestion.action === 'none') {
      return
    }

    try {
      setApplyingIndex(index)
      setErrorState(null)
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
      
      // Refresh page data and re-fetch fresh AI insights for new version
      router.refresh()
      await refreshInsights(false, true)

    } catch (err: unknown) {
      setErrorState({
        message: err instanceof Error ? err.message : 'Transformation failed.',
        retryable: true,
      })
    } finally {
      setApplyingIndex(null)
    }
  }

  // Visual helper for severity
  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'CRITICAL':
        return <Badge className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-semibold uppercase text-[10px] tracking-wider shadow-none">Critical</Badge>
      case 'HIGH':
        return <Badge className="bg-orange-500/15 hover:bg-orange-500/25 text-orange-700 dark:text-orange-300 border border-orange-500/30 font-semibold uppercase text-[10px] tracking-wider shadow-none">High</Badge>
      case 'MEDIUM':
        return <Badge className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold uppercase text-[10px] tracking-wider shadow-none">Medium</Badge>
      case 'LOW':
      default:
        return <Badge variant="secondary" className="font-semibold uppercase text-[10px] tracking-wider text-muted-foreground">Low</Badge>
    }
  }

  // Visual helper for priority
  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'CRITICAL':
        return <Badge className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-semibold uppercase text-[10px] tracking-wider shadow-none">Critical Priority</Badge>
      case 'HIGH':
        return <Badge className="bg-orange-500/15 hover:bg-orange-500/25 text-orange-700 dark:text-orange-300 border border-orange-500/30 font-semibold uppercase text-[10px] tracking-wider shadow-none">High Priority</Badge>
      case 'MEDIUM':
        return <Badge className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold uppercase text-[10px] tracking-wider shadow-none">Medium Priority</Badge>
      case 'LOW':
      default:
        return <Badge variant="secondary" className="font-semibold uppercase text-[10px] tracking-wider text-muted-foreground">Low Priority</Badge>
    }
  }

  // Visual helper for score category
  const getScoreCategoryBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-medium shadow-none">Excellent</Badge>
    if (score >= 70) return <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 font-medium shadow-none">Good</Badge>
    if (score >= 50) return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-medium shadow-none">Fair</Badge>
    if (score >= 30) return <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30 font-medium shadow-none">Needs Improvement</Badge>
    return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-medium shadow-none">Poor</Badge>
  }

  const mlScore = (analysis?.ml_readiness_score as number) ?? 0

  return (
    <div className="space-y-8">
      {/* Action / Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-violet-50/40 dark:from-indigo-950/20 dark:via-zinc-900 dark:to-violet-950/20 backdrop-blur-xs shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs shadow-indigo-500/25 flex-shrink-0">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-foreground">AI-Powered Insights</h2>
              <Badge variant="outline" className="text-xs font-mono border-border/80 bg-background/60">
                v{Number(dataset.current_version || 0)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Automated data quality analysis, ML readiness evaluation, and smart recommendations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshInsights(false, true)}
            disabled={loading || isRefreshing}
            className="flex items-center gap-2 rounded-xl border-border/80 hover:bg-background/80 text-xs font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            {isRefreshing ? 'Regenerating...' : 'Regenerate Insights'}
          </Button>
        </div>
      </div>

      {/* Success Banner */}
      {transformationSuccess && (
        <Alert className="border-emerald-500/40 text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle className="font-semibold text-sm">Success</AlertTitle>
          <AlertDescription className="text-xs">{transformationSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Analysis Success Banner */}
      {analysisSuccess && (
        <Alert className="border-emerald-500/40 text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle className="font-semibold text-sm">Analysis Ready</AlertTitle>
          <AlertDescription className="text-xs">{analysisSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Error Banner with Smart Actions */}
      {errorState && (
        <Alert
          variant="destructive"
          className={cn(
            "rounded-2xl border transition-all p-5 shadow-xs",
            errorState.isDailyQuota
              ? "border-amber-500/50 bg-amber-50/70 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900/60"
              : errorState.code === 'INVALID_API_KEY' || errorState.code === 'PROVIDER_NOT_CONFIGURED' || errorState.code === 'DECRYPTION_FAILED'
              ? "border-indigo-500/50 bg-indigo-50/70 text-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200 dark:border-indigo-900/60"
              : errorState.canRunAnalysis || errorState.code === 'ANALYSIS_MISSING' || errorState.code === 'ANALYSIS_INCOMPLETE' || errorState.code === 'ANALYSIS_PENDING' || errorState.code === 'DATASET_UPLOADING'
              ? "border-blue-500/50 bg-blue-50/70 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-900/60"
              : "border-red-500/50 bg-red-50/70 text-red-900 dark:bg-red-950/30 dark:text-red-200"
          )}
        >
          <div className="flex items-start gap-3.5">
            {errorState.isDailyQuota ? (
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            ) : errorState.code === 'INVALID_API_KEY' || errorState.code === 'PROVIDER_NOT_CONFIGURED' || errorState.code === 'DECRYPTION_FAILED' ? (
              <Key className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
            ) : errorState.code === 'ANALYSIS_PENDING' || errorState.code === 'DATASET_UPLOADING' ? (
              <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 animate-spin shrink-0" />
            ) : errorState.canRunAnalysis || errorState.code === 'ANALYSIS_MISSING' || errorState.code === 'ANALYSIS_INCOMPLETE' ? (
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            )}

            <div className="flex-1 space-y-1.5">
              <AlertTitle className="font-semibold text-sm">
                {errorState.isDailyQuota
                  ? "Gemini API Daily Quota Reached"
                  : errorState.code === 'INVALID_API_KEY'
                  ? "Invalid Gemini API Key"
                  : errorState.code === 'DECRYPTION_FAILED'
                  ? "API Key Decryption Error"
                  : errorState.code === 'PROVIDER_NOT_CONFIGURED'
                  ? "AI Provider Not Configured"
                  : errorState.code === 'ANALYSIS_MISSING' || errorState.code === 'ANALYSIS_INCOMPLETE'
                  ? "Dataset Analysis Required"
                  : errorState.code === 'ANALYSIS_PENDING' || errorState.code === 'DATASET_UPLOADING'
                  ? "Analysis in Progress"
                  : errorState.code === 'ANALYSIS_FAILED'
                  ? "Dataset Analysis Failed"
                  : errorState.code === 'MODEL_UNAVAILABLE'
                  ? "AI Model Unavailable"
                  : errorState.code === 'RATE_LIMITED'
                  ? "Rate Limit Exceeded"
                  : "AI Insights Unavailable"}
              </AlertTitle>

              <AlertDescription className="text-xs leading-relaxed">
                {errorState.message}
              </AlertDescription>

              <div className="pt-2 flex items-center gap-2.5 flex-wrap">
                {/* Recovery button to run dataset analysis */}
                {(errorState.canRunAnalysis || errorState.code === 'ANALYSIS_MISSING' || errorState.code === 'ANALYSIS_FAILED' || errorState.code === 'ANALYSIS_INCOMPLETE') && (
                  <Button
                    onClick={handleRunAnalysis}
                    disabled={isAnalyzing || loading}
                    className="h-8 text-xs font-semibold rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-xs flex items-center gap-1.5"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Analyzing Dataset...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        {errorState.code === 'ANALYSIS_FAILED' ? 'Retry Dataset Analysis' : 'Run Dataset Analysis Now'}
                      </>
                    )}
                  </Button>
                )}

                {/* Check status for pending analysis */}
                {(errorState.code === 'ANALYSIS_PENDING' || errorState.code === 'DATASET_UPLOADING') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshInsights(true, true)}
                    className="h-8 text-xs font-semibold rounded-xl bg-background/80 hover:bg-background border-border/80 shadow-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Check Status
                  </Button>
                )}

                {/* Link to Settings -> AI Keys whenever key, decryption, or quota is the issue */}
                {(errorState.isDailyQuota || errorState.configureKeyUrl || errorState.code === 'INVALID_API_KEY' || errorState.code === 'PROVIDER_NOT_CONFIGURED' || errorState.code === 'DECRYPTION_FAILED') && (
                  <Link
                    href="/settings/keys"
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      "h-8 text-xs font-semibold rounded-xl bg-background/80 hover:bg-background border-border/80 shadow-xs flex items-center gap-1.5"
                    )}
                  >
                    <Key className="h-3.5 w-3.5" />
                    Configure AI Key in Settings
                  </Link>
                )}

                {/* Only provide Retry action when retrying is reasonable (NOT on daily quota or invalid key or missing analysis) */}
                {errorState.retryable && !errorState.isDailyQuota && !errorState.canRunAnalysis && errorState.code !== 'ANALYSIS_MISSING' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshInsights(true, true)}
                    className="h-8 text-xs font-semibold rounded-xl bg-background/80 hover:bg-background border-border/80 shadow-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Try Again
                  </Button>
                )}
              </div>
            </div>
          </div>
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
                        className={`p-5 rounded-2xl border transition-all ${
                          rec.priority === 'CRITICAL' 
                            ? 'border-border/80 border-l-4 border-l-rose-500 bg-rose-50/20 dark:bg-rose-950/10' 
                            : rec.priority === 'HIGH'
                            ? 'border-border/80 border-l-4 border-l-orange-500 bg-orange-50/20 dark:bg-orange-950/10'
                            : rec.priority === 'MEDIUM'
                            ? 'border-border/80 border-l-4 border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10'
                            : 'border-border/80 border-l-4 border-l-indigo-500 bg-card/80'
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

                            <div className="p-3 rounded-xl bg-muted/50 border border-border/60 text-xs text-foreground font-medium flex items-start gap-2">
                              <Wand2 className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-bold text-foreground">Recommended Action: </span>
                                <span className="text-muted-foreground">{rec.action}</span>
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
                                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white shadow-xs shadow-indigo-500/20 flex items-center gap-1.5 whitespace-nowrap rounded-xl text-xs"
                              >
                                {isApplying ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Applying Fix...
                                  </>
                                ) : (
                                  <>
                                    <Wand2 className="h-3.5 w-3.5" />
                                    {suggestion.button_label || 'Apply Transformation'}
                                  </>
                                )}
                              </Button>
                            ) : (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-muted/40 text-muted-foreground text-xs font-medium">
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
