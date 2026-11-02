import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Colors } from '../../constants/colors'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { fetchDatasetById, deleteDataset } from '../../services/datasets'
import { downloadExportFile } from '../../services/transformations'
import type { Dataset } from '../../types/datasets'
import { Ionicons } from '@expo/vector-icons'

export default function DatasetDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setErrorMessage(null)

    const res = await fetchDatasetById(id)
    setIsLoading(false)

    if (res.error || !res.dataset) {
      setErrorMessage(res.error || 'Dataset not found or access denied')
      return
    }

    setDataset(res.dataset)
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExport = async () => {
    if (!id) return
    setIsExporting(true)
    const res = await downloadExportFile(id, 'csv')
    setIsExporting(false)

    if (res.error) {
      Alert.alert('Export Error', res.error)
      return
    }

    if (res.content) {
      try {
        await Share.share({
          message: res.content,
          title: res.filename || `${dataset?.name || 'dataset'}_export.csv`,
        })
      } catch (err: unknown) {
        Alert.alert('Share Error', err instanceof Error ? err.message : 'Failed to share file')
      }
    }
  }

  const handleDelete = () => {
    if (!id) return
    Alert.alert(
      'Delete Dataset',
      `Are you sure you want to delete "${dataset?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true)
            const res = await deleteDataset(id)
            setIsDeleting(false)

            if (res.error) {
              Alert.alert('Error', res.error)
              return
            }

            router.replace('/(tabs)/datasets')
          },
        },
      ]
    )
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading dataset..." />
  }

  if (!dataset) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Dataset Detail" />
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.status.error} />
          <Text style={styles.notFoundTitle}>Dataset Unavailable</Text>
          <Text style={styles.notFoundMessage}>{errorMessage || 'Dataset does not exist.'}</Text>
          <Button title="Back to Datasets" onPress={() => router.replace('/(tabs)/datasets')} />
        </View>
      </SafeAreaView>
    )
  }

  const version = dataset.current_version ?? 0
  const columns = dataset.column_metadata || []
  const sampleRows = dataset.sample_data || []

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={dataset.name}
        rightAction={
          <TouchableOpacity onPress={handleDelete} disabled={isDeleting} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={20} color={Colors.status.error} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Dataset Header Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.datasetTitle}>{dataset.name}</Text>
              <Text style={styles.fileLabel}>{dataset.file_name}</Text>
            </View>
            <Badge label={dataset.status} variant={dataset.status === 'analyzed' ? 'success' : 'warning'} />
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Rows</Text>
              <Text style={styles.metaValue}>{dataset.row_count?.toLocaleString() || '0'}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Columns</Text>
              <Text style={styles.metaValue}>{dataset.column_count || '0'}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Version</Text>
              <Text style={styles.metaValue}>v{version}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Format</Text>
              <Text style={styles.metaValue}>{(dataset.file_type || 'CSV').toUpperCase()}</Text>
            </View>
          </View>
        </Card>

        {/* Feature Action Buttons */}
        <Text style={styles.sectionTitle}>Dataset Tools</Text>
        <View style={styles.actionButtonsGrid}>
          <ActionButton
            icon="speedometer"
            title="ML Readiness"
            subtitle="Quality & score"
            color={Colors.primary.blue}
            bgColor={Colors.primary[50]}
            onPress={() => router.push(`/analysis/${dataset.id}`)}
          />
          <ActionButton
            icon="color-wand"
            title="Transform"
            subtitle="Clean & version"
            color={Colors.primary[600]}
            bgColor="#F5F3FF"
            onPress={() => router.push(`/transformations/${dataset.id}`)}
          />
          <ActionButton
            icon="chatbubbles"
            title="AI Chat"
            subtitle="Ask questions"
            color="#0D9488"
            bgColor="#F0FDFA"
            onPress={() => router.push(`/chat/${dataset.id}`)}
          />
          <ActionButton
            icon="download"
            title="Export CSV"
            subtitle={isExporting ? 'Downloading...' : 'Share file'}
            color={Colors.neutral[700]}
            bgColor={Colors.neutral[100]}
            onPress={handleExport}
          />
        </View>

        {/* Columns & Data Types */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
          Columns ({columns.length})
        </Text>
        {columns.length === 0 ? (
          <Card style={styles.emptyTableCard}>
            <Text style={styles.emptyTableText}>No column metadata available.</Text>
          </Card>
        ) : (
          <Card style={styles.tableCard}>
            {columns.map((col, index) => (
              <View
                key={index}
                style={[styles.columnRow, index === columns.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={styles.columnNameRow}>
                  <Ionicons name="cube-outline" size={16} color={Colors.primary.blue} />
                  <Text style={styles.columnName}>{col.name}</Text>
                </View>
                <Badge label={col.type || 'unknown'} variant="neutral" />
              </View>
            ))}
          </Card>
        )}

        {/* Sample Data Preview */}
        {sampleRows.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Data Sample Preview</Text>
            <Card style={styles.previewCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                  <View style={styles.previewHeaderRow}>
                    {columns.slice(0, 6).map((col, idx) => (
                      <Text key={idx} style={styles.previewHeaderCell}>
                        {col.name}
                      </Text>
                    ))}
                  </View>
                  {sampleRows.slice(0, 5).map((row, rowIdx) => (
                    <View key={rowIdx} style={styles.previewDataRow}>
                      {columns.slice(0, 6).map((col, colIdx) => (
                        <Text key={colIdx} style={styles.previewDataCell} numberOfLines={1}>
                          {row[col.name] !== undefined && row[col.name] !== null
                            ? String(row[col.name])
                            : '—'}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function ActionButton({
  icon,
  title,
  subtitle,
  color,
  bgColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle: string
  color: string
  bgColor: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.actionButtonIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.actionButtonTitle}>{title}</Text>
      <Text style={styles.actionButtonSubtitle}>{subtitle}</Text>
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
    paddingBottom: 40,
  },
  summaryCard: {
    padding: 18,
    marginBottom: 20,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  datasetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  fileLabel: {
    fontSize: 13,
    color: Colors.neutral[500],
  },
  metaGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
    paddingTop: 14,
  },
  metaCell: {
    flex: 1,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    color: Colors.neutral[400],
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.neutral[800],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 12,
  },
  actionButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: '48%',
    backgroundColor: Colors.card.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.card.border,
  },
  actionButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  actionButtonSubtitle: {
    fontSize: 11,
    color: Colors.neutral[500],
  },
  tableCard: {
    padding: 0,
    overflow: 'hidden',
  },
  columnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  columnNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  columnName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  emptyTableCard: {
    padding: 20,
    alignItems: 'center',
  },
  emptyTableText: {
    fontSize: 13,
    color: Colors.neutral[500],
  },
  previewCard: {
    padding: 12,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    paddingBottom: 8,
  },
  previewHeaderCell: {
    width: 100,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.neutral[700],
    marginRight: 8,
  },
  previewDataRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  previewDataCell: {
    width: 100,
    fontSize: 12,
    color: Colors.neutral[600],
    marginRight: 8,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  notFoundMessage: {
    fontSize: 14,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginBottom: 16,
  },
})
