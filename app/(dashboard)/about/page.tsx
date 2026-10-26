import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, Cpu, Code2, Sparkles } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">About DataReady AI</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Automated Data Quality Assessment &amp; Machine Learning Preparation Platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Our Mission
          </CardTitle>
          <CardDescription>
            Turning raw, messy data into high-performance training datasets with zero guesswork.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Up to 80% of machine learning project time is spent cleaning, diagnosing, and preprocessing raw tabular data. DataReady AI automates the critical path of data preparation: providing instant quality profiling, statistical outlier detection, rule-based transformation recipes, and intelligent recommendations powered by Google Gemini.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-sm">Enterprise Security</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Multi-tenant Row Level Security (RLS), private encrypted storage buckets, and AES-256-GCM encryption for API keys.
          </p>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-sm">Deterministic ML Scoring</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Strict algorithmic evaluations of Completeness (25%), Consistency (20%), Validity (20%), Uniqueness (15%), and Feature Quality (20%).
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Code2 className="h-4 w-4 text-blue-600" />
            Technology Stack
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Next.js 16 (App Router)</Badge>
            <Badge variant="outline">TypeScript 5</Badge>
            <Badge variant="outline">Tailwind CSS 4</Badge>
            <Badge variant="outline">Supabase PostgreSQL</Badge>
            <Badge variant="outline">Supabase Storage</Badge>
            <Badge variant="outline">Vercel AI SDK</Badge>
            <Badge variant="outline">Google Gemini 1.5 Pro</Badge>
            <Badge variant="outline">PapaParse</Badge>
            <Badge variant="outline">SheetJS (XLSX)</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
