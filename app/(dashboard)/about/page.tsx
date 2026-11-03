import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, Cpu, Code2, Sparkles } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">About DataReady AI</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Automated Data Quality Assessment &amp; Machine Learning Preparation Platform.
        </p>
      </div>

      <Card className="rounded-2xl border-border/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        <CardHeader className="pb-3 pt-6 px-6">
          <CardTitle className="text-xl flex items-center gap-2 text-foreground">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs shadow-indigo-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            Our Mission
          </CardTitle>
          <CardDescription className="text-xs mt-1">
            Turning raw, messy data into high-performance training datasets with zero guesswork.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed px-6 pb-6">
          <p>
            Up to 80% of machine learning project time is spent cleaning, diagnosing, and preprocessing raw tabular data. DataReady AI automates the critical path of data preparation: providing instant quality profiling, statistical outlier detection, rule-based transformation recipes, and intelligent recommendations powered by Google Gemini.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5 space-y-2 rounded-2xl border-border/80 shadow-xs card-hover-lift">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Enterprise Security</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Multi-tenant Row Level Security (RLS), private encrypted storage buckets, and AES-256-GCM encryption for API keys.
          </p>
        </Card>

        <Card className="p-5 space-y-2 rounded-2xl border-border/80 shadow-xs card-hover-lift">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Cpu className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Deterministic ML Scoring</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Strict algorithmic evaluations of Completeness (25%), Consistency (20%), Validity (20%), Uniqueness (15%), and Feature Quality (20%).
          </p>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Code2 className="h-4 w-4" />
            </div>
            Technology Stack
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-lg text-xs font-medium border-border/80 bg-background/60">Next.js 16 (App Router)</Badge>
            <Badge variant="outline" className="rounded-lg text-xs font-medium border-border/80 bg-background/60">TypeScript 5</Badge>
            <Badge variant="outline" className="rounded-lg text-xs font-medium border-border/80 bg-background/60">Tailwind CSS 4</Badge>
            <Badge variant="outline" className="rounded-lg text-xs font-medium border-border/80 bg-background/60">Supabase PostgreSQL</Badge>
            <Badge variant="outline" className="rounded-lg text-xs font-medium border-border/80 bg-background/60">Supabase Storage</Badge>
            <Badge variant="outline" className="rounded-lg text-xs font-medium border-border/80 bg-background/60">Vercel AI SDK</Badge>
            <Badge variant="outline" className="rounded-lg text-xs font-medium border-border/80 bg-background/60">Google Gemini 1.5 Pro</Badge>
            <Badge variant="outline" className="rounded-lg text-xs font-medium border-border/80 bg-background/60">PapaParse</Badge>
            <Badge variant="outline" className="rounded-lg text-xs font-medium border-border/80 bg-background/60">SheetJS (XLSX)</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
