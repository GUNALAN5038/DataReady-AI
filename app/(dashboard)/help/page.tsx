import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpCircle, Sparkles, Wand2, Database } from 'lucide-react'

export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Help &amp; Documentation</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Everything you need to know about preparing and cleaning datasets for Machine Learning with DataReady AI.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 space-y-2.5 rounded-2xl border-border/80 shadow-xs card-hover-lift relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-500" />
          <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Database className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">1. Upload Datasets</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Supports CSV, Excel (.xlsx/.xls), and JSON files up to 50MB. Raw uploads are securely stored and version-controlled.
          </p>
        </Card>

        <Card className="p-5 space-y-2.5 rounded-2xl border-border/80 shadow-xs card-hover-lift relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 to-violet-600" />
          <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Wand2 className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">2. Transform &amp; Clean</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Drop duplicate rows, impute missing values, cap outliers (IQR method), rename headers, or convert column data types safely.
          </p>
        </Card>

        <Card className="p-5 space-y-2.5 rounded-2xl border-border/80 shadow-xs card-hover-lift relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
          <div className="h-9 w-9 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">3. ML Readiness</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Automated quality scoring evaluates Completeness, Consistency, Validity, Uniqueness, and Feature Quality out of 100.
          </p>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground">
            <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <HelpCircle className="h-4 w-4" />
            </div>
            Frequently Asked Questions
          </CardTitle>
          <CardDescription className="text-xs mt-1">
            Common questions regarding dataset versioning, transformations, and security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 text-sm">
            <div className="border-b border-border/60 pb-4">
              <h4 className="font-semibold text-sm text-foreground">Will applying a transformation overwrite my original raw dataset?</h4>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                No. DataReady AI uses immutable versioning. Your original upload is preserved as Version 0. Every transformation creates an incremental version (v1, v2, v3...) while retaining full audit history and rollback capabilities.
              </p>
            </div>

            <div className="border-b border-border/60 pb-4">
              <h4 className="font-semibold text-sm text-foreground">How does Outlier Handling work?</h4>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                We use the standard Interquartile Range (IQR) method. The engine calculates Q1 (25th percentile) and Q3 (75th percentile). Any numeric point below Q1 - 1.5*IQR or above Q3 + 1.5*IQR is identified. You can choose to remove outlier rows or winsorize/cap them to the boundary values.
              </p>
            </div>

            <div className="border-b border-border/60 pb-4">
              <h4 className="font-semibold text-sm text-foreground">How is my Google Gemini API Key protected?</h4>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                Your API key is encrypted using AES-256-GCM before storage in our database. It is never rendered to the client browser in plaintext and is only decrypted in server-side API routes for generating insights.
              </p>
            </div>

            <div className="pt-1">
              <h4 className="font-semibold text-sm text-foreground">How do I export my cleaned data?</h4>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                Click the Export button at the top right of any dataset details page. You can download either the Current Transformed version or the Original file in CSV or Excel (.xlsx) format.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
