import React from 'react'
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from 'react-native'
import { Colors } from '../constants/colors'

export interface LoadingSpinnerProps {
  message?: string
  fullScreen?: boolean
  style?: ViewStyle
}

export function LoadingSpinner({
  message = 'Loading...',
  fullScreen = false,
  style,
}: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, style]}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    )
  }

  return (
    <View style={[styles.inline, style]}>
      <ActivityIndicator size="small" color={Colors.primary.blue} />
      {message ? <Text style={styles.inlineMessage}>{message}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.default,
    padding: 24,
  },
  inline: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.neutral[600],
    textAlign: 'center',
  },
  inlineMessage: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.neutral[500],
  },
})
