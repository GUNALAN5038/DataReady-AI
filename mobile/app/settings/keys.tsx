import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { fetchApiKeys, saveApiKey } from '../../services/settings'
import type { ApiKeyInfo } from '../../types/settings'
import { Ionicons } from '@expo/vector-icons'

export default function ApiKeysScreen() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([])
  const [newKey, setNewKey] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadKeys = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    const res = await fetchApiKeys()
    setIsLoading(false)

    if (res.error) {
      setErrorMessage(res.error)
      return
    }
    setKeys(res.keys)
  }, [])

  useEffect(() => {
    loadKeys()
  }, [loadKeys])

  const handleSaveKey = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)

    const trimmed = newKey.trim()
    if (!trimmed || trimmed.length < 8) {
      setErrorMessage('Please enter a valid Google Gemini API key (at least 8 characters).')
      return
    }

    setIsSaving(true)
    const res = await saveApiKey('gemini', trimmed)
    setIsSaving(false)

    if (res.error) {
      setErrorMessage(res.error)
      return
    }

    setSuccessMessage('API key encrypted and securely stored on server.')
    setNewKey('')
    loadKeys()
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading API keys..." />
  }

  const activeKey = keys.find(k => k.provider === 'gemini' && k.is_active)

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="AI Provider Keys" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.headerSubtitle}>
            Configure your custom Google Gemini API key. Stored keys are encrypted exclusively on the server using AES-256-GCM and never exposed to the mobile bundle.
          </Text>

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

          {/* Current Key Status Card */}
          <Text style={styles.sectionTitle}>Active Provider Configuration</Text>
          <Card style={styles.keyCard}>
            <View style={styles.keyCardHeader}>
              <View style={styles.keyIconWrapper}>
                <Ionicons name="sparkles" size={20} color={Colors.primary.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.keyProvider}>Google Gemini</Text>
                <Text style={styles.keyPreview}>
                  {activeKey ? `Key: ${activeKey.key_preview}` : 'No custom key configured (using system fallback)'}
                </Text>
              </View>
              <Badge
                label={activeKey ? 'Custom Active' : 'System Default'}
                variant={activeKey ? 'success' : 'neutral'}
              />
            </View>
            {activeKey && (
              <View style={styles.keyMetaRow}>
                <Text style={styles.keyMetaText}>
                  Added: {new Date(activeKey.created_at).toLocaleDateString()}
                </Text>
                {activeKey.last_used_at && (
                  <Text style={styles.keyMetaText}>
                    Last used: {new Date(activeKey.last_used_at).toLocaleDateString()}
                  </Text>
                )}
              </View>
            )}
          </Card>

          {/* Add / Update API Key Form */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            {activeKey ? 'Update Gemini API Key' : 'Add Custom Gemini API Key'}
          </Text>
          <Card style={styles.formCard}>
            <Input
              label="Gemini API Key"
              placeholder="AIzaSy..."
              value={newKey}
              onChangeText={setNewKey}
              isPassword
              autoCapitalize="none"
              autoCorrect={false}
              helperText="Obtain a key from https://aistudio.google.com"
              leftIcon={<Ionicons name="key-outline" size={18} color={Colors.neutral[400]} />}
            />

            <Button
              title={isSaving ? 'Encrypting & Saving...' : 'Save API Key'}
              onPress={handleSaveKey}
              isLoading={isSaving}
              style={{ marginTop: 8 }}
            />
          </Card>

          {/* Security Assurance Card */}
          <Card style={styles.securityNoteCard}>
            <Ionicons name="shield-checkmark" size={22} color={Colors.primary.blue} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.securityNoteTitle}>Server-Side Protection</Text>
              <Text style={styles.securityNoteText}>
                Your plaintext API key is transmitted over TLS to Next.js and immediately encrypted with AES-256-GCM. It is never stored in mobile SecureStore or logged in transcripts.
              </Text>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  headerSubtitle: {
    fontSize: 13,
    color: Colors.neutral[500],
    lineHeight: 19,
    marginBottom: 20,
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
    fontSize: 15,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 10,
  },
  keyCard: {
    padding: 16,
  },
  keyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  keyProvider: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  keyPreview: {
    fontSize: 12,
    color: Colors.neutral[500],
  },
  keyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  keyMetaText: {
    fontSize: 11,
    color: Colors.neutral[400],
  },
  formCard: {
    padding: 16,
    marginBottom: 20,
  },
  securityNoteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: Colors.primary[50],
    borderWidth: 1,
    borderColor: Colors.primary[100],
  },
  securityNoteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary.blueDark,
    marginBottom: 4,
  },
  securityNoteText: {
    fontSize: 12,
    color: Colors.neutral[600],
    lineHeight: 17,
  },
})
