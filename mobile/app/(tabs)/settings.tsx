import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Colors } from '../../constants/colors'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { useAuth } from '../../hooks/useAuth'
import { fetchUserProfile, fetchApiKeys } from '../../services/settings'
import type { UserProfile } from '../../types/auth'
import { Ionicons } from '@expo/vector-icons'

export default function SettingsScreen() {
  const router = useRouter()
  const { user, signOut } = useAuth()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [hasCustomKey, setHasCustomKey] = useState<boolean>(false)
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false)

  useEffect(() => {
    fetchUserProfile().then(res => setProfile(res.profile))
    fetchApiKeys().then(res => setHasCustomKey(res.keys.length > 0))
  }, [])

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of DataReady AI?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true)
          await signOut()
          setIsLoggingOut(false)
          router.replace('/(auth)/welcome')
        },
      },
    ])
  }

  const displayName = profile?.fullName || (user?.user_metadata?.full_name as string) || 'Data Scientist'
  const displayEmail = user?.email || 'user@dataready.ai'

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage account, AI provider keys, and security settings.</Text>
        </View>

        {/* User Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileEmail}>{displayEmail}</Text>
            <Badge label="Authenticated" variant="success" style={{ marginTop: 6 }} />
          </View>
        </Card>

        {/* Settings Navigation Options */}
        <Text style={styles.sectionHeader}>Preferences & Integrations</Text>
        <Card style={styles.menuCard}>
          <SettingMenuItem
            icon="key-outline"
            title="AI Provider Keys"
            subtitle={hasCustomKey ? 'Custom Gemini API Key active' : 'Using system default key'}
            badge={hasCustomKey ? 'Active' : 'Default'}
            badgeVariant={hasCustomKey ? 'success' : 'neutral'}
            onPress={() => router.push('/settings/keys')}
          />

          <View style={styles.separator} />

          <SettingMenuItem
            icon="person-outline"
            title="Profile Information"
            subtitle="Update display name and preferences"
            onPress={() => router.push('/settings/profile')}
          />

          <View style={styles.separator} />

          <SettingMenuItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="View analysis completions and alerts"
            onPress={() => router.push('/settings/notifications')}
          />
        </Card>

        {/* Security & System Info */}
        <Text style={styles.sectionHeader}>Security & Architecture</Text>
        <Card style={styles.securityCard}>
          <SecurityRow
            icon="lock-closed"
            title="AES-256-GCM Encryption"
            description="Provider keys are encrypted exclusively on the server with authenticated Galois/Counter Mode."
          />
          <View style={styles.separator} />
          <SecurityRow
            icon="shield-checkmark"
            title="Row-Level Security (RLS)"
            description="All dataset queries and file downloads enforce user-level isolation using Supabase Auth."
          />
          <View style={styles.separator} />
          <SecurityRow
            icon="phone-portrait"
            title="Client Token Storage"
            description="Authentication sessions persist securely via Expo SecureStore."
          />
        </Card>

        {/* Logout Action */}
        <Button
          title="Sign Out"
          variant="outline"
          onPress={handleLogout}
          isLoading={isLoggingOut}
          style={styles.logoutButton}
          textStyle={{ color: Colors.status.error }}
        />

        <Text style={styles.versionText}>DataReady AI Mobile v1.0.0 (Expo SDK 58)</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function SettingMenuItem({
  icon,
  title,
  subtitle,
  badge,
  badgeVariant = 'neutral',
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle: string
  badge?: string
  badgeVariant?: 'success' | 'warning' | 'error' | 'info' | 'neutral'
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuIconContainer}>
        <Ionicons name={icon} size={20} color={Colors.primary.blue} />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      {badge && <Badge label={badge} variant={badgeVariant} style={styles.menuBadge} />}
      <Ionicons name="chevron-forward" size={18} color={Colors.neutral[400]} />
    </TouchableOpacity>
  )
}

function SecurityRow({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
}) {
  return (
    <View style={styles.securityRow}>
      <View style={styles.securityIconContainer}>
        <Ionicons name={icon} size={18} color={Colors.primary.blue} />
      </View>
      <View style={styles.securityTextContainer}>
        <Text style={styles.securityTitle}>{title}</Text>
        <Text style={styles.securityDescription}>{description}</Text>
      </View>
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
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.neutral[900],
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginBottom: 24,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.neutral.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  profileEmail: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.neutral[700],
    marginBottom: 10,
    marginLeft: 4,
  },
  menuCard: {
    padding: 0,
    marginBottom: 24,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: Colors.neutral[500],
  },
  menuBadge: {
    marginRight: 8,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.neutral[100],
    marginLeft: 64,
  },
  securityCard: {
    padding: 16,
    marginBottom: 28,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  securityIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  securityTextContainer: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  securityDescription: {
    fontSize: 12,
    color: Colors.neutral[500],
    lineHeight: 17,
  },
  logoutButton: {
    borderColor: Colors.status.error,
    marginBottom: 16,
  },
  versionText: {
    fontSize: 12,
    color: Colors.neutral[400],
    textAlign: 'center',
  },
})
