import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { Colors } from '../../constants/colors'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { uploadDataset } from '../../services/datasets'
import { Ionicons } from '@expo/vector-icons'

const MAX_CSV_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_EXCEL_SIZE = 25 * 1024 * 1024 // 25MB

interface SelectedFile {
  name: string
  uri: string
  size: number
  mimeType?: string
}

export default function UploadScreen() {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handlePickDocument = async () => {
    setErrorMessage(null)
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'text/comma-separated-values',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          '*/*',
        ],
        copyToCacheDirectory: true,
      })

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return
      }

      const asset = result.assets[0]
      const ext = asset.name.split('.').pop()?.toLowerCase() || ''

      if (!['csv', 'xlsx', 'xls', 'json'].includes(ext)) {
        setErrorMessage('Unsupported file format. Please upload a CSV, XLSX, XLS, or JSON file.')
        return
      }

      const size = asset.size || 0
      if (size === 0) {
        setErrorMessage('Selected file is empty (0 bytes). Please choose a valid dataset.')
        return
      }

      if (ext === 'csv' && size > MAX_CSV_SIZE) {
        setErrorMessage('CSV file exceeds maximum allowed size of 50MB.')
        return
      }

      if ((ext === 'xlsx' || ext === 'xls') && size > MAX_EXCEL_SIZE) {
        setErrorMessage('Excel file exceeds maximum allowed size of 25MB.')
        return
      }

      setSelectedFile({
        name: asset.name,
        uri: asset.uri,
        size,
        mimeType: asset.mimeType || undefined,
      })
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to select document')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setErrorMessage(null)
    setProgress(5)

    try {
      // Read file text content if CSV
      let content: string | undefined
      const ext = selectedFile.name.split('.').pop()?.toLowerCase()

      if (ext === 'csv') {
        try {
          content = await FileSystem.readAsStringAsync(selectedFile.uri, {
            encoding: FileSystem.EncodingType.UTF8,
          })
        } catch {
          // If native read fails, uploadDataset falls back to fetching URI blob
        }
      }

      const { dataset, error } = await uploadDataset(
        {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType || 'text/csv',
          size: selectedFile.size,
          content,
        },
        currProgress => setProgress(currProgress)
      )

      if (error || !dataset) {
        setErrorMessage(error || 'Failed to complete dataset upload')
        setIsUploading(false)
        return
      }

      // Success: navigate to the dataset detail view
      router.push(`/datasets/${dataset.id}`)
      setSelectedFile(null)
      setProgress(0)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Upload Dataset</Text>
          <Text style={styles.subtitle}>
            Upload a CSV or spreadsheet to compute automated ML readiness metrics and data quality scores.
          </Text>
        </View>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={Colors.status.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Dropzone / Picker Card */}
        <TouchableOpacity
          onPress={handlePickDocument}
          activeOpacity={0.8}
          disabled={isUploading}
          style={styles.pickerWrapper}
        >
          <Card style={styles.pickerCard}>
            <View style={styles.pickerIcon}>
              <Ionicons name="cloud-upload" size={36} color={Colors.primary.blue} />
            </View>
            <Text style={styles.pickerTitle}>Select File from Device</Text>
            <Text style={styles.pickerDescription}>
              Supports CSV (up to 50MB) and Excel XLSX (up to 25MB)
            </Text>
            <Button
              title="Browse Files"
              variant="outline"
              onPress={handlePickDocument}
              disabled={isUploading}
              style={styles.browseButton}
            />
          </Card>
        </TouchableOpacity>

        {/* Selected File Details */}
        {selectedFile && (
          <Card style={styles.fileCard}>
            <View style={styles.fileRow}>
              <View style={styles.fileIcon}>
                <Ionicons name="document-text" size={26} color={Colors.primary.blue} />
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <Text style={styles.fileMeta}>{formatFileSize(selectedFile.size)}</Text>
              </View>
              {!isUploading && (
                <TouchableOpacity
                  onPress={() => setSelectedFile(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={22} color={Colors.neutral[400]} />
                </TouchableOpacity>
              )}
            </View>

            {isUploading && (
              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>
                  {progress < 85
                    ? `Uploading file... ${progress}%`
                    : 'Running ML Readiness analysis...'}
                </Text>
              </View>
            )}

            <Button
              title={isUploading ? 'Uploading & Analyzing...' : 'Upload & Analyze Dataset'}
              onPress={handleUpload}
              isLoading={isUploading}
              disabled={isUploading}
              style={styles.uploadActionButton}
            />
          </Card>
        )}

        {/* Informational Guidance */}
        <View style={styles.guidanceSection}>
          <Text style={styles.guidanceTitle}>Supported Capabilities</Text>
          <GuidanceItem
            icon="shield-checkmark-outline"
            text="Private, isolated storage in user-scoped bucket"
          />
          <GuidanceItem
            icon="speedometer-outline"
            text="Automatic missing value, duplicate, and outlier detection"
          />
          <GuidanceItem
            icon="color-wand-outline"
            text="Full versioning and rollback on subsequent transformations"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function GuidanceItem({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap
  text: string
}) {
  return (
    <View style={styles.guidanceItem}>
      <Ionicons name={icon} size={18} color={Colors.primary.blue} />
      <Text style={styles.guidanceText}>{text}</Text>
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
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.neutral[900],
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
    lineHeight: 20,
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
  pickerWrapper: {
    marginBottom: 16,
  },
  pickerCard: {
    alignItems: 'center',
    padding: 28,
    borderWidth: 2,
    borderColor: Colors.primary[200],
    borderStyle: 'dashed',
    backgroundColor: Colors.primary[50],
  },
  pickerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  pickerDescription: {
    fontSize: 13,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginBottom: 16,
  },
  browseButton: {
    paddingHorizontal: 24,
    backgroundColor: Colors.neutral.white,
  },
  fileCard: {
    padding: 16,
    marginBottom: 20,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 3,
  },
  fileMeta: {
    fontSize: 13,
    color: Colors.neutral[500],
  },
  progressSection: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary.blue,
  },
  progressText: {
    fontSize: 12,
    color: Colors.primary.blue,
    fontWeight: '600',
    textAlign: 'center',
  },
  uploadActionButton: {
    width: '100%',
  },
  guidanceSection: {
    marginTop: 8,
    gap: 12,
  },
  guidanceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.neutral[800],
    marginBottom: 4,
  },
  guidanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guidanceText: {
    fontSize: 13,
    color: Colors.neutral[600],
    flex: 1,
  },
})
