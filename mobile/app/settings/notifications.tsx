import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { EmptyState } from '../../components/EmptyState'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { fetchNotifications } from '../../services/settings'
import type { NotificationItem } from '../../types/settings'
import { Ionicons } from '@expo/vector-icons'

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setErrorMessage(null)
    const res = await fetchNotifications()
    setIsLoading(false)
    setRefreshing(false)

    if (res.error) {
      setErrorMessage(res.error)
      return
    }
    setNotifications(res.notifications)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const getNotificationIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'analysis_completed':
        return 'analytics'
      case 'transformation_success':
        return 'color-wand'
      case 'upload_success':
        return 'cloud-done'
      case 'security':
        return 'shield-checkmark'
      default:
        return 'notifications'
    }
  }

  if (isLoading && !refreshing) {
    return <LoadingSpinner fullScreen message="Loading notifications..." />
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Notifications" />

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={Colors.status.error} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary.blue]}
            tintColor={Colors.primary.blue}
          />
        }
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <EmptyState
              title="No Notifications"
              description="You will receive alerts here when your dataset analyses and batch transformations complete."
              icon={<Ionicons name="notifications-outline" size={32} color={Colors.primary.blue} />}
            />
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={[styles.notificationCard, !item.is_read ? styles.unreadCard : undefined]}>
            <View style={styles.row}>
              <View style={styles.iconWrapper}>
                <Ionicons name={getNotificationIcon(item.type)} size={20} color={Colors.primary.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!item.is_read && <Badge label="New" variant="info" />}
                </View>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.date}>
                  {new Date(item.created_at).toLocaleDateString()} at{' '}
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          </Card>
        )}
      />
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
    paddingBottom: 32,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.status.errorBg,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: Colors.status.errorText,
    fontWeight: '500',
  },
  emptyCard: {
    padding: 12,
  },
  notificationCard: {
    padding: 16,
    marginBottom: 10,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.blue,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.neutral[900],
    flex: 1,
    marginRight: 8,
  },
  message: {
    fontSize: 13,
    color: Colors.neutral[600],
    lineHeight: 18,
    marginBottom: 6,
  },
  date: {
    fontSize: 11,
    color: Colors.neutral[400],
  },
})
