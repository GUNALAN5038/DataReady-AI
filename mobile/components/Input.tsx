import React, { useState } from 'react'
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native'
import { Colors } from '../constants/colors'
import { Ionicons } from '@expo/vector-icons'

export interface InputProps extends TextInputProps {
  label?: string
  error?: string | null
  helperText?: string
  isPassword?: boolean
  containerStyle?: ViewStyle
  leftIcon?: React.ReactNode
}

export function Input({
  label,
  error,
  helperText,
  isPassword = false,
  containerStyle,
  leftIcon,
  style,
  ...rest
}: InputProps) {
  const [showPassword, setShowPassword] = useState(!isPassword)
  const [isFocused, setIsFocused] = useState(false)

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.focused,
          !!error && styles.errorBorder,
        ]}
      >
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}

        <TextInput
          placeholderTextColor={Colors.neutral[400]}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.input, style]}
          accessibilityLabel={label}
          {...rest}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.rightIconContainer}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.neutral[500]}
            />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.neutral[700],
    marginBottom: 6,
  },
  inputContainer: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Colors.neutral[200],
    backgroundColor: Colors.neutral.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  focused: {
    borderColor: Colors.primary.blue,
    backgroundColor: Colors.neutral.white,
  },
  errorBorder: {
    borderColor: Colors.status.error,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: Colors.neutral[900],
  },
  leftIconContainer: {
    marginRight: 8,
  },
  rightIconContainer: {
    marginLeft: 8,
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: Colors.status.error,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 4,
  },
})
