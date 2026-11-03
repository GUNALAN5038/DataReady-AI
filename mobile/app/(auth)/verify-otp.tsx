import React, { useState, useEffect } from 'react'
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
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Colors } from '../../constants/colors'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { useAuth } from '../../hooks/useAuth'
import { Ionicons } from '@expo/vector-icons'

export default function VerifyOtpScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ email?: string; type?: string }>()
  const { verifyOtp, forgotPassword } = useAuth()

  const email = params.email || ''
  const type = (params.type as 'signup' | 'recovery' | 'email') || 'signup'

  const [otpCode, setOtpCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(60)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const handleVerify = async () => {
    setErrorMessage(null)
    const cleaned = otpCode.replace(/\s+/g, '')

    if (cleaned.length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.')
      return
    }

    setIsLoading(true)
    const { error } = await verifyOtp(email, cleaned, type)
    setIsLoading(false)

    if (error) {
      setErrorMessage(error)
      return
    }

    if (type === 'recovery') {
      router.replace('/(auth)/reset-password')
    } else {
      router.replace('/(tabs)')
    }
  }

  const handleResend = async () => {
    if (countdown > 0 || isResending) return
    setIsResending(true)
    setErrorMessage(null)

    await forgotPassword(email)
    setIsResending(false)
    setCountdown(60)
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

          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={36} color={Colors.primary.blue} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit verification code to{' '}
              <Text style={styles.emailHighlight}>{email || 'your email'}</Text>.
            </Text>
          </View>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={Colors.status.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.form}>
            <Input
              label="6-Digit Verification Code"
              placeholder="123456"
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={6}
              style={styles.otpInput}
              leftIcon={<Ionicons name="keypad-outline" size={18} color={Colors.neutral[400]} />}
            />

            <Button
              title="Verify Code"
              onPress={handleVerify}
              isLoading={isLoading}
              style={styles.submitButton}
            />

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              {countdown > 0 ? (
                <Text style={styles.countdownText}>Resend in {countdown}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={isResending}>
                  <Text style={styles.resendLink}>
                    {isResending ? 'Resending...' : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
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
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 300,
  },
  emailHighlight: {
    fontWeight: '600',
    color: Colors.neutral[800],
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
  otpInput: {
    letterSpacing: 6,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  submitButton: {
    marginTop: 8,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  resendText: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  countdownText: {
    fontSize: 14,
    color: Colors.neutral[400],
    fontWeight: '500',
  },
  resendLink: {
    fontSize: 14,
    color: Colors.primary.blue,
    fontWeight: '700',
  },
})
