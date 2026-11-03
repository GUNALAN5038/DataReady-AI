import React from 'react'
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native'
import { Card } from './Card'
import { Colors } from '../constants/colors'

export interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  variant?: 'blue' | 'indigo' | 'neutral' | 'success'
  style?: StyleProp<ViewStyle>
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'neutral',
  style,
}: MetricCardProps) {
  return (
    <Card style={[styles.card, variantStyles[variant], style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
      </View>
      <Text style={[styles.value, valueStyles[variant]]}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    flex: 1,
    minWidth: 140,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.neutral[600],
  },
  iconContainer: {
    marginLeft: 6,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  subtitle: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 4,
  },
})

const variantStyles = StyleSheet.create({
  blue: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.blue,
  },
  indigo: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary[500],
  },
  neutral: {
    borderLeftWidth: 1,
    borderColor: Colors.card.border,
  },
  success: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.status.success,
  },
})

const valueStyles = StyleSheet.create({
  blue: {
    color: Colors.primary.blueDark,
  },
  indigo: {
    color: Colors.primary[700],
  },
  neutral: {
    color: Colors.neutral[900],
  },
  success: {
    color: Colors.status.success,
  },
})
