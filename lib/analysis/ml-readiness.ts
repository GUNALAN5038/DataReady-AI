import { MissingValueStats } from './missing-values'
import { DuplicateStats } from './duplicates'
import { OutlierStats } from './outliers'
import { ColumnType } from './data-types'

export interface MLReadinessScore {
  overallScore: number;
  category: 'Poor' | 'Needs Improvement' | 'Fair' | 'Good' | 'Excellent';
  components: {
    completeness: number; // 25%
    consistency: number; // 20%
    validity: number; // 20%
    uniqueness: number; // 15%
    featureQuality: number; // 20%
  };
}

export function calculateMLReadiness(
  missingStats: Record<string, MissingValueStats>,
  duplicateStats: DuplicateStats,
  outlierStats: Record<string, OutlierStats>,
  types: Record<string, ColumnType>,
  totalRows: number,
  colCount: number
): MLReadinessScore {
  
  if (totalRows === 0 || colCount === 0) {
    return {
      overallScore: 0,
      category: 'Poor',
      components: { completeness: 0, consistency: 0, validity: 0, uniqueness: 0, featureQuality: 0 }
    }
  }

  // 1. Completeness (25%)
  // Penalty for missing values across all columns
  let totalMissingPercentage = 0;
  for (const col in missingStats) {
    totalMissingPercentage += missingStats[col].missingPercentage;
  }
  const avgMissingPercentage = colCount > 0 ? totalMissingPercentage / colCount : 0;
  // 0% missing = 100 score, 50% missing = 0 score
  const completeness = Math.max(0, 100 - (avgMissingPercentage * 2));

  // 2. Uniqueness (15%)
  // Penalty for duplicate rows
  const duplicatePercentage = duplicateStats.duplicatePercentage;
  const uniqueness = Math.max(0, 100 - (duplicatePercentage * 5)); // 20% duplicates = 0 score

  // 3. Validity (20%)
  // Penalty for outliers
  let totalOutlierPercentage = 0;
  let numericColCount = 0;
  for (const col in outlierStats) {
    numericColCount++;
    totalOutlierPercentage += outlierStats[col].outlierPercentage;
  }
  const avgOutlierPercentage = numericColCount > 0 ? totalOutlierPercentage / numericColCount : 0;
  const validity = Math.max(0, 100 - (avgOutlierPercentage * 4)); // 25% outliers = 0 score

  // 4. Consistency (20%)
  // Check for 'mixed' or 'unknown' column types
  let badTypesCount = 0;
  for (const col in types) {
    if (types[col] === 'mixed' || types[col] === 'unknown') badTypesCount++;
  }
  const consistency = Math.max(0, 100 - ((badTypesCount / colCount) * 100));

  // 5. Feature Quality (20%)
  // General heuristic: enough rows compared to columns
  // Need at least 10 rows per column for basic ML, ideally 100+
  const rowToColRatio = totalRows / colCount;
  let featureQuality = 100;
  if (rowToColRatio < 10) featureQuality = 30;
  else if (rowToColRatio < 50) featureQuality = 60;
  else if (rowToColRatio < 100) featureQuality = 80;

  // Calculate overall weighted score
  const overallScore = Math.round(
    (completeness * 0.25) +
    (consistency * 0.20) +
    (validity * 0.20) +
    (uniqueness * 0.15) +
    (featureQuality * 0.20)
  );

  let category: MLReadinessScore['category'] = 'Poor';
  if (overallScore >= 90) category = 'Excellent';
  else if (overallScore >= 70) category = 'Good';
  else if (overallScore >= 50) category = 'Fair';
  else if (overallScore >= 30) category = 'Needs Improvement';

  return {
    overallScore,
    category,
    components: {
      completeness: Math.round(completeness),
      consistency: Math.round(consistency),
      validity: Math.round(validity),
      uniqueness: Math.round(uniqueness),
      featureQuality: Math.round(featureQuality)
    }
  }
}
