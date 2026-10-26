export interface MissingValueStats {
  missingCount: number;
  missingPercentage: number;
  totalRows: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function analyzeMissingValues(data: Record<string, unknown>[], columns: string[]): Record<string, MissingValueStats> {
  const stats: Record<string, MissingValueStats> = {}
  const totalRows = data.length

  if (totalRows === 0) {
    return stats
  }

  for (const col of columns) {
    let missingCount = 0

    for (let i = 0; i < totalRows; i++) {
      const val = data[i][col]
      if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '') || Number.isNaN(val as unknown)) {
        missingCount++
      }
    }

    const missingPercentage = (missingCount / totalRows) * 100
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
    
    if (missingPercentage > 50) severity = 'critical'
    else if (missingPercentage > 20) severity = 'high'
    else if (missingPercentage > 5) severity = 'medium'

    stats[col] = {
      missingCount,
      missingPercentage,
      totalRows,
      severity
    }
  }

  return stats
}
