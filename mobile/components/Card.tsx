import React from 'react'
import { View, StyleSheet, ViewStyle, ViewProps, StyleProp } from 'react-native'
import { Colors } from '../constants/colors'

export interface CardProps extends ViewProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  variant?: 'elevated' | 'outlined' | 'flat'
}

export function Card({ children, style, variant = 'elevated', ...rest }: CardProps) {
  return (
    <View style={[styles.base, styles[variant], style]} {...rest}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: Colors.card.background,
  },
  elevated: {
    borderWidth: 1,
    borderColor: Colors.card.border,
    elevation: 2,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  outlined: {
    borderWidth: 1.5,
    borderColor: Colors.neutral[200],
  },
  flat: {
    backgroundColor: Colors.neutral[50],
  },
})
