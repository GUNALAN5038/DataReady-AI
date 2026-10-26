'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  Sparkles,
  Layers,
  FileSpreadsheet
} from 'lucide-react'

export interface AnalysisRecordData {
  dataset_version: number
  ml_readiness_score: number | null
  results: {
    types?: Record<string, string>
    missingValues?: Record<string, { missingCount: number; missingPercentage: number }>
    duplicates?: { duplicateCount: number; duplicatePercentage: number }
    outliers?: Record<string, { outlierCount: number; outlierPercentage: number }>
    mlReadiness?: {
      overallScore: number
      components?: {
        completeness: number
        consistency: number
        validity: number
        uniqueness: number
        featureQuality: number
      }
    }
  }
}

interface CompareTabProps {
  initialAnalysis: AnalysisRecordData | null
  currentAnalysis: AnalysisRecordData | null
  initialRowCount: number
  currentRowCount: number
  initialColCount: number
  currentColCount: number
  currentVersion: number
}

function sumMissingValues(mv?: Record<string, { missingCount: number }>): number {
  if (!mv) return 0
  return Object.values(mv).reduce((acc, curr) => acc + (curr?.missingCount || 0), 0)
}

function sumOutliers(outliers?: Record<string, { outlierCount: number }>): number {
  if (!outliers) return 0
  return Object.values(outliers).reduce((acc, curr) => acc + (curr?.outlierCount || 0), 0)
}

export function CompareTab({
  initialAnalysis,
  currentAnalysis,
  initialRowCount,
  currentRowCount,
  initialColCount,
  currentColCount,
  currentVersion
}: CompareTabProps) {
  if (!initialAnalysis || !currentAnalysis) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground space-y-2">
          <Layers className="h-10 w-10 mx-auto text-muted-foreground/60" />
          <p className="font-semibold text-foreground">Analysis comparison not available yet.</p>
          <p className="text-xs">Initial or current analysis records are missing for this dataset.</p>
        </CardContent>
      </Card>
    )
  }

  // Extract Initial metrics
  const initScore = initialAnalysis.ml_readiness_score ?? initialAnalysis.results?.mlReadiness?.overallScore ?? 0
  const initMissing = sumMissingValues(initialAnalysis.results?.missingValues)
  const initDuplicates = initialAnalysis.results?.duplicates?.duplicateCount ?? 0
  const initOutliers = sumOutliers(initialAnalysis.results?.outliers)

  // Extract Current metrics
  const currScore = currentAnalysis.ml_readiness_score ?? currentAnalysis.results?.mlReadiness?.overallScore ?? 0
  const currMissing = sumMissingValues(currentAnalysis.results?.missingValues)
  const currDuplicates = currentAnalysis.results?.duplicates?.duplicateCount ?? 0
  const currOutliers = sumOutliers(currentAnalysis.results?.outliers)

  // Deltas
  const scoreDelta = currScore - initScore
  const rowDelta = currentRowCount - initialRowCount
  const colDelta = currentColCount - initialColCount
  const missingDelta = currMissing - initMissing
  const duplicateDelta = currDuplicates - initDuplicates
  const outlierDelta = currOutliers - initOutliers

  const initComponents = initialAnalysis.results?.mlReadiness?.components || {
    completeness: 0,
    consistency: 0,
    validity: 0,
    uniqueness: 0,
    featureQuality: 0
  }

  const currComponents = currentAnalysis.results?.mlReadiness?.components || {
    completeness: 0,
    consistency: 0,
    validity: 0,
    uniqueness: 0,
    featureQuality: 0
  }

  // Helper for metrics where HIGHER is better (score, completeness, etc.)
  const renderHigherBetterBadge = (delta: number) => {
    if (delta > 0) {
      return (
        <Badge className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs flex items-center gap-1 font-medium shadow-none">
          <ArrowUpRight className="h-3 w-3" /> +{delta} Improvement
        </Badge>
      )
    }
    if (delta < 0) {
      return (
        <Badge className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs flex items-center gap-1 font-medium shadow-none">
          <ArrowDownRight className="h-3 w-3" /> {delta} Decrease
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
        <Minus className="h-3 w-3" /> No change
      </Badge>
    )
  }

  // Helper for metrics where LOWER is better (missing, duplicates, outliers)
  const renderLowerBetterBadge = (delta: number) => {
    if (delta < 0) {
      return (
        <Badge className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs flex items-center gap-1 font-medium shadow-none">
          <ArrowDownRight className="h-3 w-3" /> {delta} Improvement
        </Badge>
      )
    }
    if (delta > 0) {
      return (
        <Badge className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs flex items-center gap-1 font-medium shadow-none">
          <ArrowUpRight className="h-3 w-3" /> +{delta} Increase
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
        <Minus className="h-3 w-3" /> No change
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="border border-indigo-200/60 dark:border-indigo-900/40 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-teal-50/40 dark:from-indigo-950/20 dark:via-zinc-900 dark:to-teal-950/20 rounded-2xl shadow-xs">
        <CardHeader className="pb-4 pt-5 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl flex items-center gap-2 text-foreground">
                <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Initial vs. Current Version Comparison
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Compare data hygiene metrics and ML readiness between Version 0 (Raw Upload) and Version {currentVersion} (Current).
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 border-border/80 bg-background/60">v0 (Raw)</Badge>
              <span className="text-xs text-muted-foreground font-semibold">vs</span>
              <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-mono text-xs px-2.5 py-1 shadow-xs shadow-indigo-500/20">v{currentVersion} (Current)</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ML Readiness Score */}
        <Card className="p-5 space-y-3 rounded-2xl border-border/80 card-hover-lift shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-violet-600" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ML Readiness Score</span>
            {renderHigherBetterBadge(scoreDelta)}
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">Initial (v0)</span>
              <span className="text-2xl font-bold font-mono">{initScore}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block font-medium">Current (v{currentVersion})</span>
              <span className="text-2xl font-bold font-mono bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">{currScore}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
        </Card>

        {/* Missing Values */}
        <Card className="p-5 space-y-3 rounded-2xl border-border/80 card-hover-lift shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Missing Values</span>
            {renderLowerBetterBadge(missingDelta)}
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">Initial (v0)</span>
              <span className="text-2xl font-bold font-mono">{initMissing.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground"> cells</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block font-medium">Current (v{currentVersion})</span>
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{currMissing.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground"> cells</span>
            </div>
          </div>
        </Card>

        {/* Duplicate Rows */}
        <Card className="p-5 space-y-3 rounded-2xl border-border/80 card-hover-lift shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duplicate Rows</span>
            {renderLowerBetterBadge(duplicateDelta)}
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">Initial (v0)</span>
              <span className="text-2xl font-bold font-mono">{initDuplicates.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground"> rows</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block font-medium">Current (v{currentVersion})</span>
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{currDuplicates.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground"> rows</span>
            </div>
          </div>
        </Card>

        {/* Outliers */}
        <Card className="p-5 space-y-3 rounded-2xl border-border/80 card-hover-lift shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outliers (IQR)</span>
            {renderLowerBetterBadge(outlierDelta)}
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">Initial (v0)</span>
              <span className="text-2xl font-bold font-mono">{initOutliers.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block font-medium">Current (v{currentVersion})</span>
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{currOutliers.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Total Rows */}
        <Card className="p-5 space-y-3 rounded-2xl border-border/80 card-hover-lift shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dataset Rows</span>
            <Badge variant="secondary" className="text-xs font-mono">
              {rowDelta !== 0 ? `${rowDelta > 0 ? '+' : ''}${rowDelta} rows` : 'Unchanged'}
            </Badge>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">Initial (v0)</span>
              <span className="text-2xl font-bold font-mono">{initialRowCount.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block font-medium">Current (v{currentVersion})</span>
              <span className="text-2xl font-bold font-mono text-foreground">{currentRowCount.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Total Columns */}
        <Card className="p-5 space-y-3 rounded-2xl border-border/80 card-hover-lift shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Columns</span>
            <Badge variant="secondary" className="text-xs font-mono">
              {colDelta !== 0 ? `${colDelta > 0 ? '+' : ''}${colDelta} cols` : 'Unchanged'}
            </Badge>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">Initial (v0)</span>
              <span className="text-2xl font-bold font-mono">{initialColCount}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block font-medium">Current (v{currentVersion})</span>
              <span className="text-2xl font-bold font-mono text-foreground">{currentColCount}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ML Readiness Component Score Breakdown Comparison */}
      <Card className="border-border/80 rounded-2xl shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground">
            <FileSpreadsheet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            ML Quality Component Breakdown
          </CardTitle>
          <CardDescription className="text-xs">
            Detailed progression across every dimension of the ML readiness formula.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'completeness', label: 'Completeness (25% weight)', init: initComponents.completeness, curr: currComponents.completeness },
            { key: 'consistency', label: 'Consistency (20% weight)', init: initComponents.consistency, curr: currComponents.consistency },
            { key: 'validity', label: 'Validity (20% weight)', init: initComponents.validity, curr: currComponents.validity },
            { key: 'uniqueness', label: 'Uniqueness (15% weight)', init: initComponents.uniqueness, curr: currComponents.uniqueness },
            { key: 'featureQuality', label: 'Feature Quality (20% weight)', init: initComponents.featureQuality, curr: currComponents.featureQuality },
          ].map((comp) => {
            const delta = comp.curr - comp.init
            return (
              <div key={comp.key} className="space-y-2 p-4 rounded-xl border border-border/70 bg-card/70 backdrop-blur-xs">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-foreground font-semibold">{comp.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground font-mono">v0: {comp.init}/100</span>
                    <span className="font-bold text-foreground font-mono">v{currentVersion}: {comp.curr}/100</span>
                    {renderHigherBetterBadge(delta)}
                  </div>
                </div>
                <div className="w-full bg-muted/80 rounded-full h-2.5 overflow-hidden flex">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${
                      comp.curr >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : comp.curr >= 50 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' : 'bg-gradient-to-r from-rose-500 to-red-500'
                    }`} 
                    style={{ width: `${comp.curr}%` }}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
