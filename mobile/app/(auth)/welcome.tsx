import React, { useEffect } from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Colors } from '../../constants/colors'
import { Button } from '../../components/Button'
import { useAuth } from '../../hooks/useAuth'
import { Ionicons } from '@expo/vector-icons'

export default function WelcomeScreen() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)')
    }
  }, [isAuthenticated, isLoading, router])

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} bounces={false}>
        <View style={styles.heroSection}>
          <View style={styles.logoBadge}>
            <Ionicons name="analytics" size={38} color={Colors.primary.blue} />
          </View>
          <Text style={styles.title}>DataReady AI</Text>
          <Text style={styles.subtitle}>
            Intelligent Data Preparation & ML Readiness Engine
          </Text>
        </View>

        <View style={styles.featuresSection}>
          <FeatureRow
            icon="speedometer-outline"
            title="Instant ML Readiness"
            description="Score missing values, duplicate rows, outliers, and data quality in seconds."
          />
          <FeatureRow
            icon="color-wand-outline"
            title="Smart Transformations"
            description="Impute nulls, remove duplicates, and version your datasets securely."
          />
          <FeatureRow
            icon="chatbubbles-outline"
            title="AI Insights & Chat"
            description="Ask natural-language questions and receive actionable recommendations."
          />
        </View>

        <View style={styles.actionsSection}>
          <Button
            title="Sign In"
            onPress={() => router.push('/(auth)/login')}
            style={styles.primaryButton}
          />
          <Button
            title="Create an Account"
            variant="outline"
            onPress={() => router.push('/(auth)/signup')}
            style={styles.secondaryButton}
          />
          <Text style={styles.disclaimer}>
            By continuing, you agree to DataReady AI security terms.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function FeatureRow({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={22} color={Colors.primary.blue} />
      </View>
      <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.paper,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary[100],
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.neutral[900],
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 290,
  },
  featuresSection: {
    marginVertical: 12,
    gap: 18,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 3,
  },
  featureDescription: {
    fontSize: 13,
    color: Colors.neutral[500],
    lineHeight: 18,
  },
  actionsSection: {
    marginTop: 32,
    gap: 12,
  },
  primaryButton: {
    width: '100%',
  },
  secondaryButton: {
    width: '100%',
  },
  disclaimer: {
    fontSize: 11,
    color: Colors.neutral[400],
    textAlign: 'center',
    marginTop: 4,
  },
})
