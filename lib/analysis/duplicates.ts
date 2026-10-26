export interface DuplicateStats {
  totalRows: number;
  uniqueRows: number;
  duplicateCount: number;
  duplicatePercentage: number;
  duplicateIndices: number[];
}

export function detectDuplicates(data: Record<string, unknown>[]): DuplicateStats {
  const seen = new Set<string>()
  const duplicateIndices: number[] = []
  
  if (!data || data.length === 0) {
    return {
      totalRows: 0,
      uniqueRows: 0,
      duplicateCount: 0,
      duplicatePercentage: 0,
      duplicateIndices: []
    }
  }

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const sortedKeys = Object.keys(row || {}).sort()
    const rowString = JSON.stringify(row, sortedKeys)
    if (seen.has(rowString)) {
      duplicateIndices.push(i)
    } else {
      seen.add(rowString)
    }
  }

  const duplicateCount = duplicateIndices.length
  const uniqueRows = seen.size
  const totalRows = data.length
  const duplicatePercentage = (duplicateCount / totalRows) * 100

  return {
    totalRows,
    uniqueRows,
    duplicateCount,
    duplicatePercentage,
    duplicateIndices
  }
}
