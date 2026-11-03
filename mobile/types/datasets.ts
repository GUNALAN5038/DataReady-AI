export type DatasetStatus = 'uploading' | 'uploaded' | 'processing' | 'analyzed' | 'failed'

export interface ColumnMetadata {
  name: string
  type: string
  missingCount?: number
  uniqueCount?: number
}

export interface Dataset {
  id: string
  user_id: string
  name: string
  description?: string | null
  file_name: string
  original_file_path: string
  current_file_path?: string | null
  current_version?: number
  file_type: string
  file_size: number
  row_count: number
  column_count: number
  column_metadata?: ColumnMetadata[] | null
  sample_data?: Record<string, unknown>[] | null
  status: DatasetStatus
  processing_error?: string | null
  created_at: string
  updated_at: string
}

export interface DatasetSummary {
  totalDatasets: number
  analyzedDatasets: number
  totalRows: number
  avgQualityScore?: number
  avgMlReadiness?: number
}
