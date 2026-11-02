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

export default function SignupScreen() {
  const router = useRouter()
  const { signUp } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const evaluatePasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: Colors.neutral[300] }
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++

    if (score <= 1) return { score: 1, label: 'Weak', color: Colors.status.error }
    if (score === 2) return { score: 2, label: 'Fair', color: Colors.status.warning }
    if (score === 3) return { score: 3, label: 'Good', color: Colors.primary.blue }
    return { score: 4, label: 'Strong', color: Colors.status.success }
  }

  const pwdStrength = evaluatePasswordStrength(password)

  const handleSignup = async () => {
    setErrorMessage(null)

    const trimmedEmail = email.trim()
    const trimmedName = fullName.trim()

    if (!trimmedName) {
      setErrorMessage('Please enter your full name.')
      return
    }
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.')
      return
    }
    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setIsLoading(true)
    const { error, requiresOtp } = await signUp(trimmedEmail, password, trimmedName)
    setIsLoading(false)

    if (error) {
      setErrorMessage(error)
      return
    }

    if (requiresOtp) {
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { email: trimmedEmail, type: 'signup' },
      })
    } else {
      router.replace('/(tabs)')
    }
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Start preparing and transforming your datasets with DataReady AI.
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
              label="Full Name"
              placeholder="Alex Morgan"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              leftIcon={<Ionicons name="person-outline" size={18} color={Colors.neutral[400]} />}
            />

            <Input
              label="Email Address"
              placeholder="alex@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<Ionicons name="mail-outline" size={18} color={Colors.neutral[400]} />}
            />

            <Input
              label="Password"
              placeholder="At least 8 characters"
              value={password}
              onChangeText={setPassword}
              isPassword
              autoCapitalize="none"
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={Colors.neutral[400]} />}
            />

            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4].map(idx => (
                    <View
                      key={idx}
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            idx <= pwdStrength.score ? pwdStrength.color : Colors.neutral[200],
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: pwdStrength.color }]}>
                  {pwdStrength.label}
                </Text>
              </View>
            )}

            <Input
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
              autoCapitalize="none"
              leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color={Colors.neutral[400]} />}
            />

            <Button
              title="Create Account"
              onPress={handleSignup}
              isLoading={isLoading}
              style={styles.submitButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
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
    marginBottom: 24,
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
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -8,
    marginBottom: 16,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
    marginRight: 12,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 8,
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
