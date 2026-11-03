import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Colors } from '../../constants/colors'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Input } from '../../components/Input'
import { EmptyState } from '../../components/EmptyState'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { useAuth } from '../../hooks/useAuth'
import { fetchDatasets } from '../../services/datasets'
import type { Dataset } from '../../types/datasets'
import { Ionicons } from '@expo/vector-icons'

export default function DatasetsScreen() {
  const router = useRouter()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadDatasets = useCallback(async () => {
    if (!isAuthenticated) return
    setErrorMessage(null)
    try {
      const { datasets: data, error } = await fetchDatasets()
      if (error) {
        setErrorMessage(error)
      } else {
        setDatasets(data || [])
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load datasets')
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
    loadDatasets()
  }, [isAuthLoading, isAuthenticated, loadDatasets, router])

  const onRefresh = () => {
    setRefreshing(true)
    loadDatasets()
  }

  const filteredDatasets = datasets.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  )

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'analyzed':
        return { label: 'Analyzed', variant: 'success' as const }
      case 'processing':
        return { label: 'Processing', variant: 'warning' as const }
      case 'uploading':
        return { label: 'Uploading', variant: 'warning' as const }
      case 'failed':
        return { label: 'Failed', variant: 'error' as const }
      default:
        return { label: status, variant: 'neutral' as const }
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Datasets</Text>
          <Text style={styles.headerSubtitle}>
            {datasets.length} {datasets.length === 1 ? 'dataset' : 'datasets'} stored
          </Text>
        </View>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => router.push('/(tabs)/upload')}
          accessibilityRole="button"
          accessibilityLabel="Upload dataset"
        >
          <Ionicons name="add" size={24} color={Colors.neutral.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Input
          placeholder="Search datasets..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Ionicons name="search" size={18} color={Colors.neutral[400]} />}
          containerStyle={{ marginBottom: 0 }}
        />
      </View>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={Colors.status.error} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {isLoading && !refreshing ? (
        <LoadingSpinner fullScreen message="Loading datasets..." />
      ) : (
        <FlatList
          data={filteredDatasets}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary.blue]}
              tintColor={Colors.primary.blue}
            />
          }
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <EmptyState
                title={searchQuery ? 'No matching datasets' : 'No datasets yet'}
                description={
                  searchQuery
                    ? `No datasets found matching "${searchQuery}".`
                    : 'Upload your first CSV dataset to start analysis and ML readiness scoring.'
                }
                icon={<Ionicons name="file-tray-outline" size={32} color={Colors.primary.blue} />}
                actionTitle={searchQuery ? 'Clear Search' : 'Upload Dataset'}
                onAction={() => {
                  if (searchQuery) setSearchQuery('')
                  else router.push('/(tabs)/upload')
                }}
              />
            </Card>
          }
          renderItem={({ item }) => {
            const statusBadge = getStatusBadge(item.status)
            const version = item.current_version ?? 0

            return (
              <TouchableOpacity
                onPress={() => router.push(`/datasets/${item.id}`)}
                activeOpacity={0.75}
                style={styles.itemWrapper}
              >
                <Card style={styles.datasetCard}>
                  <View style={styles.cardTop}>
                    <View style={styles.titleRow}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {version > 0 && (
                        <Badge label={`v${version}`} variant="info" style={styles.versionBadge} />
                      )}
                    </View>
                    <Badge label={statusBadge.label} variant={statusBadge.variant} />
                  </View>

                  <View style={styles.cardBottom}>
                    <View style={styles.metaRow}>
                      <Ionicons name="analytics-outline" size={14} color={Colors.neutral[500]} />
                      <Text style={styles.metaText}>
                        {item.row_count?.toLocaleString() || 0} rows • {item.column_count || 0} cols
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons name="document-text-outline" size={14} color={Colors.neutral[500]} />
                      <Text style={styles.metaText}>{formatFileSize(item.file_size)}</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.neutral[900],
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  uploadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.status.errorBg,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: Colors.status.errorText,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  itemWrapper: {
    marginBottom: 10,
  },
  datasetCard: {
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[900],
    flexShrink: 1,
  },
  versionBadge: {
    marginLeft: 6,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
    paddingTop: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.neutral[500],
  },
  emptyCard: {
    marginTop: 12,
    padding: 12,
  },
})
