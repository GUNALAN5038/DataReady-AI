import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Colors } from '../../constants/colors'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { fetchAnalysis, triggerAnalysis } from '../../services/analysis'
import { fetchDatasetById } from '../../services/datasets'
import type { AnalysisRecord } from '../../types/analysis'
import type { Dataset } from '../../types/datasets'
import { Ionicons } from '@expo/vector-icons'

export default function AnalysisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!id) return
    setErrorMessage(null)

    try {
      const [datasetRes, analysisRes] = await Promise.all([
        fetchDatasetById(id),
        fetchAnalysis(id),
      ])

      if (datasetRes.dataset) setDataset(datasetRes.dataset)
      if (analysisRes.analysis) setAnalysis(analysisRes.analysis)
      if (analysisRes.error && !analysisRes.analysis) {
        setErrorMessage(analysisRes.error)
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load analysis')
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const handleRunAnalysis = async () => {
    if (!id) return
    setIsRetrying(true)
    setErrorMessage(null)

    const res = await triggerAnalysis(id)
    if (res.error) {
      setErrorMessage(res.error)
      setIsRetrying(false)
      return
    }

    // Polling reload
    setTimeout(() => {
      loadData()
      setIsRetrying(false)
    }, 1500)
  }

  if (isLoading && !refreshing) {
    return <LoadingSpinner fullScreen message="Loading data quality analysis..." />
  }

  const results = analysis?.results
  const mlReadiness = results?.mlReadiness
  const score = analysis?.ml_readiness_score ?? mlReadiness?.overallScore ?? 0
  const recommendations = analysis?.recommendations || []
  const missingCols = results?.missingValues?.columns || []
  const outliers = results?.outliers?.columns || []
  const duplicateRows = results?.duplicates?.duplicateRowCount ?? 0

  const getScoreColor = (val: number) => {
    if (val >= 80) return Colors.status.success
    if (val >= 60) return Colors.primary.blue
    if (val >= 40) return Colors.status.warning
    return Colors.status.error
  }

  const scoreColor = getScoreColor(score)

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="ML Readiness"
        rightAction={
          <TouchableOpacity onPress={handleRunAnalysis} disabled={isRetrying} style={{ padding: 4 }}>
            <Ionicons
              name="refresh"
              size={20}
              color={isRetrying ? Colors.neutral[400] : Colors.primary.blue}
            />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary.blue]}
            tintColor={Colors.primary.blue}
          />
        }
      >
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={Colors.status.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Hero Score Gauge Card */}
        <Card style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Overall ML Readiness Score</Text>
          <View style={styles.scoreCircleWrapper}>
            <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
              <Text style={[styles.scoreNumber, { color: scoreColor }]}>{score}</Text>
              <Text style={styles.scoreMax}>/ 100</Text>
            </View>
          </View>
          <Badge
            label={
              score >= 80
                ? 'Production Ready'
                : score >= 60
                ? 'Usable with Cleaning'
                : score >= 40
                ? 'Requires Remediation'
                : 'Not ML Ready'
            }
            variant={score >= 80 ? 'success' : score >= 60 ? 'info' : score >= 40 ? 'warning' : 'error'}
            style={styles.scoreBadge}
          />
          <Text style={styles.datasetContext}>
            Dataset: {dataset?.name || 'Current Version'} (v{analysis?.dataset_version ?? 0})
          </Text>
        </Card>

        {/* Component Breakdown Scores */}
        {mlReadiness?.components && (
          <>
            <Text style={styles.sectionTitle}>Readiness Dimensions</Text>
            <Card style={styles.dimensionsCard}>
              <DimensionProgressBar
                label="Missing Values Score"
                score={mlReadiness.components.missingValueScore}
              />
              <DimensionProgressBar
                label="Duplicate Prevention"
                score={mlReadiness.components.duplicateScore}
              />
              <DimensionProgressBar
                label="Outlier Cleanliness"
                score={mlReadiness.components.outlierScore}
              />
              <DimensionProgressBar
                label="Type Consistency"
                score={mlReadiness.components.typeConsistencyScore}
              />
              <DimensionProgressBar
                label="Volume & Sample Sufficiency"
                score={mlReadiness.components.volumeScore}
              />
            </Card>
          </>
        )}

        {/* Diagnostic Summaries */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Data Quality Diagnostics</Text>
        <View style={styles.diagnosticsRow}>
          <Card style={styles.diagnosticCard}>
            <Text style={styles.diagnosticVal}>{duplicateRows}</Text>
            <Text style={styles.diagnosticLabel}>Duplicate Rows</Text>
          </Card>
          <Card style={styles.diagnosticCard}>
            <Text style={styles.diagnosticVal}>{results?.missingValues?.totalMissing || 0}</Text>
            <Text style={styles.diagnosticLabel}>Missing Cells</Text>
          </Card>
          <Card style={styles.diagnosticCard}>
            <Text style={styles.diagnosticVal}>{results?.outliers?.totalOutliers || 0}</Text>
            <Text style={styles.diagnosticLabel}>Outliers Detected</Text>
          </Card>
        </View>

        {/* Missing Values Breakdown */}
        {missingCols.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Missing Values by Column</Text>
            <Card style={styles.listCard}>
              {missingCols.map((col, idx) => (
                <View
                  key={idx}
                  style={[styles.itemRow, idx === missingCols.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <Text style={styles.itemColName}>{col.column}</Text>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemStatText}>
                      {col.missingCount} ({col.missingPercentage.toFixed(1)}%)
                    </Text>
                    <Badge
                      label={col.missingPercentage > 20 ? 'High' : 'Moderate'}
                      variant={col.missingPercentage > 20 ? 'error' : 'warning'}
                    />
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Outlier Columns Breakdown */}
        {outliers.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Outliers Detected</Text>
            <Card style={styles.listCard}>
              {outliers.map((col, idx) => (
                <View
                  key={idx}
                  style={[styles.itemRow, idx === outliers.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <Text style={styles.itemColName}>{col.column}</Text>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemStatText}>{col.outlierCount} outliers</Text>
                    <Badge label={`${col.outlierPercentage.toFixed(1)}%`} variant="info" />
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Actionable Recommendations */}
        {recommendations.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Actionable Recommendations</Text>
            <View style={styles.recommendationsList}>
              {recommendations.map(rec => (
                <Card key={rec.id} style={styles.recommendationCard}>
                  <View style={styles.recHeader}>
                    <Text style={styles.recTitle}>{rec.title}</Text>
                    <Badge
                      label={rec.priority.toUpperCase()}
                      variant={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'neutral'}
                    />
                  </View>
                  <Text style={styles.recDescription}>{rec.description}</Text>
                  <View style={styles.actionableBox}>
                    <Ionicons name="arrow-forward-circle" size={16} color={Colors.primary.blue} />
                    <Text style={styles.actionableText}>{rec.actionableStep}</Text>
                  </View>
                </Card>
              ))}
            </View>
          </>
        )}

        {!analysis && !isLoading && (
          <Card style={styles.noAnalysisCard}>
            <Ionicons name="analytics-outline" size={36} color={Colors.neutral[400]} />
            <Text style={styles.noAnalysisTitle}>Analysis Pending</Text>
            <Text style={styles.noAnalysisMessage}>
              This dataset has not been analyzed yet. Run analysis to compute ML Readiness and outlier diagnostics.
            </Text>
            <Button
              title="Run Analysis Now"
              onPress={handleRunAnalysis}
              isLoading={isRetrying}
              style={{ width: '100%' }}
            />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function DimensionProgressBar({ label, score }: { label: string; score: number }) {
  const getProgressColor = (val: number) => {
    if (val >= 80) return Colors.status.success
    if (val >= 60) return Colors.primary.blue
    if (val >= 40) return Colors.status.warning
    return Colors.status.error
  }

  const color = getProgressColor(score)

  return (
    <View style={styles.progressRow}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={[styles.progressScore, { color }]}>{score}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressIndicator, { width: `${Math.min(100, Math.max(0, score))}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.status.errorBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: Colors.status.errorText,
    fontWeight: '500',
  },
  scoreCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[600],
    marginBottom: 16,
  },
  scoreCircleWrapper: {
    marginBottom: 14,
  },
  scoreCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '900',
  },
  scoreMax: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.neutral[400],
    marginTop: -2,
  },
  scoreBadge: {
    marginBottom: 8,
  },
  datasetContext: {
    fontSize: 12,
    color: Colors.neutral[400],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 12,
  },
  dimensionsCard: {
    padding: 18,
    gap: 14,
  },
  progressRow: {
    gap: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.neutral[700],
  },
  progressScore: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.neutral[200],
    overflow: 'hidden',
  },
  progressIndicator: {
    height: '100%',
    borderRadius: 3,
  },
  diagnosticsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  diagnosticCard: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
  },
  diagnosticVal: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  diagnosticLabel: {
    fontSize: 11,
    color: Colors.neutral[500],
    textAlign: 'center',
  },
  listCard: {
    padding: 0,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  itemColName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[800],
    flex: 1,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemStatText: {
    fontSize: 12,
    color: Colors.neutral[500],
  },
  recommendationsList: {
    gap: 12,
  },
  recommendationCard: {
    padding: 16,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.neutral[900],
    flex: 1,
    marginRight: 8,
  },
  recDescription: {
    fontSize: 13,
    color: Colors.neutral[600],
    lineHeight: 18,
    marginBottom: 10,
  },
  actionableBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[50],
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  actionableText: {
    fontSize: 12,
    color: Colors.primary.blueDark,
    fontWeight: '600',
    flex: 1,
  },
  noAnalysisCard: {
    alignItems: 'center',
    padding: 28,
    gap: 12,
  },
  noAnalysisTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.neutral[800],
  },
  noAnalysisMessage: {
    fontSize: 13,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
})
