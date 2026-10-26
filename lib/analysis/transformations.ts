import { DatasetTransformation, TargetDataType } from '@/types/transformations'

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

export function applyTransformations(
  data: Record<string, unknown>[],
  columns: string[],
  transformations: DatasetTransformation[]
): TransformationOutcome {
  let currentData = [...data]
  let currentColumns = [...columns]
  let totalAffectedRows = 0
  let totalAffectedColumns = 0

  for (const transform of transformations) {
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
        const { column, method, customValue } = transform
        if (!currentColumns.includes(column)) {
          throw new Error(`Column "${column}" does not exist in dataset.`)
        }

        if (method === 'drop_row') {
          const initialLength = currentData.length
          currentData = currentData.filter(row => !isMissingValue(row[column]))
          totalAffectedRows += (initialLength - currentData.length)
          break
        }

        let computedFillValue: unknown = customValue

        if (method === 'mean' || method === 'median') {
          const numericVals: number[] = []
          for (const row of currentData) {
            const val = row[column]
            if (!isMissingValue(val)) {
              const num = Number(val)
              if (!isNaN(num)) {
                numericVals.push(num)
              }
            }
          }

          if (numericVals.length === 0) {
            throw new Error(`Cannot compute ${method} for column "${column}" because it contains no valid numeric values.`)
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
            const val = row[column]
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
            throw new Error(`Cannot compute mode for column "${column}" because all values are missing.`)
          }
          computedFillValue = modeRawValue
        }

        let affected = 0
        currentData = currentData.map(row => {
          if (isMissingValue(row[column])) {
            affected++
            return { ...row, [column]: computedFillValue }
          }
          return row
        })
        totalAffectedRows += affected
        break
      }

      case 'handle_outliers': {
        const { column, method } = transform
        if (!currentColumns.includes(column)) {
          throw new Error(`Column "${column}" does not exist in dataset.`)
        }

        const numericVals: number[] = []
        for (const row of currentData) {
          const val = row[column]
          if (!isMissingValue(val)) {
            const num = Number(val)
            if (!isNaN(num)) {
              numericVals.push(num)
            }
          }
        }

        if (numericVals.length === 0) {
          throw new Error(`Column "${column}" contains no numeric values for outlier calculation.`)
        }

        const bounds = calculateIQRBounds(numericVals)
        if (!bounds) break

        const { lowerBound, upperBound } = bounds

        if (method === 'remove') {
          const initialLength = currentData.length
          currentData = currentData.filter(row => {
            const val = row[column]
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
            const val = row[column]
            if (isMissingValue(val)) return row
            const num = Number(val)
            if (isNaN(num)) return row

            if (num < lowerBound) {
              cappedCount++
              return { ...row, [column]: lowerBound }
            } else if (num > upperBound) {
              cappedCount++
              return { ...row, [column]: upperBound }
            }
            return row
          })
          totalAffectedRows += cappedCount
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
