/**
 * DataReady AI Mobile Design System — Color Palette
 * Modern blue/indigo analytics palette with accessible contrasts and crisp neutrals.
 */

export const Colors = {
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1', // Indigo accent
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
    blue: '#2563EB', // Primary Brand Blue
    blueDark: '#1D4ED8',
    blueLight: '#3B82F6',
  },
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    white: '#FFFFFF',
    black: '#000000',
  },
  status: {
    success: '#10B981',
    successBg: '#ECFDF5',
    successText: '#065F46',
    warning: '#F59E0B',
    warningBg: '#FFFBEB',
    warningText: '#92400E',
    error: '#EF4444',
    errorBg: '#FEF2F2',
    errorText: '#991B1B',
    info: '#3B82F6',
    infoBg: '#EFF6FF',
    infoText: '#1E40AF',
  },
  card: {
    background: '#FFFFFF',
    border: '#E2E8F0',
    shadow: 'rgba(15, 23, 42, 0.06)',
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    muted: '#64748B',
    inverse: '#FFFFFF',
  },
  background: {
    default: '#F8FAFC',
    paper: '#FFFFFF',
    subtle: '#F1F5F9',
  },
} as const

export type ColorPalette = typeof Colors
