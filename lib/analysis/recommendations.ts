import { MissingValueStats } from './missing-values'
import { DuplicateStats } from './duplicates'
import { OutlierStats } from './outliers'
import { ColumnType } from './data-types'

export interface Recommendation {
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  problem: string;
  explanation: string;
  action: string;
}

export function generateRecommendations(
  missingStats: Record<string, MissingValueStats>,
  duplicateStats: DuplicateStats,
  outlierStats: Record<string, OutlierStats>,
  types: Record<string, ColumnType>
): Recommendation[] {
  const recommendations: Recommendation[] = []

  // 1. Missing Values
  for (const [col, stats] of Object.entries(missingStats)) {
    if (stats.missingPercentage > 50) {
      recommendations.push({
        priority: 'Critical',
        problem: `High missing values in "${col}" (${Math.round(stats.missingPercentage)}%)`,
        explanation: `Over half the rows are missing data for this column, which will confuse ML models.`,
        action: `Consider dropping the column "${col}" entirely.`
      })
    } else if (stats.missingPercentage > 10) {
      recommendations.push({
        priority: 'High',
        problem: `Missing values in "${col}" (${Math.round(stats.missingPercentage)}%)`,
        explanation: `Missing data can cause errors during model training.`,
        action: `Impute missing values using the mean/median (for numeric) or mode (for categorical), or drop rows.`
      })
    }
  }

  // 2. Duplicates
  if (duplicateStats.duplicatePercentage > 10) {
    recommendations.push({
      priority: 'High',
      problem: `${Math.round(duplicateStats.duplicatePercentage)}% Duplicate Rows`,
      explanation: `Duplicate data can cause data leakage and overfitting.`,
      action: `Remove duplicate rows to ensure clean training data.`
    })
  } else if (duplicateStats.duplicatePercentage > 0) {
    recommendations.push({
      priority: 'Medium',
      problem: `Some duplicate rows detected`,
      explanation: `There are ${duplicateStats.duplicateCount} duplicate rows in your dataset.`,
      action: `Review and remove duplicate rows if they don't represent genuinely repeated independent observations.`
    })
  }

  // 3. Outliers
  for (const [col, stats] of Object.entries(outlierStats)) {
    if (stats.outlierPercentage > 15) {
      recommendations.push({
        priority: 'High',
        problem: `Many outliers in "${col}" (${Math.round(stats.outlierPercentage)}%)`,
        explanation: `A very high number of outliers might indicate a data collection error or a highly skewed distribution.`,
        action: `Inspect the distribution. Consider a log transformation or robust scaling.`
      })
    } else if (stats.outlierPercentage > 5) {
      recommendations.push({
        priority: 'Medium',
        problem: `Outliers present in "${col}"`,
        explanation: `Outliers can skew ML models like linear regression.`,
        action: `Consider capping/clipping outliers or using tree-based models.`
      })
    }
  }

  // 4. Data Types
  const unknownCols = []
  for (const [col, type] of Object.entries(types)) {
    if (type === 'unknown' || type === 'mixed') {
      unknownCols.push(col)
    }
  }
  if (unknownCols.length > 0) {
    recommendations.push({
      priority: 'High',
      problem: `Mixed or unknown data types in columns: ${unknownCols.join(', ')}`,
      explanation: `A column should ideally have a single consistent data type for ML algorithms.`,
      action: `Clean these columns to ensure consistent typing (e.g. converting strings to numbers).`
    })
  }

  return recommendations
}
