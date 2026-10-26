import { ColumnType } from './data-types'

export interface NumericStats {
  count: number;
  missing: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  variance: number;
  q1: number;
  q3: number;
}

export interface CategoricalStats {
  total: number;
  missing: number;
  unique: number;
  mode: string | null;
}

function isMissing(val: unknown): boolean {
  if (val === null || val === undefined) return true
  if (typeof val === 'number' && isNaN(val)) return true
  if (typeof val === 'string' && val.trim() === '') return true
  return false
}

export function calculateStatistics(data: Record<string, unknown>[], columns: string[], types: Record<string, ColumnType>) {
  const stats: Record<string, NumericStats | CategoricalStats> = {}

  for (const col of columns) {
    const type = types[col]

    if (type === 'numeric') {
      const values: number[] = []
      let missing = 0

      for (const d of data) {
        const raw = d[col]
        if (isMissing(raw)) {
          missing++
        } else {
          const num = Number(raw)
          if (!isNaN(num)) {
            values.push(num)
          } else {
            missing++
          }
        }
      }
      
      if (values.length === 0) {
        stats[col] = { count: 0, missing, mean: 0, median: 0, min: 0, max: 0, stdDev: 0, variance: 0, q1: 0, q3: 0 }
        continue
      }

      values.sort((a, b) => a - b)
      
      const sum = values.reduce((a, b) => a + b, 0)
      const mean = sum / values.length
      
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
      const stdDev = Math.sqrt(variance)

      const min = values[0]
      const max = values[values.length - 1]

      const getPercentile = (p: number) => {
        const index = (values.length - 1) * p
        const lower = Math.floor(index)
        const upper = Math.ceil(index)
        const weight = index - lower
        if (upper >= values.length) return values[lower]
        return values[lower] * (1 - weight) + values[upper] * weight
      }

      const q1 = getPercentile(0.25)
      const median = getPercentile(0.5)
      const q3 = getPercentile(0.75)

      stats[col] = { count: values.length, missing, mean, median, min, max, stdDev, variance, q1, q3 }
    } else {
      // Categorical
      const values = data.map(d => d[col]).filter(v => !isMissing(v))
      const missing = data.length - values.length
      const frequencies: Record<string, number> = {}
      
      for (const val of values) {
        const strVal = String(val)
        frequencies[strVal] = (frequencies[strVal] || 0) + 1
      }

      const unique = Object.keys(frequencies).length
      
      let mode: string | null = null
      let maxFreq = 0
      for (const [key, freq] of Object.entries(frequencies)) {
        if (freq > maxFreq) {
          maxFreq = freq
          mode = key
        }
      }

      stats[col] = { total: values.length, missing, unique, mode }
    }
  }

  return stats
}
