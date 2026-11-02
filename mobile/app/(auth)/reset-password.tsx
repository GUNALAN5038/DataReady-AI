import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Colors } from '../../constants/colors'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { useAuth } from '../../hooks/useAuth'
import { Ionicons } from '@expo/vector-icons'

export default function ResetPasswordScreen() {
  const router = useRouter()
  const { resetPassword } = useAuth()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleReset = async () => {
    setErrorMessage(null)

    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setIsLoading(true)
    const { error } = await resetPassword(password)
    setIsLoading(false)

    if (error) {
      setErrorMessage(error)
      return
    }

    setIsSuccess(true)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.neutral[800]} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create New Password</Text>
            <Text style={styles.subtitle}>
              Your new password must be at least 8 characters long and different from previous passwords.
            </Text>
          </View>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={Colors.status.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {isSuccess ? (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={40} color={Colors.status.success} />
              </View>
              <Text style={styles.successTitle}>Password Updated</Text>
              <Text style={styles.successMessage}>
                Your password has been changed successfully. You can now access your dashboard.
              </Text>
              <Button
                title="Go to Dashboard"
                onPress={() => router.replace('/(tabs)')}
                style={{ width: '100%' }}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <Input
                label="New Password"
                placeholder="At least 8 characters"
                value={password}
                onChangeText={setPassword}
                isPassword
                autoCapitalize="none"
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={Colors.neutral[400]} />}
              />

              <Input
                label="Confirm New Password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                isPassword
                autoCapitalize="none"
                leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color={Colors.neutral[400]} />}
              />

              <Button
                title="Update Password"
                onPress={handleReset}
                isLoading={isLoading}
                style={styles.submitButton}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.paper,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 20,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 8,
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
  form: {
    marginBottom: 24,
  },
  submitButton: {
    marginTop: 8,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.status.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  successMessage: {
    fontSize: 14,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
})
