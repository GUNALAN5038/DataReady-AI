import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-44 rounded-lg bg-muted/80" />
          <div className="h-4 w-80 rounded-md bg-muted/60" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-muted/80" />
      </div>

      {/* Top 3 Metric Cards Skeleton */}
      <div className="grid gap-5 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border/60 bg-card/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 rounded-md bg-muted/60" />
              <div className="h-9 w-9 rounded-xl bg-muted/50" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="h-8 w-16 rounded-md bg-muted/80" />
              <div className="h-3 w-32 rounded-md bg-muted/50" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Datasets Header Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-36 rounded-md bg-muted/70" />
          <div className="h-4 w-20 rounded-md bg-muted/50" />
        </div>

        {/* Recent Datasets Cards Grid Skeleton */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/60 bg-card/60 p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="h-5 w-3/4 rounded-md bg-muted/70" />
                <div className="h-5 w-12 rounded-md bg-muted/50" />
              </div>
              <div className="h-3 w-1/2 rounded-md bg-muted/50" />
              <div className="pt-3 border-t border-border/50 flex justify-between items-center">
                <div className="h-4 w-20 rounded-md bg-muted/60" />
                <div className="h-4 w-16 rounded-full bg-muted/50" />
              </div>
              <div className="h-9 w-full rounded-xl bg-muted/60" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
