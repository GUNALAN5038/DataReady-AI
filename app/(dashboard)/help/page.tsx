import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpCircle, Sparkles, Wand2, Database } from 'lucide-react'

export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Help &amp; Documentation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everything you need to know about preparing and cleaning datasets for Machine Learning with DataReady AI.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 space-y-2">
          <Database className="h-6 w-6 text-blue-600" />
          <h3 className="font-semibold text-sm">1. Upload Datasets</h3>
          <p className="text-xs text-muted-foreground">
            Supports CSV, Excel (.xlsx/.xls), and JSON files up to 50MB. Raw uploads are securely stored and version-controlled.
          </p>
        </Card>

        <Card className="p-4 space-y-2">
          <Wand2 className="h-6 w-6 text-purple-600" />
          <h3 className="font-semibold text-sm">2. Transform &amp; Clean</h3>
          <p className="text-xs text-muted-foreground">
            Drop duplicate rows, impute missing values, cap outliers (IQR method), rename headers, or convert column data types safely.
          </p>
        </Card>

        <Card className="p-4 space-y-2">
          <Sparkles className="h-6 w-6 text-emerald-600" />
          <h3 className="font-semibold text-sm">3. ML Readiness</h3>
          <p className="text-xs text-muted-foreground">
            Automated quality scoring evaluates Completeness, Consistency, Validity, Uniqueness, and Feature Quality out of 100.
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-purple-600" />
            Frequently Asked Questions
          </CardTitle>
          <CardDescription>
            Common questions regarding dataset versioning, transformations, and security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 text-sm">
            <div className="border-b pb-3">
              <h4 className="font-semibold text-foreground">Will applying a transformation overwrite my original raw dataset?</h4>
              <p className="text-muted-foreground mt-1 text-xs">
                No. DataReady AI uses immutable versioning. Your original upload is preserved as Version 0. Every transformation creates an incremental version (v1, v2, v3...) while retaining full audit history and rollback capabilities.
              </p>
            </div>

            <div className="border-b pb-3">
              <h4 className="font-semibold text-foreground">How does Outlier Handling work?</h4>
              <p className="text-muted-foreground mt-1 text-xs">
                We use the standard Interquartile Range (IQR) method. The engine calculates Q1 (25th percentile) and Q3 (75th percentile). Any numeric point below Q1 - 1.5*IQR or above Q3 + 1.5*IQR is identified. You can choose to remove outlier rows or winsorize/cap them to the boundary values.
              </p>
            </div>

            <div className="border-b pb-3">
              <h4 className="font-semibold text-foreground">How is my Google Gemini API Key protected?</h4>
              <p className="text-muted-foreground mt-1 text-xs">
                Your API key is encrypted using AES-256-GCM before storage in our database. It is never rendered to the client browser in plaintext and is only decrypted in server-side API routes for generating insights.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">How do I export my cleaned data?</h4>
              <p className="text-muted-foreground mt-1 text-xs">
                Click the Export button at the top right of any dataset details page. You can download either the Current Transformed version or the Original file in CSV or Excel (.xlsx) format.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
