export interface ColumnStatistics {
  count: number
  mean?: number
  median?: number
  stdDev?: number
  variance?: number
  min?: number
  max?: number
  q25?: number
  q75?: number
  iqr?: number
  mode?: unknown[]
  missing: number
  unique: number
}

export interface MissingValueAnalysis {
  column: string
  missingCount: number
  missingPercentage: number
  type: string
}

export interface DuplicateAnalysis {
  duplicateRowCount: number
  duplicatePercentage: number
  totalRows: number
}

export interface OutlierAnalysis {
  column: string
  outlierCount: number
  outlierPercentage: number
  lowerBound: number
  upperBound: number
}

export interface MLReadinessScore {
  overallScore: number
  category: 'poor' | 'fair' | 'good' | 'excellent'
  components: {
    missingValueScore: number
    duplicateScore: number
    outlierScore: number
    typeConsistencyScore: number
    volumeScore: number
  }
}

export interface Recommendation {
  id: string
  type: 'missing_values' | 'duplicates' | 'outliers' | 'data_types' | 'general'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  actionableStep: string
  impact: string
}

export interface AnalysisResults {
  types?: Record<string, string>
  missingValues?: {
    totalMissing: number
    totalCells: number
    overallPercentage: number
    columns: MissingValueAnalysis[]
  }
  stats?: Record<string, ColumnStatistics>
  duplicates?: DuplicateAnalysis
  outliers?: {
    totalOutliers: number
    columns: OutlierAnalysis[]
  }
  mlReadiness?: MLReadinessScore
}

export interface AnalysisRecord {
  id: string
  dataset_id: string
  user_id: string
  analysis_type: string
  dataset_version: number
  results: AnalysisResults
  summary?: Record<string, ColumnStatistics> | null
  ml_readiness_score?: number | null
  recommendations?: Recommendation[] | null
  processing_duration_ms?: number | null
  created_at: string
}
