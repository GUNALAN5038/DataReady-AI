import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Colors } from '../../constants/colors'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { fetchDatasetById } from '../../services/datasets'
import {
  fetchTransformationHistory,
  previewTransformation,
  applyTransformation,
  revertTransformation,
  PreviewResult,
} from '../../services/transformations'
import type { Dataset } from '../../types/datasets'
import type { TransformationConfig, TransformationRecord, TransformationType } from '../../types/transformations'
import { Ionicons } from '@expo/vector-icons'

export default function TransformationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [history, setHistory] = useState<TransformationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<TransformationType>('remove_duplicates')
  const [imputeStrategy, setImputeStrategy] = useState<'mean' | 'median' | 'mode'>('median')
  const [outlierStrategy, setOutlierStrategy] = useState<'clip' | 'remove'>('clip')
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [isReverting, setIsReverting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const [datasetRes, historyRes] = await Promise.all([
        fetchDatasetById(id),
        fetchTransformationHistory(id),
      ])

      if (datasetRes.dataset) setDataset(datasetRes.dataset)
      if (historyRes.history) setHistory(historyRes.history)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load transformations')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const buildCurrentConfig = (): TransformationConfig => {
    switch (selectedType) {
      case 'remove_duplicates':
        return { type: 'remove_duplicates', action: 'remove_duplicates' }
      case 'drop_missing':
        return { type: 'drop_missing', action: 'drop_missing' }
      case 'impute_missing':
        return { type: 'impute_missing', action: 'impute_missing', imputeStrategy }
      case 'handle_outliers':
        return { type: 'handle_outliers', action: 'handle_outliers', outlierStrategy }
      default:
        return { type: selectedType, action: selectedType }
    }
  }

  const handlePreview = async () => {
    if (!id) return
    setIsPreviewing(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const config = buildCurrentConfig()
    const res = await previewTransformation(id, [config])
    setIsPreviewing(false)

    if (res.error) {
      setErrorMessage(res.error)
      return
    }

    setPreview(res.preview || null)
  }

  const handleApply = async () => {
    if (!id) return
    setIsApplying(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const config = buildCurrentConfig()
    const res = await applyTransformation(id, [config])
    setIsApplying(false)

    if (res.error) {
      setErrorMessage(res.error)
      return
    }

    setSuccessMessage(`Transformation applied! Dataset updated to v${res.newVersion ?? (dataset?.current_version || 0) + 1}.`)
    setPreview(null)
    loadData()
  }

  const handleRevert = (targetVersion: number) => {
    if (!id) return
    Alert.alert(
      'Revert Version',
      `Rollback dataset to Version ${targetVersion}? This will restore data from that version.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rollback',
          style: 'destructive',
          onPress: async () => {
            setIsReverting(true)
            const res = await revertTransformation(id, targetVersion)
            setIsReverting(false)

            if (res.error) {
              Alert.alert('Revert Failed', res.error)
              return
            }

            Alert.alert('Success', `Dataset successfully rolled back to Version ${targetVersion}.`)
            loadData()
          },
        },
      ]
    )
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading transformation pipeline..." />
  }

  const currentVersion = dataset?.current_version ?? 0

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Transformations" />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Active Version Banner */}
        <Card style={styles.versionBanner}>
          <View style={styles.versionRow}>
            <View>
              <Text style={styles.versionDatasetName}>{dataset?.name}</Text>
              <Text style={styles.versionMeta}>
                Active Version: v{currentVersion} • {dataset?.row_count?.toLocaleString()} rows
              </Text>
            </View>
            <Badge label={`v${currentVersion}`} variant="info" />
          </View>
        </Card>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={Colors.status.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {successMessage && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.status.success} />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        {/* Transformation Selector */}
        <Text style={styles.sectionTitle}>Select Transformation</Text>
        <Card style={styles.configCard}>
          <View style={styles.typesGrid}>
            <TypeChip
              label="Remove Duplicates"
              icon="copy-outline"
              selected={selectedType === 'remove_duplicates'}
              onPress={() => {
                setSelectedType('remove_duplicates')
                setPreview(null)
              }}
            />
            <TypeChip
              label="Drop Missing Rows"
              icon="trash-outline"
              selected={selectedType === 'drop_missing'}
              onPress={() => {
                setSelectedType('drop_missing')
                setPreview(null)
              }}
            />
            <TypeChip
              label="Impute Missing"
              icon="bandage-outline"
              selected={selectedType === 'impute_missing'}
              onPress={() => {
                setSelectedType('impute_missing')
                setPreview(null)
              }}
            />
            <TypeChip
              label="Handle Outliers"
              icon="cut-outline"
              selected={selectedType === 'handle_outliers'}
              onPress={() => {
                setSelectedType('handle_outliers')
                setPreview(null)
              }}
            />
          </View>

          {/* Strategy Options for Imputation */}
          {selectedType === 'impute_missing' && (
            <View style={styles.strategySection}>
              <Text style={styles.strategyLabel}>Imputation Strategy</Text>
              <View style={styles.strategyRow}>
                {(['median', 'mean', 'mode'] as const).map(strat => (
                  <TouchableOpacity
                    key={strat}
                    style={[
                      styles.strategyChip,
                      imputeStrategy === strat && styles.strategyChipActive,
                    ]}
                    onPress={() => setImputeStrategy(strat)}
                  >
                    <Text
                      style={[
                        styles.strategyChipText,
                        imputeStrategy === strat && styles.strategyChipTextActive,
                      ]}
                    >
                      {strat.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Strategy Options for Outliers */}
          {selectedType === 'handle_outliers' && (
            <View style={styles.strategySection}>
              <Text style={styles.strategyLabel}>Outlier Handling Action</Text>
              <View style={styles.strategyRow}>
                {(['clip', 'remove'] as const).map(strat => (
                  <TouchableOpacity
                    key={strat}
                    style={[
                      styles.strategyChip,
                      outlierStrategy === strat && styles.strategyChipActive,
                    ]}
                    onPress={() => setOutlierStrategy(strat)}
                  >
                    <Text
                      style={[
                        styles.strategyChipText,
                        outlierStrategy === strat && styles.strategyChipTextActive,
                      ]}
                    >
                      {strat === 'clip' ? 'CLIP TO IQR' : 'DROP ROWS'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons: Preview & Apply */}
          <View style={styles.actionsRow}>
            <Button
              title="Preview Impact"
              variant="outline"
              onPress={handlePreview}
              isLoading={isPreviewing}
              style={{ flex: 1 }}
            />
            <Button
              title="Apply Transformation"
              onPress={handleApply}
              isLoading={isApplying}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        {/* Transformation Preview Card */}
        {preview && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Preview Result</Text>
            <Card style={styles.previewCard}>
              <View style={styles.previewStats}>
                <View style={styles.previewStatItem}>
                  <Text style={styles.previewStatVal}>{preview.totalRows.toLocaleString()}</Text>
                  <Text style={styles.previewStatLabel}>Resulting Rows</Text>
                </View>
                <View style={styles.previewStatItem}>
                  <Text style={styles.previewStatVal}>{preview.totalColumns}</Text>
                  <Text style={styles.previewStatLabel}>Columns</Text>
                </View>
              </View>
              <Text style={styles.previewNotice}>
                Ready to commit? Tap &quot;Apply Transformation&quot; above to create Version {currentVersion + 1}.
              </Text>
            </Card>
          </>
        )}

        {/* Transformation History */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Version History</Text>
        {history.length === 0 ? (
          <Card style={styles.emptyHistoryCard}>
            <Ionicons name="time-outline" size={32} color={Colors.neutral[400]} />
            <Text style={styles.emptyHistoryTitle}>Original Version (v0)</Text>
            <Text style={styles.emptyHistorySubtitle}>
              No transformations have been applied yet. The dataset is at its original upload state.
            </Text>
          </Card>
        ) : (
          <View style={styles.historyList}>
            {history.map(item => (
              <Card key={item.id} style={styles.historyCard}>
                <View style={styles.historyTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyType}>
                      {item.transformation_type.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                    <Text style={styles.historyVersions}>
                      v{item.previous_version} → v{item.new_version}
                    </Text>
                  </View>
                  <Badge label={item.status} variant="success" />
                </View>
                <View style={styles.historyFooter}>
                  <Text style={styles.historyDate}>
                    {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}
                  </Text>
                  {item.previous_version < currentVersion && (
                    <TouchableOpacity
                      onPress={() => handleRevert(item.previous_version)}
                      disabled={isReverting}
                      style={styles.revertBtn}
                    >
                      <Ionicons name="arrow-undo" size={14} color={Colors.primary.blue} />
                      <Text style={styles.revertBtnText}>Rollback to v{item.previous_version}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function TypeChip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  selected: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.typeChip, selected && styles.typeChipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={18}
        color={selected ? Colors.neutral.white : Colors.primary.blue}
      />
      <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>{label}</Text>
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
  versionBanner: {
    padding: 16,
    marginBottom: 16,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionDatasetName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  versionMeta: {
    fontSize: 12,
    color: Colors.neutral[500],
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.status.successBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: Colors.status.successText,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 12,
  },
  configCard: {
    padding: 16,
    marginBottom: 16,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary[50],
    borderWidth: 1.2,
    borderColor: Colors.primary[100],
    gap: 6,
  },
  typeChipSelected: {
    backgroundColor: Colors.primary.blue,
    borderColor: Colors.primary.blue,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary.blueDark,
  },
  typeChipTextSelected: {
    color: Colors.neutral.white,
  },
  strategySection: {
    marginTop: 4,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
    paddingTop: 12,
  },
  strategyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginBottom: 8,
  },
  strategyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  strategyChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: Colors.neutral[100],
  },
  strategyChipActive: {
    backgroundColor: Colors.primary.blue,
  },
  strategyChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.neutral[700],
  },
  strategyChipTextActive: {
    color: Colors.neutral.white,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  previewCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: Colors.primary[200],
  },
  previewStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 10,
  },
  previewStatItem: {
    alignItems: 'flex-start',
  },
  previewStatVal: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary.blueDark,
  },
  previewStatLabel: {
    fontSize: 11,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  previewNotice: {
    fontSize: 12,
    color: Colors.neutral[600],
    lineHeight: 16,
  },
  emptyHistoryCard: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  emptyHistoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.neutral[800],
    marginTop: 4,
  },
  emptyHistorySubtitle: {
    fontSize: 13,
    color: Colors.neutral[500],
    textAlign: 'center',
  },
  historyList: {
    gap: 10,
  },
  historyCard: {
    padding: 14,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyType: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  historyVersions: {
    fontSize: 12,
    color: Colors.primary.blue,
    fontWeight: '600',
    marginTop: 2,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
    paddingTop: 8,
  },
  historyDate: {
    fontSize: 11,
    color: Colors.neutral[400],
  },
  revertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  revertBtnText: {
    fontSize: 12,
    color: Colors.primary.blue,
    fontWeight: '600',
  },
})
