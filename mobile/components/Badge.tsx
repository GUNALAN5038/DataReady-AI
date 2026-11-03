import React from 'react'
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import { Colors } from '../constants/colors'

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'

export interface BadgeProps {
  label: string
  variant?: BadgeVariant
  style?: ViewStyle
  textStyle?: TextStyle
}

export function Badge({ label, variant = 'neutral', style, textStyle }: BadgeProps) {
  return (
    <View style={[styles.badge, badgeStyles[variant], style]}>
      <Text style={[styles.text, textStyles[variant], textStyle]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
})

const badgeStyles = StyleSheet.create({
  success: {
    backgroundColor: Colors.status.successBg,
  },
  warning: {
    backgroundColor: Colors.status.warningBg,
  },
  error: {
    backgroundColor: Colors.status.errorBg,
  },
  info: {
    backgroundColor: Colors.status.infoBg,
  },
  neutral: {
    backgroundColor: Colors.neutral[100],
  },
})

const textStyles = StyleSheet.create({
  success: {
    color: Colors.status.successText,
  },
  warning: {
    color: Colors.status.warningText,
  },
  error: {
    color: Colors.status.errorText,
  },
  info: {
    color: Colors.status.infoText,
  },
  neutral: {
    color: Colors.neutral[700],
  },
})
