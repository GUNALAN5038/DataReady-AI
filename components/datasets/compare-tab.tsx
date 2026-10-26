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
        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1">
          <ArrowUpRight className="h-3 w-3" /> +{delta} Improvement
        </Badge>
      )
    }
    if (delta < 0) {
      return (
        <Badge variant="destructive" className="text-xs flex items-center gap-1">
          <ArrowDownRight className="h-3 w-3" /> {delta} Decrease
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="text-xs flex items-center gap-1">
        <Minus className="h-3 w-3" /> No change
      </Badge>
    )
  }

  // Helper for metrics where LOWER is better (missing, duplicates, outliers)
  const renderLowerBetterBadge = (delta: number) => {
    if (delta < 0) {
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1">
          <ArrowDownRight className="h-3 w-3" /> {delta} Improvement
        </Badge>
      )
    }
    if (delta > 0) {
      return (
        <Badge variant="destructive" className="text-xs flex items-center gap-1">
          <ArrowUpRight className="h-3 w-3" /> +{delta} Increase
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="text-xs flex items-center gap-1">
        <Minus className="h-3 w-3" /> No change
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="border-purple-200 dark:border-purple-900 bg-gradient-to-r from-purple-50/50 via-background to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Initial vs. Current Version Comparison
              </CardTitle>
              <CardDescription>
                Compare data hygiene metrics and ML readiness between Version 0 (Raw Upload) and Version {currentVersion} (Current).
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">v0 (Raw)</Badge>
              <span className="text-xs text-muted-foreground font-semibold">vs</span>
              <Badge className="bg-purple-600 text-white font-mono">v{currentVersion} (Current)</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ML Readiness Score */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">ML Readiness Score</span>
            {renderHigherBetterBadge(scoreDelta)}
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-xs text-muted-foreground block">Initial (v0)</span>
              <span className="text-2xl font-bold">{initScore}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Current (v{currentVersion})</span>
              <span className="text-2xl font-bold text-purple-600">{currScore}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
        </Card>

        {/* Missing Values */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Missing Values</span>
            {renderLowerBetterBadge(missingDelta)}
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-xs text-muted-foreground block">Initial (v0)</span>
              <span className="text-2xl font-bold">{initMissing.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground"> cells</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Current (v{currentVersion})</span>
              <span className="text-2xl font-bold text-emerald-600">{currMissing.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground"> cells</span>
            </div>
          </div>
        </Card>

        {/* Duplicate Rows */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Duplicate Rows</span>
            {renderLowerBetterBadge(duplicateDelta)}
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-xs text-muted-foreground block">Initial (v0)</span>
              <span className="text-2xl font-bold">{initDuplicates.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground"> rows</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Current (v{currentVersion})</span>
              <span className="text-2xl font-bold text-emerald-600">{currDuplicates.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground"> rows</span>
            </div>
          </div>
        </Card>

        {/* Outliers */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Outliers (IQR)</span>
            {renderLowerBetterBadge(outlierDelta)}
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-xs text-muted-foreground block">Initial (v0)</span>
              <span className="text-2xl font-bold">{initOutliers.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Current (v{currentVersion})</span>
              <span className="text-2xl font-bold text-emerald-600">{currOutliers.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Total Rows */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Dataset Rows</span>
            <Badge variant="secondary" className="text-xs font-mono">
              {rowDelta !== 0 ? `${rowDelta > 0 ? '+' : ''}${rowDelta} rows` : 'Unchanged'}
            </Badge>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-xs text-muted-foreground block">Initial (v0)</span>
              <span className="text-2xl font-bold">{initialRowCount.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Current (v{currentVersion})</span>
              <span className="text-2xl font-bold">{currentRowCount.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Total Columns */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Columns</span>
            <Badge variant="secondary" className="text-xs font-mono">
              {colDelta !== 0 ? `${colDelta > 0 ? '+' : ''}${colDelta} cols` : 'Unchanged'}
            </Badge>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-xs text-muted-foreground block">Initial (v0)</span>
              <span className="text-2xl font-bold">{initialColCount}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Current (v{currentVersion})</span>
              <span className="text-2xl font-bold">{currentColCount}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ML Readiness Component Score Breakdown Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-purple-600" />
            ML Quality Component Breakdown
          </CardTitle>
          <CardDescription>
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
              <div key={comp.key} className="space-y-1.5 p-3 rounded-lg border bg-card/60">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span>{comp.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground font-mono">v0: {comp.init}/100</span>
                    <span className="font-bold text-foreground font-mono">v{currentVersion}: {comp.curr}/100</span>
                    {renderHigherBetterBadge(delta)}
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden flex">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      comp.curr >= 80 ? 'bg-emerald-500' : comp.curr >= 50 ? 'bg-yellow-500' : 'bg-red-500'
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
