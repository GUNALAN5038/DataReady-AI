import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

/**
 * Resilient cross-platform storage adapter for Supabase session persistence.
 * Uses Expo SecureStore on native devices when available, with graceful
 * fallback to AsyncStorage for web and environments where SecureStore is unavailable
 * or where session payload exceeds SecureStore payload capacity.
 */
export const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS !== 'web' && (await SecureStore.isAvailableAsync())) {
        const value = await SecureStore.getItemAsync(key)
        if (value !== null) {
          return value
        }
      }
      return await AsyncStorage.getItem(key)
    } catch {
      try {
        return await AsyncStorage.getItem(key)
      } catch {
        return null
      }
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS !== 'web' && (await SecureStore.isAvailableAsync())) {
        // SecureStore has a 2048-byte limit on some platforms.
        // For large tokens, store in AsyncStorage and clear SecureStore key.
        if (value.length <= 2000) {
          await SecureStore.setItemAsync(key, value)
          await AsyncStorage.removeItem(key).catch(() => {})
          return
        } else {
          await SecureStore.deleteItemAsync(key).catch(() => {})
        }
      }
      await AsyncStorage.setItem(key, value)
    } catch {
      try {
        await AsyncStorage.setItem(key, value)
      } catch {
        // Storage write failed
      }
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS !== 'web' && (await SecureStore.isAvailableAsync())) {
        await SecureStore.deleteItemAsync(key)
      }
    } catch {
      // Ignore
    }
    try {
      await AsyncStorage.removeItem(key)
    } catch {
      // Ignore
    }
  },
}
