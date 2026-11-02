import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Badge } from '../../components/Badge'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { useAuth } from '../../hooks/useAuth'
import { fetchUserProfile, updateUserProfile } from '../../services/settings'
import type { UserProfile } from '../../types/auth'
import { Ionicons } from '@expo/vector-icons'

export default function ProfileScreen() {
  const { user } = useAuth()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchUserProfile().then(res => {
      setIsLoading(false)
      if (res.profile) {
        setProfile(res.profile)
        setFullName(res.profile.fullName || '')
      } else if (user?.user_metadata?.full_name) {
        setFullName(user.user_metadata.full_name as string)
      }
    })
  }, [user])

  const handleSave = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)

    const trimmed = fullName.trim()
    if (!trimmed) {
      setErrorMessage('Please enter your full name.')
      return
    }

    setIsSaving(true)
    const res = await updateUserProfile(trimmed)
    setIsSaving(false)

    if (res.error) {
      setErrorMessage(res.error)
      return
    }

    setSuccessMessage('Profile updated successfully.')
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading profile..." />
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Profile Settings" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
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

          <Card style={styles.card}>
            <View style={styles.avatarSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(fullName || user?.email || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.avatarTitle}>{fullName || 'Data Scientist'}</Text>
              <Text style={styles.avatarSubtitle}>{user?.email}</Text>
            </View>

            <View style={styles.separator} />

            <Input
              label="Full Name"
              placeholder="Your full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              leftIcon={<Ionicons name="person-outline" size={18} color={Colors.neutral[400]} />}
            />

            <View style={styles.readOnlyField}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={styles.readOnlyValueRow}>
                <Text style={styles.fieldValue}>{user?.email || '—'}</Text>
                <Badge label="Verified" variant="success" />
              </View>
            </View>

            <View style={styles.readOnlyField}>
              <Text style={styles.fieldLabel}>User ID</Text>
              <Text style={styles.fieldValueMonospace}>{user?.id || '—'}</Text>
            </View>

            <Button
              title="Save Changes"
              onPress={handleSave}
              isLoading={isSaving}
              style={{ marginTop: 8 }}
            />
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
  card: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.neutral.white,
  },
  avatarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  avatarSubtitle: {
    fontSize: 13,
    color: Colors.neutral[500],
  },
  separator: {
    height: 1,
    backgroundColor: Colors.neutral[200],
    marginVertical: 16,
  },
  readOnlyField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.neutral[500],
    marginBottom: 4,
  },
  readOnlyValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  fieldValue: {
    fontSize: 14,
    color: Colors.neutral[800],
    fontWeight: '500',
  },
  fieldValueMonospace: {
    fontSize: 12,
    color: Colors.neutral[600],
    backgroundColor: Colors.neutral[50],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
})
