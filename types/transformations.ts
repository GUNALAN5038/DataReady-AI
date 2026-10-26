export type DropColumnTransform = {
  action: 'drop_column'
  columns: string[]
}

export type DropMissingTransform = {
  action: 'drop_missing'
  columns: 'all' | string[]
}

export type DropDuplicatesTransform = {
  action: 'drop_duplicates'
  columns?: 'all' | string[] // defaults to all
}

export type DropRowsIndicesTransform = {
  action: 'drop_rows_indices'
  indices: number[] // 0-indexed row indices
}

export type FillMissingMethod = 'mean' | 'median' | 'mode' | 'custom' | 'drop_row'

export type FillMissingTransform = {
  action: 'fill_missing'
  column: string
  method: FillMissingMethod
  customValue?: string | number | boolean
}

export type HandleOutliersTransform = {
  action: 'handle_outliers'
  column: string
  method: 'remove' | 'cap' // remove outlier rows or winsorize/cap to IQR bounds
}

export type RenameColumnTransform = {
  action: 'rename_column'
  column: string
  newName: string
}

export type TargetDataType = 'string' | 'integer' | 'float' | 'boolean' | 'date'

export type ConvertTypeTransform = {
  action: 'convert_type'
  column: string
  targetType: TargetDataType
}

export type DatasetTransformation = 
  | DropColumnTransform
  | DropMissingTransform
  | DropDuplicatesTransform
  | DropRowsIndicesTransform
  | FillMissingTransform
  | HandleOutliersTransform
  | RenameColumnTransform
  | ConvertTypeTransform

export type TransformationRequest = {
  transformations: DatasetTransformation[]
}

export type TransformationResult = {
  success: boolean
  message?: string
  rowsBefore: number
  rowsAfter: number
  affectedRows: number
  affectedColumns: number
  newVersion?: number
}

export type TransformationPreviewResult = {
  success: boolean
  rowsBefore: number
  rowsAfter: number
  columnsBefore: number
  columnsAfter: number
  missingValuesBefore: number
  missingValuesAfter: number
  duplicatesBefore: number
  duplicatesAfter: number
  affectedRows: number
  affectedColumns: number
  samplePreview: Record<string, unknown>[]
  columns: string[]
  warning?: string
}
