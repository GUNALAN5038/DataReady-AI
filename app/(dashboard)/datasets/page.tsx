import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Database, PlusCircle, ArrowRight, Layers } from 'lucide-react'

export default async function DatasetsListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: datasets } = await supabase
    .from('datasets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Datasets</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your uploaded datasets, versions, and quality analyses.
          </p>
        </div>
        <Link href="/upload">
          <Button className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Upload Dataset
          </Button>
        </Link>
      </div>

      {!datasets || datasets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <Database className="h-12 w-12 text-muted-foreground/60 mb-4" />
          <h3 className="text-lg font-semibold">No datasets found</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            Upload your first tabular dataset (CSV, XLSX, JSON) to start analyzing and transforming.
          </p>
          <Link href="/upload">
            <Button>Upload Now</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {datasets.map((dataset) => {
            const version = dataset.current_version ?? 0
            return (
              <Card key={dataset.id} className="hover:border-purple-300 dark:hover:border-purple-800 transition-all flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base truncate font-semibold">{dataset.name}</CardTitle>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {dataset.file_type || 'CSV'}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Uploaded on {new Date(dataset.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Database className="h-3.5 w-3.5 text-blue-500" />
                      {(dataset.row_count ?? 0).toLocaleString()} rows
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <Layers className="h-3.5 w-3.5 text-purple-500" />
                      v{version}
                    </span>
                  </div>

                  <Link href={`/datasets/${dataset.id}`} className="block">
                    <Button variant="secondary" className="w-full text-xs flex items-center justify-center gap-1.5 group">
                      <span>View Details &amp; Clean</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
