import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Sparkles, Scale, Gauge, Lightbulb, CheckCircle2, TrendingUp } from 'lucide-react'
import { TransformTab } from '@/components/datasets/transform-tab'
import { ExportButton } from '@/components/datasets/export-button'
import { AIInsightsTab } from '@/components/datasets/ai-insights-tab'
import { DatasetChat } from '@/components/datasets/dataset-chat'
import { HistoryTab } from '@/components/datasets/history-tab'
import { CompareTab } from '@/components/datasets/compare-tab'

export default async function DatasetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: dataset, error: datasetError } = await supabase
    .from('datasets')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (datasetError || !dataset) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Dataset not found or you do not have permission to view it.</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (dataset.status === 'processing') {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 p-12">
        <div className="text-xl font-medium animate-pulse text-blue-600">Analyzing Dataset...</div>
        <p className="text-sm text-muted-foreground">Please wait while we process your data and compute ML readiness metrics.</p>
      </div>
    )
  }

  if (dataset.status === 'failed') {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Analysis Failed</AlertTitle>
          <AlertDescription>{dataset.processing_error || 'An error occurred during dataset processing.'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const currentVersion = dataset.current_version ?? 0

  // 1. Fetch Current Analysis
  const { data: currentFullAnalysis } = await supabase
    .from('analyses')
    .select('*')
    .eq('dataset_id', id)
    .eq('analysis_type', 'full_analysis')
    .order('dataset_version', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: currentMLAnalysis } = await supabase
    .from('analyses')
    .select('*')
    .eq('dataset_id', id)
    .eq('analysis_type', 'ml_readiness')
    .order('dataset_version', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 2. Fetch Initial Analysis (Version 0) for Before/After comparison
  const { data: initialFullAnalysis } = await supabase
    .from('analyses')
    .select('*')
    .eq('dataset_id', id)
    .eq('analysis_type', 'full_analysis')
    .eq('dataset_version', 0)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: initialMLAnalysis } = await supabase
    .from('analyses')
    .select('*')
    .eq('dataset_id', id)
    .eq('analysis_type', 'ml_readiness')
    .eq('dataset_version', 0)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // Merge the analysis objects
  const analysis = currentFullAnalysis ? {
    ...currentFullAnalysis,
    results: {
      ...currentFullAnalysis.results,
      mlReadiness: currentMLAnalysis?.results || currentFullAnalysis.results?.mlReadiness
    }
  } : null

  const initialAnalysisMerged = (initialFullAnalysis || currentFullAnalysis) ? {
    ...(initialFullAnalysis || currentFullAnalysis),
    results: {
      ...(initialFullAnalysis || currentFullAnalysis)?.results,
      mlReadiness: initialMLAnalysis?.results || (initialFullAnalysis || currentFullAnalysis)?.results?.mlReadiness
    }
  } : null

  // 3. Fetch Transformation History
  const { data: transformations } = await supabase
    .from('dataset_transformations')
    .select('*')
    .eq('dataset_id', id)
    .order('new_version', { ascending: false })

  const sampleData = dataset.sample_data || []
  const columns = dataset.column_metadata || []
  const results = analysis?.results || {}
  const history = transformations || []

  const mlReadinessData = (analysis?.results?.mlReadiness || currentMLAnalysis?.results) as {
    overallScore?: number
    category?: string
    components?: {
      completeness?: number
      consistency?: number
      validity?: number
      uniqueness?: number
      featureQuality?: number
    }
  } | undefined

  const mlOverallScore = analysis?.ml_readiness_score ?? mlReadinessData?.overallScore ?? 0
  const mlCategory = mlReadinessData?.category || (
    mlOverallScore >= 90 ? 'Excellent' :
    mlOverallScore >= 70 ? 'Good' :
    mlOverallScore >= 50 ? 'Fair' :
    mlOverallScore >= 30 ? 'Needs Improvement' : 'Poor'
  )
  const mlComponents = mlReadinessData?.components || {
    completeness: 0,
    consistency: 0,
    validity: 0,
    uniqueness: 0,
    featureQuality: 0
  }
  const recommendationsList = (analysis?.recommendations || results?.recommendations || []) as Array<{
    priority: string
    problem: string
    explanation: string
    action: string
  }>

  // Determine initial row & col count
  const initialRowCount = initialFullAnalysis?.results?.stats
    ? Object.values(initialFullAnalysis.results.stats as Record<string, { count?: number; total?: number }>)[0]?.count ?? dataset.row_count ?? 0
    : dataset.row_count ?? 0
  const initialColCount = initialFullAnalysis?.results?.types
    ? Object.keys(initialFullAnalysis.results.types).length
    : dataset.column_count ?? 0

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">{dataset.name}</h1>
            <Badge variant="outline" className="uppercase font-mono text-xs">{dataset.file_type || 'CSV'}</Badge>
            <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs">Version {currentVersion}</Badge>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            Uploaded on {new Date(dataset.created_at).toLocaleDateString()} • {dataset.row_count?.toLocaleString()} rows, {dataset.column_count} columns
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton datasetId={dataset.id} currentVersion={currentVersion} />
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="insights" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 h-auto p-1 gap-1">
          <TabsTrigger value="insights" className="py-2 text-xs sm:text-sm flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            <span>AI Insights</span>
          </TabsTrigger>
          <TabsTrigger value="readiness" className="py-2 text-xs sm:text-sm flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-blue-500" />
            <span>ML Readiness</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="py-2 text-xs sm:text-sm flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
            <span>Recommendations</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="py-2 text-xs sm:text-sm">Preview</TabsTrigger>
          <TabsTrigger value="summary" className="py-2 text-xs sm:text-sm">Summary</TabsTrigger>
          <TabsTrigger value="quality" className="py-2 text-xs sm:text-sm">Data Quality</TabsTrigger>
          <TabsTrigger value="transform" className="py-2 text-xs sm:text-sm">Transform</TabsTrigger>
          <TabsTrigger value="compare" className="py-2 text-xs sm:text-sm flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5 text-blue-500" />
            <span>Compare</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="py-2 text-xs sm:text-sm">History</TabsTrigger>
          <TabsTrigger value="chat" className="py-2 text-xs sm:text-sm">AI Chat</TabsTrigger>
        </TabsList>

        {/* 1. AI Insights */}
        <TabsContent value="insights" className="mt-6">
          <AIInsightsTab datasetId={dataset.id} analysis={analysis} dataset={dataset} />
        </TabsContent>

        {/* 2. ML Readiness (Deterministic Score & Component Breakdown) */}
        <TabsContent value="readiness" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-blue-600" />
                    ML Readiness Score
                  </CardTitle>
                  <CardDescription>
                    Algorithmic evaluation of dataset readiness for machine learning workflows (Version {currentVersion}).
                  </CardDescription>
                </div>
                <Badge className={
                  mlOverallScore >= 90 ? 'bg-emerald-600 text-white text-sm' :
                  mlOverallScore >= 70 ? 'bg-green-600 text-white text-sm' :
                  mlOverallScore >= 50 ? 'bg-yellow-600 text-white text-sm' :
                  mlOverallScore >= 30 ? 'bg-orange-600 text-white text-sm' : 'bg-red-600 text-white text-sm'
                }>
                  {mlCategory} ({mlOverallScore}/100)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Overall Readiness</span>
                  <span>{mlOverallScore}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      mlOverallScore >= 70 ? 'bg-emerald-600' :
                      mlOverallScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${mlOverallScore}%` }}
                  />
                </div>
              </div>

              {/* 5 Component Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="p-4 rounded-xl border bg-card space-y-1 text-center">
                  <div className="text-xs text-muted-foreground font-semibold uppercase">Completeness</div>
                  <div className="text-2xl font-bold">{mlComponents.completeness}%</div>
                  <div className="text-[11px] text-muted-foreground">Weight: 25%</div>
                </div>
                <div className="p-4 rounded-xl border bg-card space-y-1 text-center">
                  <div className="text-xs text-muted-foreground font-semibold uppercase">Consistency</div>
                  <div className="text-2xl font-bold">{mlComponents.consistency}%</div>
                  <div className="text-[11px] text-muted-foreground">Weight: 20%</div>
                </div>
                <div className="p-4 rounded-xl border bg-card space-y-1 text-center">
                  <div className="text-xs text-muted-foreground font-semibold uppercase">Validity</div>
                  <div className="text-2xl font-bold">{mlComponents.validity}%</div>
                  <div className="text-[11px] text-muted-foreground">Weight: 20%</div>
                </div>
                <div className="p-4 rounded-xl border bg-card space-y-1 text-center">
                  <div className="text-xs text-muted-foreground font-semibold uppercase">Uniqueness</div>
                  <div className="text-2xl font-bold">{mlComponents.uniqueness}%</div>
                  <div className="text-[11px] text-muted-foreground">Weight: 15%</div>
                </div>
                <div className="p-4 rounded-xl border bg-card space-y-1 text-center">
                  <div className="text-xs text-muted-foreground font-semibold uppercase">Feature Quality</div>
                  <div className="text-2xl font-bold">{mlComponents.featureQuality}%</div>
                  <div className="text-[11px] text-muted-foreground">Weight: 20%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Recommendations */}
        <TabsContent value="recommendations" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Data Quality Recommendations
              </CardTitle>
              <CardDescription>
                Prioritized algorithmic suggestions to optimize this dataset for machine learning models.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recommendationsList.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground space-y-2">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-600" />
                  <p className="font-semibold text-foreground">Dataset is in great shape!</p>
                  <p className="text-xs">No critical rule-based quality issues detected for Version {currentVersion}.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendationsList.map((rec, i) => (
                    <div key={i} className="p-4 rounded-xl border bg-card space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm">{rec.problem}</span>
                        <Badge variant={
                          rec.priority === 'Critical' ? 'destructive' :
                          rec.priority === 'High' ? 'default' : 'secondary'
                        } className="text-xs">
                          {rec.priority} Priority
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{rec.explanation}</p>
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-lg border border-blue-200 dark:border-blue-900">
                        <span className="font-semibold">Recommended Action:</span> {rec.action}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Preview */}
        <TabsContent value="preview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Preview</CardTitle>
              <CardDescription>Displaying active dataset records (Version {currentVersion}, first {sampleData.length} rows)</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {sampleData.length > 0 ? (
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="text-xs uppercase bg-muted/60 text-muted-foreground border-b">
                    <tr>
                      {columns.map((col: { name: string }, i: number) => (
                        <th key={i} className="px-4 py-3 border whitespace-nowrap font-semibold">{col.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleData.map((row: Record<string, unknown>, i: number) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        {columns.map((col: { name: string }, j: number) => (
                          <td key={j} className="px-4 py-2.5 border whitespace-nowrap max-w-[220px] truncate text-xs">
                            {row[col.name] === null || row[col.name] === undefined ? (
                              <span className="text-muted-foreground italic">null</span>
                            ) : (
                              String(row[col.name])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-muted-foreground py-4">No preview data available for this version.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Summary */}
        <TabsContent value="summary" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.keys(results.stats || {}).slice(0, 12).map((col) => {
              const stat = results.stats[col]
              const type = results.types?.[col] || 'unknown'
              return (
                <Card key={col}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base truncate">{col}</CardTitle>
                    <CardDescription className="uppercase text-xs font-mono">{type}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {type === 'numeric' && stat.mean !== undefined ? (
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div><span className="text-muted-foreground">Mean:</span> {stat.mean.toFixed(2)}</div>
                        <div><span className="text-muted-foreground">Median:</span> {stat.median.toFixed(2)}</div>
                        <div><span className="text-muted-foreground">Min:</span> {stat.min.toFixed(2)}</div>
                        <div><span className="text-muted-foreground">Max:</span> {stat.max.toFixed(2)}</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 mt-2 text-xs">
                        <div><span className="text-muted-foreground">Unique Values:</span> {stat.unique ?? 'N/A'}</div>
                        <div><span className="text-muted-foreground">Mode:</span> <span className="truncate inline-block max-w-[120px] align-bottom font-medium">{String(stat.mode || 'N/A')}</span></div>
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                      Missing: {stat.missing ?? 0} ({dataset.row_count ? (((stat.missing ?? 0) / dataset.row_count) * 100).toFixed(1) : 0}%)
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* 4. Data Quality */}
        <TabsContent value="quality" className="mt-6 space-y-6">
          {/* Missing Values */}
          <Card>
            <CardHeader>
              <CardTitle>Missing Values Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.keys(results.missingValues || {}).filter(col => results.missingValues[col].missingCount > 0).length === 0 ? (
                  <p className="text-emerald-600 font-medium text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> No missing values found in current version! 🎉
                  </p>
                ) : (
                  Object.keys(results.missingValues || {})
                    .filter(col => results.missingValues[col].missingCount > 0)
                    .sort((a, b) => results.missingValues[b].missingCount - results.missingValues[a].missingCount)
                    .map(col => {
                      const mv = results.missingValues[col]
                      return (
                        <div key={col} className="flex items-center justify-between border-b pb-2 text-sm">
                          <span className="font-medium">{col}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground">{mv.missingCount} rows</span>
                            <Badge variant={mv.severity === 'critical' || mv.severity === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                              {mv.missingPercentage.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Duplicates */}
          <Card>
            <CardHeader>
              <CardTitle>Duplicate Rows</CardTitle>
            </CardHeader>
            <CardContent>
              {results.duplicates?.duplicateCount > 0 ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-red-600">{results.duplicates.duplicateCount}</p>
                    <p className="text-xs text-muted-foreground">Duplicate rows found ({results.duplicates.duplicatePercentage.toFixed(1)}%)</p>
                  </div>
                </div>
              ) : (
                <p className="text-emerald-600 font-medium text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> No duplicate rows found in current version! 🎉
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Outliers */}
          <Card>
            <CardHeader>
              <CardTitle>Statistical Outliers (IQR Method)</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-3">
                {Object.keys(results.outliers || {}).filter(col => results.outliers[col].outlierCount > 0).length === 0 ? (
                  <p className="text-emerald-600 font-medium text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> No significant outliers detected.
                  </p>
                ) : (
                  Object.keys(results.outliers || {})
                    .filter(col => results.outliers[col].outlierCount > 0)
                    .map(col => {
                      const out = results.outliers[col]
                      return (
                        <div key={col} className="flex items-center justify-between border-b pb-2 text-sm">
                          <span className="font-medium">{col}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground">{out.outlierCount} outliers</span>
                            <Badge variant="outline" className="text-xs">{out.outlierPercentage.toFixed(1)}%</Badge>
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Transform */}
        <TabsContent value="transform" className="mt-6">
          <TransformTab
            datasetId={dataset.id}
            columns={columns}
            currentVersion={currentVersion}
          />
        </TabsContent>

        {/* 6. Compare (Before/After) */}
        <TabsContent value="compare" className="mt-6">
          <CompareTab
            initialAnalysis={initialAnalysisMerged}
            currentAnalysis={analysis}
            initialRowCount={initialRowCount}
            currentRowCount={dataset.row_count ?? 0}
            initialColCount={initialColCount}
            currentColCount={dataset.column_count ?? 0}
            currentVersion={currentVersion}
          />
        </TabsContent>

        {/* 7. History */}
        <TabsContent value="history" className="mt-6">
          <HistoryTab
            datasetId={dataset.id}
            currentVersion={currentVersion}
            datasetCreatedAt={dataset.created_at}
            history={history}
          />
        </TabsContent>

        {/* 8. AI Chat */}
        <TabsContent value="chat" className="mt-6">
          <DatasetChat datasetId={dataset.id} />
        </TabsContent>

      </Tabs>
    </div>
  )
}
