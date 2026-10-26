import { ColumnType } from './data-types'

export interface OutlierStats {
  outlierCount: number;
  outlierPercentage: number;
  lowerBound: number;
  upperBound: number;
  outlierIndices: number[];
}

function isMissing(val: unknown): boolean {
  if (val === null || val === undefined) return true
  if (typeof val === 'number' && isNaN(val)) return true
  if (typeof val === 'string' && val.trim() === '') return true
  return false
}

export function detectOutliers(data: Record<string, unknown>[], columns: string[], types: Record<string, ColumnType>): Record<string, OutlierStats> {
  const stats: Record<string, OutlierStats> = {}

  if (!data || data.length === 0) return stats

  for (const col of columns) {
    if (types[col] === 'numeric') {
      const numericData: { val: number; index: number }[] = []
      for (let i = 0; i < data.length; i++) {
        const raw = data[i][col]
        if (!isMissing(raw)) {
          const num = Number(raw)
          if (!isNaN(num)) {
            numericData.push({ val: num, index: i })
          }
        }
      }
      
      if (numericData.length === 0) continue

      numericData.sort((a, b) => a.val - b.val)

      const getPercentile = (p: number) => {
        const idx = (numericData.length - 1) * p
        const lower = Math.floor(idx)
        const upper = Math.ceil(idx)
        const weight = idx - lower
        if (upper >= numericData.length) return numericData[lower].val
        return numericData[lower].val * (1 - weight) + numericData[upper].val * weight
      }

      const q1 = getPercentile(0.25)
      const q3 = getPercentile(0.75)
      const iqr = q3 - q1
      
      const lowerBound = q1 - 1.5 * iqr
      const upperBound = q3 + 1.5 * iqr

      const outliers = numericData.filter(d => d.val < lowerBound || d.val > upperBound)
      
      stats[col] = {
        outlierCount: outliers.length,
        outlierPercentage: (outliers.length / data.length) * 100,
        lowerBound,
        upperBound,
        outlierIndices: outliers.map(o => o.index)
      }
    }
  }

  return stats
}
