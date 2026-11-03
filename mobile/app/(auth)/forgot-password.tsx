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

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const { forgotPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleResetRequest = async () => {
    setErrorMessage(null)
    const trimmed = email.trim()

    if (!trimmed) {
      setErrorMessage('Please enter your email address.')
      return
    }

    setIsLoading(true)
    const { error } = await forgotPassword(trimmed)
    setIsLoading(false)

    if (error) {
      setErrorMessage(error)
      return
    }

    setIsSubmitted(true)
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
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we will send you instructions or an OTP to reset your password.
            </Text>
          </View>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={Colors.status.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {isSubmitted ? (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="mail" size={32} color={Colors.status.success} />
              </View>
              <Text style={styles.successTitle}>Recovery Request Sent</Text>
              <Text style={styles.successMessage}>
                If an account exists for {email.trim()}, you will receive a password reset email or verification code.
              </Text>
              <Button
                title="Enter Verification Code"
                onPress={() =>
                  router.push({
                    pathname: '/(auth)/verify-otp',
                    params: { email: email.trim(), type: 'recovery' },
                  })
                }
                style={styles.actionButton}
              />
              <Button
                title="Return to Sign In"
                variant="outline"
                onPress={() => router.push('/(auth)/login')}
                style={styles.actionButton}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <Input
                label="Email Address"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={<Ionicons name="mail-outline" size={18} color={Colors.neutral[400]} />}
              />

              <Button
                title="Send Reset Instructions"
                onPress={handleResetRequest}
                isLoading={isLoading}
                style={styles.submitButton}
              />
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
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
    paddingVertical: 20,
    gap: 12,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.status.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  successMessage: {
    fontSize: 14,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButton: {
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  loginLink: {
    fontSize: 14,
    color: Colors.primary.blue,
    fontWeight: '700',
  },
})
