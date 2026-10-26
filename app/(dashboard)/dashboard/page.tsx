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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Link href="/upload">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Upload Dataset
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Datasets</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDatasets}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. ML Readiness</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMLReadiness > 0 ? `${avgMLReadiness}/100` : '-'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentDatasets.length > 0 ? recentDatasets[0].name : 'No activity'}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Recent Datasets</h2>
        {recentDatasets.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 dark:bg-zinc-900/50 border-dashed">
            <Database className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold">No datasets yet</h3>
            <p className="text-gray-500 mb-4">Upload your first dataset to get started.</p>
            <Link href="/upload">
              <Button variant="outline">
                Upload Now
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentDatasets.map((dataset) => (
              <Card key={dataset.id} className="hover:border-blue-500 transition-colors">
                <CardHeader>
                  <CardTitle className="truncate text-lg">{dataset.name}</CardTitle>
                  <CardDescription>{new Date(dataset.created_at).toLocaleDateString()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{dataset.row_count || 0} rows</span>
                    <span className="uppercase text-xs font-semibold px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded-full">{dataset.status}</span>
                  </div>
                </CardContent>
                <div className="p-4 pt-0">
                  <Link href={`/datasets/${dataset.id}`}>
                    <Button variant="secondary" className="w-full">View Details</Button>
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
