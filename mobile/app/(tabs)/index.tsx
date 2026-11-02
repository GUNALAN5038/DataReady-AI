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
import { useRouter } from 'expo-router'
import { Colors } from '../../constants/colors'
import { Card } from '../../components/Card'
import { MetricCard } from '../../components/MetricCard'
import { Badge } from '../../components/Badge'
import { EmptyState } from '../../components/EmptyState'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { useAuth } from '../../hooks/useAuth'
import { fetchDatasets, fetchDatasetSummary } from '../../services/datasets'
import type { Dataset, DatasetSummary } from '../../types/datasets'
import { Ionicons } from '@expo/vector-icons'

export default function DashboardScreen() {
  const router = useRouter()
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth()

  const [summary, setSummary] = useState<DatasetSummary>({
    totalDatasets: 0,
    analyzedDatasets: 0,
    totalRows: 0,
  })
  const [recentDatasets, setRecentDatasets] = useState<Dataset[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadDashboardData = useCallback(async () => {
    if (!isAuthenticated) return
    setErrorMessage(null)
    try {
      const [summaryData, datasetsResult] = await Promise.all([
        fetchDatasetSummary(),
        fetchDatasets(),
      ])

      setSummary(summaryData)

      if (datasetsResult.error) {
        setErrorMessage(datasetsResult.error)
      } else {
        setRecentDatasets((datasetsResult.datasets || []).slice(0, 5))
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthLoading) return
    if (!isAuthenticated) {
      router.replace('/(auth)/welcome')
      return
    }
    loadDashboardData()
  }, [isAuthLoading, isAuthenticated, loadDashboardData, router])

  const onRefresh = () => {
    setRefreshing(true)
    loadDashboardData()
  }

  const userName =
    (user?.user_metadata?.full_name as string) ||
    user?.email?.split('@')[0] ||
    'Data Scientist'

  if (isLoading && !refreshing) {
    return <LoadingSpinner fullScreen message="Loading dashboard..." />
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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
        {/* Welcome Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationBadge}
            onPress={() => router.push('/settings/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.neutral[700]} />
          </TouchableOpacity>
        </View>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={Colors.status.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Analytics Summary Metrics */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Datasets"
            value={summary.totalDatasets}
            subtitle={`${summary.analyzedDatasets} analyzed`}
            icon={<Ionicons name="file-tray-full" size={18} color={Colors.primary.blue} />}
            variant="blue"
          />
          <MetricCard
            title="Total Records"
            value={summary.totalRows.toLocaleString()}
            subtitle="Rows processed"
            icon={<Ionicons name="layers" size={18} color={Colors.primary[600]} />}
            variant="indigo"
          />
        </View>

        <View style={[styles.metricsGrid, { marginTop: 12 }]}>
          <MetricCard
            title="ML Readiness"
            value={summary.avgMlReadiness !== undefined ? `${summary.avgMlReadiness}%` : '—'}
            subtitle={summary.avgMlReadiness !== undefined ? 'Average model score' : 'No analyses yet'}
            icon={<Ionicons name="speedometer" size={18} color={Colors.status.success} />}
            variant="success"
          />
          <MetricCard
            title="Quality Score"
            value={summary.avgQualityScore !== undefined ? `${summary.avgQualityScore}%` : '—'}
            subtitle="Data completeness"
            icon={<Ionicons name="shield-checkmark" size={18} color={Colors.primary.blueDark} />}
            variant="blue"
          />
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <QuickActionButton
            icon="cloud-upload"
            label="Upload CSV"
            onPress={() => router.push('/(tabs)/upload')}
            color={Colors.primary.blue}
            bgColor={Colors.primary[50]}
          />
          <QuickActionButton
            icon="chatbubbles"
            label="AI Chat"
            onPress={() => router.push('/(tabs)/chat')}
            color={Colors.primary[600]}
            bgColor="#F5F3FF"
          />
          <QuickActionButton
            icon="list"
            label="All Datasets"
            onPress={() => router.push('/(tabs)/datasets')}
            color={Colors.neutral[700]}
            bgColor={Colors.neutral[100]}
          />
        </View>

        {/* Recent Datasets */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent Datasets</Text>
          {recentDatasets.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/(tabs)/datasets')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentDatasets.length === 0 ? (
          <Card style={styles.emptyCard}>
            <EmptyState
              title="No datasets yet"
              description="Upload your first CSV or spreadsheet to start analyzing data quality and ML readiness."
              icon={<Ionicons name="cloud-upload-outline" size={32} color={Colors.primary.blue} />}
              actionTitle="Upload Dataset"
              onAction={() => router.push('/(tabs)/upload')}
            />
          </Card>
        ) : (
          <View style={styles.datasetsList}>
            {recentDatasets.map(dataset => (
              <DatasetCard
                key={dataset.id}
                dataset={dataset}
                onPress={() => router.push(`/datasets/${dataset.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function QuickActionButton({
  icon,
  label,
  onPress,
  color,
  bgColor,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  color: string
  bgColor: string
}) {
  return (
    <TouchableOpacity style={styles.quickActionButton} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.quickActionIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

function DatasetCard({
  dataset,
  onPress,
}: {
  dataset: Dataset
  onPress: () => void
}) {
  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'analyzed':
        return 'success'
      case 'processing':
      case 'uploading':
        return 'warning'
      case 'failed':
        return 'error'
      default:
        return 'info'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <Card style={styles.datasetCard}>
        <View style={styles.datasetCardHeader}>
          <View style={styles.datasetInfo}>
            <Text style={styles.datasetName} numberOfLines={1}>
              {dataset.name}
            </Text>
            <Text style={styles.datasetMeta}>
              {dataset.row_count?.toLocaleString() || 0} rows • {dataset.column_count || 0} cols •{' '}
              {formatFileSize(dataset.file_size)}
            </Text>
          </View>
          <Badge label={dataset.status} variant={getBadgeVariant(dataset.status)} />
        </View>
      </Card>
    </TouchableOpacity>
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
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.neutral[500],
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.neutral[900],
    letterSpacing: -0.3,
  },
  notificationBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.neutral.white,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: Colors.card.background,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.card.border,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.neutral[800],
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary.blue,
  },
  emptyCard: {
    padding: 8,
  },
  datasetsList: {
    gap: 10,
  },
  datasetCard: {
    padding: 14,
  },
  datasetCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datasetInfo: {
    flex: 1,
    marginRight: 10,
  },
  datasetName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 3,
  },
  datasetMeta: {
    fontSize: 12,
    color: Colors.neutral[500],
  },
})
