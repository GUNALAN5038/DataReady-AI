import React from 'react'
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native'
import { Colors } from '../constants/colors'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'

export interface ButtonProps extends TouchableOpacityProps {
  title: string
  variant?: ButtonVariant
  isLoading?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function Button({
  title,
  variant = 'primary',
  isLoading = false,
  disabled,
  style,
  textStyle,
  leftIcon,
  rightIcon,
  ...rest
}: ButtonProps) {
  const isActionDisabled = disabled || isLoading

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isActionDisabled}
      style={[
        styles.base,
        styles[variant],
        isActionDisabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isActionDisabled, busy: isLoading }}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? Colors.primary.blue : Colors.neutral.white}
        />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.text, textStyles[variant], isActionDisabled && styles.disabledText, textStyle]}>
            {title}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  primary: {
    backgroundColor: Colors.primary.blue,
  },
  secondary: {
    backgroundColor: Colors.primary[50],
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary.blue,
  },
  danger: {
    backgroundColor: Colors.status.error,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.55,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabledText: {
    opacity: 0.8,
  },
})

const textStyles = StyleSheet.create({
  primary: {
    color: Colors.neutral.white,
  },
  secondary: {
    color: Colors.primary.blueDark,
  },
  outline: {
    color: Colors.primary.blue,
  },
  danger: {
    color: Colors.neutral.white,
  },
  ghost: {
    color: Colors.primary.blue,
  },
})
