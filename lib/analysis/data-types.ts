export type ColumnType = 'numeric' | 'string' | 'boolean' | 'date' | 'mixed' | 'unknown'

export function inferColumnTypes(data: Record<string, unknown>[], columns: string[]): Record<string, ColumnType> {
  const types: Record<string, ColumnType> = {}
  
  if (!data || data.length === 0) {
    columns.forEach(c => types[c] = 'unknown')
    return types
  }

  for (const col of columns) {
    let isNumeric = true
    let isBoolean = true
    let isDate = true
    
    let hasValues = false

    for (let i = 0; i < Math.min(data.length, 1000); i++) {
      const val = data[i][col]
      if (val === null || val === undefined || val === '') continue

      hasValues = true
      const strVal = String(val).trim()

      // Numeric check
      if (isNaN(Number(strVal))) {
        isNumeric = false
      }

      // Boolean check
      const lower = strVal.toLowerCase()
      if (lower !== 'true' && lower !== 'false' && lower !== '1' && lower !== '0' && lower !== 'yes' && lower !== 'no') {
        isBoolean = false
      }

      // Date check
      if (isNaN(Date.parse(strVal)) || strVal.length < 5) {
        isDate = false
      }
    }

    if (!hasValues) {
      types[col] = 'unknown'
    } else if (isBoolean) {
      types[col] = 'boolean'
    } else if (isNumeric) {
      types[col] = 'numeric'
    } else if (isDate) {
      types[col] = 'date'
    } else {
      types[col] = 'string'
    }
  }

  return types
}
