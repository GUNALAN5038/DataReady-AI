export type TransformationType =
  | 'remove_columns'
  | 'rename_columns'
  | 'drop_missing'
  | 'impute_missing'
  | 'remove_duplicates'
  | 'handle_outliers'
  | 'convert_types'

export interface TransformationConfig {
  type: TransformationType
  action?: string
  columns?: string[]
  renameMap?: Record<string, string>
  imputeStrategy?: 'mean' | 'median' | 'mode' | 'constant'
  imputeValue?: string | number
  outlierStrategy?: 'clip' | 'remove'
  typeMap?: Record<string, 'integer' | 'decimal' | 'string' | 'boolean' | 'date'>
}

export interface TransformationRecord {
  id: string
  dataset_id: string
  user_id: string
  transformation_type: string
  configuration: TransformationConfig
  previous_version: number
  new_version: number
  affected_rows?: number | null
  affected_columns?: number | null
  status: string
  created_at: string
}
