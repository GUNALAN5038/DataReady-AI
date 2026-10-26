import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlusCircle, Database, TrendingUp, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: datasets } = await supabase
    .from('datasets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const totalDatasets = datasets?.length || 0
  const recentDatasets = datasets?.slice(0, 5) || []

  // Calculate Average ML Readiness
  // In a real app, this should join with analyses table. For simplicity, if we have it in datasets or fetch separately.
  // We'll fetch analyses to get scores.
  const { data: analyses } = await supabase
    .from('analyses')
    .select('ml_readiness_score')
    .eq('user_id', user.id)
    .eq('analysis_type', 'ml_readiness')
    .not('ml_readiness_score', 'is', null)

  const avgMLReadiness = analyses?.length
    ? Math.round(analyses.reduce((acc, a) => acc + (a.ml_readiness_score || 0), 0) / analyses.length)
    : 0

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Overview of your tabular data, quality health, and ML readiness metrics.
          </p>
        </div>
        <Link href="/upload">
          <Button className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white shadow-sm hover:shadow-md transition-all font-medium px-4 py-2 h-10">
            <PlusCircle className="mr-2 h-4 w-4" />
            Upload Dataset
          </Button>
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="card-hover-lift border-border/70 relative overflow-hidden bg-card/90">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Datasets</CardTitle>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center">
              <Database className="h-4.5 w-4.5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-extrabold tracking-tight text-foreground">{totalDatasets}</div>
            <p className="text-xs text-muted-foreground">Active in your workspace</p>
          </CardContent>
        </Card>
        
        <Card className="card-hover-lift border-border/70 relative overflow-hidden bg-card/90">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. ML Readiness</CardTitle>
            <div className="h-9 w-9 rounded-xl bg-violet-500/10 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 flex items-center justify-center">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              {avgMLReadiness > 0 ? `${avgMLReadiness}/100` : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {avgMLReadiness >= 80 ? 'Production ready quality' : avgMLReadiness > 0 ? 'Cleaning recommended' : 'Pending dataset analysis'}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover-lift border-border/70 relative overflow-hidden bg-card/90">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Activity</CardTitle>
            <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 flex items-center justify-center">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-xl font-bold tracking-tight text-foreground truncate">
              {recentDatasets.length > 0 ? recentDatasets[0].name : 'No activity'}
            </div>
            <p className="text-xs text-muted-foreground">
              {recentDatasets.length > 0 ? `Latest: ${new Date(recentDatasets[0].created_at).toLocaleDateString()}` : 'Upload data to begin'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Recent Datasets</h2>
          {recentDatasets.length > 0 && (
            <Link href="/datasets" className="text-xs font-semibold text-blue-600 hover:text-indigo-600 transition-colors">
              View all ({totalDatasets}) →
            </Link>
          )}
        </div>

        {recentDatasets.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center bg-gradient-to-b from-indigo-50/20 via-card to-card border-dashed border-2 border-indigo-200/60 dark:border-indigo-900/40 rounded-2xl">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-xs">
              <Database className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No datasets uploaded yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6">
              Upload your CSV, XLSX, or JSON datasets to unlock automated quality inspection and ML scoring.
            </p>
            <Link href="/upload">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Upload Your First Dataset
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {recentDatasets.map((dataset) => (
              <Card key={dataset.id} className="card-hover-lift flex flex-col justify-between border-border/80 bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="truncate text-base font-semibold text-foreground" title={dataset.name}>
                      {dataset.name}
                    </CardTitle>
                    <span className="uppercase text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50 shrink-0">
                      {dataset.file_type || 'CSV'}
                    </span>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground">
                    Uploaded on {new Date(dataset.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60">
                    <span className="font-medium flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5 text-blue-500" />
                      {(dataset.row_count || 0).toLocaleString()} rows
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[11px] uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200/60 dark:border-teal-800/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                      {dataset.status}
                    </span>
                  </div>
                </CardContent>
                <div className="p-4 pt-0">
                  <Link href={`/datasets/${dataset.id}`} className="block">
                    <Button variant="secondary" className="w-full text-xs font-semibold hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 transition-colors">
                      View Details &amp; Clean
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
