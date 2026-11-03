import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Database, PlusCircle, ArrowRight, Layers, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'

const PAGE_SIZE = 20

function buildPageUrl(pageNumber: number, existingParams: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(existingParams)) {
    if (key !== 'page' && typeof value === 'string') {
      params.set(key, value)
    }
  }
  params.set('page', String(pageNumber))
  return `/datasets?${params.toString()}`
}

export default async function DatasetsListPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect('/login')
  }

  const resolvedParams = searchParams ? await searchParams : {}
  const rawPage = resolvedParams.page
  const parsedPage = typeof rawPage === 'string' ? parseInt(rawPage, 10) : 1
  const currentPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1

  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()
  const { data: datasets, count: totalCount, error: datasetsError } = await supabase
    .from('datasets')
    .select('id, name, file_type, row_count, current_version, created_at', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  const totalDatasets = totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalDatasets / PAGE_SIZE))
  const hasPrevious = currentPage > 1
  const hasNext = currentPage < totalPages

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My Datasets</h1>
            {totalDatasets > 0 && (
              <Badge variant="secondary" className="font-semibold text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {totalDatasets} total
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your uploaded tabular datasets, track version history, and run quality analyses.
          </p>
        </div>
        <Link href="/upload">
          <Button className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white shadow-sm hover:shadow-md transition-all font-medium flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Upload Dataset
          </Button>
        </Link>
      </div>

      {datasetsError && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Could not load datasets. Please refresh the page.</span>
        </div>
      )}

      {totalDatasets === 0 && !datasetsError ? (
        <Card className="flex flex-col items-center justify-center p-14 text-center bg-gradient-to-b from-indigo-50/20 via-card to-card border-dashed border-2 border-indigo-200/60 dark:border-indigo-900/40 rounded-2xl">
          <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-xs">
            <Database className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No datasets found</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Upload your first tabular dataset (CSV, XLSX, JSON) to start analyzing and transforming.
          </p>
          <Link href="/upload">
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Upload Now
            </Button>
          </Link>
        </Card>
      ) : datasets && datasets.length === 0 && totalDatasets > 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 rounded-2xl">
          <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400 flex items-center justify-center mb-3">
            <Database className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No datasets on page {currentPage}</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm">
            This page is beyond your available datasets. There are {totalPages} page{totalPages > 1 ? 's' : ''} in total.
          </p>
          <Link href={buildPageUrl(1, resolvedParams)}>
            <Button variant="outline" size="sm" className="text-xs">
              Go to Page 1
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {datasets?.map((dataset) => {
              const version = dataset.current_version ?? 0
              return (
                <Card key={dataset.id} className="card-hover-lift flex flex-col justify-between border-border/80 bg-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base truncate font-semibold text-foreground" title={dataset.name}>
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
                      <span className="flex items-center gap-1.5 font-medium">
                        <Database className="h-3.5 w-3.5 text-blue-500" />
                        {(dataset.row_count ?? 0).toLocaleString()} rows
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-[11px] font-mono uppercase tracking-wider text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded-full border border-violet-200/60 dark:border-violet-800/60">
                        <Layers className="h-3 w-3 text-violet-500" />
                        v{version}
                      </span>
                    </div>

                    <Link href={`/datasets/${dataset.id}`} className="block">
                      <Button variant="secondary" className="w-full text-xs font-semibold flex items-center justify-center gap-1.5 group hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 transition-colors">
                        <span>View Details &amp; Clean</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {totalDatasets > 0 && totalPages > 1 && (
            <nav
              role="navigation"
              aria-label="Datasets pagination"
              className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/60"
            >
              <p className="text-xs text-muted-foreground order-2 sm:order-1">
                Showing <span className="font-semibold text-foreground">{from + 1}</span>–
                <span className="font-semibold text-foreground">
                  {Math.min(from + (datasets?.length ?? 0), totalDatasets)}
                </span> of <span className="font-semibold text-foreground">{totalDatasets}</span> datasets
              </p>

              <div className="flex items-center gap-2 order-1 sm:order-2">
                {hasPrevious ? (
                  <Link href={buildPageUrl(currentPage - 1, resolvedParams)} aria-label="Go to previous page">
                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs flex items-center gap-1">
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Previous</span>
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" disabled className="h-8 px-3 text-xs flex items-center gap-1 opacity-50 cursor-not-allowed" aria-disabled="true">
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </Button>
                )}

                <span className="text-xs font-medium px-2 text-muted-foreground" aria-current="page">
                  Page <span className="font-semibold text-foreground">{currentPage}</span> of <span className="font-semibold text-foreground">{totalPages}</span>
                </span>

                {hasNext ? (
                  <Link href={buildPageUrl(currentPage + 1, resolvedParams)} aria-label="Go to next page">
                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs flex items-center gap-1">
                      <span>Next</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" disabled className="h-8 px-3 text-xs flex items-center gap-1 opacity-50 cursor-not-allowed" aria-disabled="true">
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </nav>
          )}
        </div>
      )}
    </div>
  )
}
