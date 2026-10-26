export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface AIDatasetSummary {
  overview?: string
  dataset_overview: string
  quality_overview: string
  ml_readiness_overview: string
  strengths: string[]
  weaknesses: string[]
}

export interface AIScoreComponent {
  score: number
  explanation: string
}

export interface AIScoreBreakdown {
  completeness: AIScoreComponent
  consistency: AIScoreComponent
  validity: AIScoreComponent
  uniqueness: AIScoreComponent
  feature_quality: AIScoreComponent
}

export interface AIKeyFinding {
  title: string
  explanation: string
  severity: SeverityLevel
}

export interface AIAnomaly {
  column: string
  description: string
  severity: SeverityLevel
  why_it_matters: string
  suggested_action: string
}

export interface AITransformationSuggestion {
  action: 'drop_duplicates' | 'drop_missing' | 'fill_missing' | 'drop_column' | 'rename_column' | 'handle_outliers' | 'convert_type' | 'none'
  columns?: string[]
  column?: string
  method?: 'mean' | 'median' | 'mode' | 'custom' | 'remove' | 'cap' | 'drop_row'
  customValue?: string | number | boolean
  newName?: string
  targetType?: 'string' | 'integer' | 'float' | 'boolean' | 'date'
  is_supported: boolean
  button_label?: string
}

export interface AISmartRecommendation {
  title: string
  priority: PriorityLevel
  problem: string
  action: string
  reason: string
  transformation_suggestion?: AITransformationSuggestion
}

export interface AIMLReadinessExplanation {
  assessment: string
  score_driver: string
  blocking_issues: string[]
  recommended_actions: string[]
}

export interface AIInsightsResponse {
  summary: AIDatasetSummary
  score_breakdown: AIScoreBreakdown
  key_findings: AIKeyFinding[]
  anomalies: AIAnomaly[]
  recommendations: AISmartRecommendation[]
  ml_readiness: AIMLReadinessExplanation
}
