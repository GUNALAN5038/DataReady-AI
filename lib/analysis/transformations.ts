import { DatasetTransformation, TargetDataType, FillMissingMethod } from '@/types/transformations'

export interface TransformationOutcome {
  data: Record<string, unknown>[]
  columns: string[]
  affectedRows: number
  affectedColumns: number
}

/**
 * Calculates Q1, Q3, and IQR lower/upper bounds using the exact same algorithm
 * as lib/analysis/outliers.ts for consistency across the entire application.
 */
export function calculateIQRBounds(values: number[]): { lowerBound: number; upperBound: number; q1: number; q3: number; iqr: number } | null {
  if (values.length === 0) return null

  const sorted = [...values].sort((a, b) => a - b)

  const getPercentile = (p: number) => {
    const idx = (sorted.length - 1) * p
    const lower = Math.floor(idx)
    const upper = Math.ceil(idx)
    const weight = idx - lower
    if (upper >= sorted.length) return sorted[lower]
    return sorted[lower] * (1 - weight) + sorted[upper] * weight
  }

  const q1 = getPercentile(0.25)
  const q3 = getPercentile(0.75)
  const iqr = q3 - q1
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr

  return { lowerBound, upperBound, q1, q3, iqr }
}

function isMissingValue(val: unknown): boolean {
  if (val === null || val === undefined) return true
  if (typeof val === 'number' && isNaN(val)) return true
  if (typeof val === 'string' && val.trim() === '') return true
  return false
}

/**
 * Normalizes any transformation input into canonical DatasetTransformation format.
 * Resolves action name aliases (e.g., remove_duplicates -> drop_duplicates, impute_missing -> fill_missing)
 * and bridges mobile/web property naming differences.
 * Throws explicit, actionable errors if action is undefined or unrecognized.
 */
export function normalizeTransformation(raw: unknown): DatasetTransformation {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid transformation item: expected an object with an "action" property.')
  }

  const rec = raw as Record<string, unknown>
  const rawAction = rec.action ?? rec.type ?? rec.transformation_type

  if (rawAction === undefined || rawAction === null || String(rawAction).trim() === '') {
    throw new Error('Transformation action is undefined. Each transformation must specify a valid "action" property (e.g., drop_column, drop_duplicates, drop_missing, fill_missing, handle_outliers, rename_column, convert_type).')
  }

  const actionStr = String(rawAction).trim().toLowerCase()

  // 1. Drop / Remove Duplicates
  if (
    actionStr === 'drop_duplicates' ||
    actionStr === 'remove_duplicates' ||
    actionStr === 'delete_duplicates' ||
    actionStr === 'deduplicate'
  ) {
    const columns = (rec.columns as 'all' | string[]) || 'all'
    return {
      action: 'drop_duplicates',
      columns,
    }
  }

  // 2. Drop / Remove Missing Rows
  if (
    actionStr === 'drop_missing' ||
    actionStr === 'remove_missing' ||
    actionStr === 'drop_missing_rows' ||
    actionStr === 'delete_missing'
  ) {
    let columns = rec.columns
    if (!columns && rec.column && typeof rec.column === 'string') {
      columns = [rec.column]
    }
    return {
      action: 'drop_missing',
      columns: (columns as 'all' | string[]) || 'all',
    }
  }

  // 3. Drop / Remove Column(s)
  if (
    actionStr === 'drop_column' ||
    actionStr === 'drop_columns' ||
    actionStr === 'remove_column' ||
    actionStr === 'remove_columns' ||
    actionStr === 'delete_column' ||
    actionStr === 'delete_columns'
  ) {
    let cols: string[] = []
    if (Array.isArray(rec.columns)) {
      cols = rec.columns.map(String)
    } else if (typeof rec.column === 'string' && rec.column.trim()) {
      cols = [rec.column.trim()]
    }
    if (cols.length === 0) {
      throw new Error('drop_column transformation requires at least one column specified in "columns" or "column".')
    }
    return {
      action: 'drop_column',
      columns: cols,
    }
  }

  // 4. Fill / Impute Missing
  if (
    actionStr === 'fill_missing' ||
    actionStr === 'impute_missing' ||
    actionStr === 'impute' ||
    actionStr === 'fill'
  ) {
    const rawMethod = (rec.method ?? rec.imputeStrategy ?? 'mean').toString().toLowerCase()
    let method: FillMissingMethod = 'mean'
    if (rawMethod === 'median') method = 'median'
    else if (rawMethod === 'mode') method = 'mode'
    else if (rawMethod === 'custom' || rawMethod === 'constant') method = 'custom'
    else if (rawMethod === 'drop_row' || rawMethod === 'drop') method = 'drop_row'

    const col = (rec.column ?? '').toString().trim()
    return {
      action: 'fill_missing',
      column: col,
      method,
      customValue: (rec.customValue ?? rec.imputeValue) as string | number | boolean | undefined,
    }
  }

  // 5. Handle Outliers (IQR)
  if (
    actionStr === 'handle_outliers' ||
    actionStr === 'handle_outlier' ||
    actionStr === 'outliers' ||
    actionStr === 'clip_outliers'
  ) {
    const rawMethod = (rec.method ?? rec.outlierStrategy ?? 'remove').toString().toLowerCase()
    const method: 'remove' | 'cap' = (rawMethod === 'cap' || rawMethod === 'clip' || rawMethod === 'winsorize') ? 'cap' : 'remove'
    const col = (rec.column ?? '').toString().trim()
    return {
      action: 'handle_outliers',
      column: col,
      method,
    }
  }

  // 6. Rename Column
  if (
    actionStr === 'rename_column' ||
    actionStr === 'rename_columns' ||
    actionStr === 'rename'
  ) {
    let col = (rec.column ?? '').toString().trim()
    let newCol = (rec.newName ?? rec.new_name ?? rec.newColumnName ?? '').toString().trim()

    if (!col && rec.renameMap && typeof rec.renameMap === 'object') {
      const entries = Object.entries(rec.renameMap as Record<string, string>)
      if (entries.length > 0) {
        col = entries[0][0]
        newCol = entries[0][1]
      }
    }

    if (!col || !newCol) {
      throw new Error('rename_column transformation requires both "column" and "newName".')
    }

    return {
      action: 'rename_column',
      column: col,
      newName: newCol,
    }
  }

  // 7. Convert Data Type
  if (
    actionStr === 'convert_type' ||
    actionStr === 'convert_types' ||
    actionStr === 'cast_type' ||
    actionStr === 'change_type'
  ) {
    let col = (rec.column ?? '').toString().trim()
    let rawType = (rec.targetType ?? rec.target_type ?? 'string').toString().toLowerCase()

    if (!col && rec.typeMap && typeof rec.typeMap === 'object') {
      const entries = Object.entries(rec.typeMap as Record<string, string>)
      if (entries.length > 0) {
        col = entries[0][0]
        rawType = entries[0][1].toString().toLowerCase()
      }
    }

    let targetType: TargetDataType = 'string'
    if (rawType.includes('int')) targetType = 'integer'
    else if (rawType.includes('float') || rawType.includes('dec') || rawType.includes('num')) targetType = 'float'
    else if (rawType.includes('bool')) targetType = 'boolean'
    else if (rawType.includes('date') || rawType.includes('time')) targetType = 'date'
    else targetType = 'string'

    if (!col) {
      throw new Error('convert_type transformation requires a "column" to convert.')
    }

    return {
      action: 'convert_type',
      column: col,
      targetType,
    }
  }

  // 8. Drop Rows by Indices
  if (
    actionStr === 'drop_rows_indices' ||
    actionStr === 'drop_rows' ||
    actionStr === 'drop_indices'
  ) {
    const indices = Array.isArray(rec.indices) ? rec.indices.map(Number) : []
    return {
      action: 'drop_rows_indices',
      indices,
    }
  }

  throw new Error(`Unsupported transformation action: "${actionStr}". Supported actions are: drop_column, rename_column, drop_duplicates, drop_missing, fill_missing, handle_outliers, convert_type, drop_rows_indices.`)
}

export function applyTransformations(
  data: Record<string, unknown>[],
  columns: string[],
  transformations: (DatasetTransformation | Record<string, unknown>)[]
): TransformationOutcome {
  let currentData = [...data]
  let currentColumns = [...columns]
  let totalAffectedRows = 0
  let totalAffectedColumns = 0

  if (!transformations || !Array.isArray(transformations) || transformations.length === 0) {
    return {
      data: currentData,
      columns: currentColumns,
      affectedRows: 0,
      affectedColumns: 0,
    }
  }

  const normalizedTransforms = transformations.map(normalizeTransformation)

  for (const transform of normalizedTransforms) {
    switch (transform.action) {
      case 'drop_column': {
        const colsToDrop = new Set(transform.columns)
        if (currentColumns.every(c => colsToDrop.has(c))) {
          throw new Error('Cannot remove all columns from the dataset. At least one column must remain.')
        }

        const initialColCount = currentColumns.length
        currentColumns = currentColumns.filter(c => !colsToDrop.has(c))
        const droppedCount = initialColCount - currentColumns.length

        if (droppedCount > 0) {
          currentData = currentData.map(row => {
            const newRow = { ...row }
            transform.columns.forEach(c => {
              delete newRow[c]
            })
            return newRow
          })
          totalAffectedColumns += droppedCount
        }
        break
      }

      case 'drop_missing': {
        const initialLength = currentData.length
        if (Array.isArray(transform.columns)) {
          for (const col of transform.columns) {
            if (!currentColumns.includes(col)) {
              throw new Error(`Column "${col}" does not exist in dataset.`)
            }
          }
        }
        const colsToCheck = transform.columns === 'all' ? currentColumns : transform.columns

        currentData = currentData.filter(row => {
          for (const col of colsToCheck) {
            if (isMissingValue(row[col])) {
              return false
            }
          }
          return true
        })

        const removedCount = initialLength - currentData.length
        totalAffectedRows += removedCount
        break
      }

      case 'drop_duplicates': {
        const initialLength = currentData.length
        if (Array.isArray(transform.columns)) {
          for (const col of transform.columns) {
            if (!currentColumns.includes(col)) {
              throw new Error(`Column "${col}" does not exist in dataset.`)
            }
          }
        }
        const colsToCheck = (!transform.columns || transform.columns === 'all')
          ? currentColumns
          : transform.columns

        const seen = new Set<string>()
        currentData = currentData.filter(row => {
          const signature = colsToCheck.map(col => {
            const v = row[col]
            return v === null || v === undefined ? '__NULL__' : String(v)
          }).join('###DATAREADY_SEP###')

          if (seen.has(signature)) {
            return false
          }
          seen.add(signature)
          return true
        })

        const removedCount = initialLength - currentData.length
        totalAffectedRows += removedCount
        break
      }

      case 'drop_rows_indices': {
        const initialLength = currentData.length
        const indexSet = new Set(transform.indices)

        currentData = currentData.filter((_, idx) => !indexSet.has(idx))
        const removedCount = initialLength - currentData.length
        totalAffectedRows += removedCount
        break
      }

      case 'fill_missing': {
        const { method, customValue } = transform
        const targetCols = transform.column
          ? [transform.column]
          : currentColumns.filter(c => currentData.some(r => isMissingValue(r[c])))

        if (transform.column && !currentColumns.includes(transform.column)) {
          throw new Error(`Column "${transform.column}" does not exist in dataset.`)
        }

        for (const col of targetCols) {
          if (method === 'drop_row') {
            const initialLength = currentData.length
            currentData = currentData.filter(row => !isMissingValue(row[col]))
            totalAffectedRows += (initialLength - currentData.length)
            continue
          }

          let computedFillValue: unknown = customValue

          if (method === 'mean' || method === 'median') {
            const numericVals: number[] = []
            for (const row of currentData) {
              const val = row[col]
              if (!isMissingValue(val)) {
                const num = Number(val)
                if (!isNaN(num) && isFinite(num)) {
                  numericVals.push(num)
                }
              }
            }

            if (numericVals.length === 0) {
              if (transform.column) {
                throw new Error(`Cannot compute ${method} for column "${col}" because it contains no valid numeric values.`)
              }
              continue
            }

            if (method === 'mean') {
              const sum = numericVals.reduce((a, b) => a + b, 0)
              computedFillValue = sum / numericVals.length
            } else {
              numericVals.sort((a, b) => a - b)
              const mid = Math.floor(numericVals.length / 2)
              computedFillValue = numericVals.length % 2 !== 0
                ? numericVals[mid]
                : (numericVals[mid - 1] + numericVals[mid]) / 2
            }
          } else if (method === 'mode') {
            const counts: Record<string, { count: number; rawValue: unknown }> = {}
            let maxCount = 0
            let modeRawValue: unknown = null

            for (const row of currentData) {
              const val = row[col]
              if (!isMissingValue(val)) {
                const str = String(val)
                if (!counts[str]) {
                  counts[str] = { count: 1, rawValue: val }
                } else {
                  counts[str].count++
                }
                if (counts[str].count > maxCount) {
                  maxCount = counts[str].count
                  modeRawValue = counts[str].rawValue
                }
              }
            }

            if (maxCount === 0) {
              if (transform.column) {
                throw new Error(`Cannot compute mode for column "${col}" because all values are missing.`)
              }
              continue
            }
            computedFillValue = modeRawValue
          }

          let affected = 0
          currentData = currentData.map(row => {
            if (isMissingValue(row[col])) {
              affected++
              return { ...row, [col]: computedFillValue }
            }
            return row
          })
          totalAffectedRows += affected
        }
        break
      }

      case 'handle_outliers': {
        const { method } = transform
        const targetCols = transform.column
          ? [transform.column]
          : currentColumns.filter(c => {
              const numVals = currentData.map(r => Number(r[c])).filter(n => !isNaN(n) && isFinite(n))
              return numVals.length >= 4 && calculateIQRBounds(numVals) !== null
            })

        if (transform.column && !currentColumns.includes(transform.column)) {
          throw new Error(`Column "${transform.column}" does not exist in dataset.`)
        }

        for (const col of targetCols) {
          const numericVals: number[] = []
          for (const row of currentData) {
            const val = row[col]
            if (!isMissingValue(val)) {
              const num = Number(val)
              if (!isNaN(num) && isFinite(num)) {
                numericVals.push(num)
              }
            }
          }

          if (numericVals.length === 0) {
            if (transform.column) {
              throw new Error(`Column "${col}" contains no numeric values for outlier calculation.`)
            }
            continue
          }

          const bounds = calculateIQRBounds(numericVals)
          if (!bounds) continue

          const { lowerBound, upperBound } = bounds

          if (method === 'remove') {
            const initialLength = currentData.length
            currentData = currentData.filter(row => {
              const val = row[col]
              if (isMissingValue(val)) return true
              const num = Number(val)
              if (isNaN(num)) return true
              return num >= lowerBound && num <= upperBound
            })
            const removed = initialLength - currentData.length
            totalAffectedRows += removed
          } else if (method === 'cap') {
            let cappedCount = 0
            currentData = currentData.map(row => {
              const val = row[col]
              if (isMissingValue(val)) return row
              const num = Number(val)
              if (isNaN(num)) return row

              if (num < lowerBound) {
                cappedCount++
                return { ...row, [col]: lowerBound }
              } else if (num > upperBound) {
                cappedCount++
                return { ...row, [col]: upperBound }
              }
              return row
            })
            totalAffectedRows += cappedCount
          }
        }
        break
      }

      case 'rename_column': {
        const { column, newName } = transform
        const trimmedNewName = newName.trim()

        if (!trimmedNewName) {
          throw new Error('New column name cannot be empty.')
        }

        if (!currentColumns.includes(column)) {
          throw new Error(`Column "${column}" does not exist in the dataset.`)
        }

        if (trimmedNewName !== column && currentColumns.includes(trimmedNewName)) {
          throw new Error(`Column "${trimmedNewName}" already exists. Column names must be unique.`)
        }

        currentColumns = currentColumns.map(c => (c === column ? trimmedNewName : c))
        currentData = currentData.map(row => {
          const newRow = { ...row }
          if (column in newRow) {
            newRow[trimmedNewName] = newRow[column]
            delete newRow[column]
          }
          return newRow
        })
        totalAffectedColumns += 1
        break
      }

      case 'convert_type': {
        const { column, targetType } = transform
        if (!currentColumns.includes(column)) {
          throw new Error(`Column "${column}" does not exist in dataset.`)
        }

        let failedConversions = 0
        let nonMissingCount = 0

        const convertedData = currentData.map(row => {
          const val = row[column]
          if (isMissingValue(val)) {
            return row
          }

          nonMissingCount++
          const converted = convertValue(val, targetType)
          if (converted.error) {
            failedConversions++
            return row
          }
          return { ...row, [column]: converted.value }
        })

        if (nonMissingCount > 0 && failedConversions / nonMissingCount > 0.4) {
          throw new Error(
            `Type conversion to "${targetType}" failed for ${failedConversions} out of ${nonMissingCount} values in column "${column}". Operation cancelled to avoid data corruption.`
          )
        }

        currentData = convertedData
        totalAffectedRows += (nonMissingCount - failedConversions)
        break
      }

      default:
        throw new Error(`Unsupported transformation action: ${(transform as { action: string }).action}`)
    }
  }

  return {
    data: currentData,
    columns: currentColumns,
    affectedRows: totalAffectedRows,
    affectedColumns: totalAffectedColumns
  }
}

function convertValue(val: unknown, targetType: TargetDataType): { value?: unknown; error?: boolean } {
  const str = String(val).trim()

  switch (targetType) {
    case 'string':
      return { value: str }

    case 'integer': {
      const num = Number(str)
      if (isNaN(num)) return { error: true }
      return { value: Math.round(num) }
    }

    case 'float': {
      const num = Number(str)
      if (isNaN(num)) return { error: true }
      return { value: num }
    }

    case 'boolean': {
      const lower = str.toLowerCase()
      if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 't') return { value: true }
      if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'f') return { value: false }
      return { error: true }
    }

    case 'date': {
      const timestamp = Date.parse(str)
      if (isNaN(timestamp)) return { error: true }
      return { value: new Date(timestamp).toISOString() }
    }

    default:
      return { error: true }
  }
}
