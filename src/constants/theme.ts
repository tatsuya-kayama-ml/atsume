// ATSUME Design System
// Modern, clean UI with subtle gradients and refined typography

// Color palette - Refined and modern
export const colors = {
  // Primary colors - Vibrant blue with depth
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  primaryGradient: ['#2563EB', '#3B82F6'],
  primarySoft: '#EFF6FF',

  // Secondary colors - Fresh teal
  secondary: '#0D9488',
  secondaryLight: '#14B8A6',
  secondaryDark: '#0F766E',
  secondaryGradient: ['#0D9488', '#14B8A6'],
  secondarySoft: '#F0FDFA',

  // Accent colors
  accent: '#8B5CF6',
  accentLight: '#A78BFA',
  accentDark: '#7C3AED',

  // Status colors - Refined and accessible
  success: '#059669',
  successLight: '#10B981',
  successSoft: '#ECFDF5',
  warning: '#D97706',
  warningLight: '#F59E0B',
  warningSoft: '#FFFBEB',
  error: '#DC2626',
  errorLight: '#EF4444',
  errorSoft: '#FEF2F2',
  info: '#0284C7',
  infoLight: '#0EA5E9',
  infoSoft: '#F0F9FF',

  // Neutral colors - Refined grays
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },

  // Attendance status colors
  attending: '#059669',
  attendingSoft: '#ECFDF5',
  notAttending: '#DC2626',
  notAttendingSoft: '#FEF2F2',
  maybe: '#D97706',
  maybeSoft: '#FFFBEB',
  pending: '#6B7280',
  pendingSoft: '#F3F4F6',

  // Payment status colors
  paid: '#059669',
  paidSoft: '#ECFDF5',
  unpaid: '#DC2626',
  unpaidSoft: '#FEF2F2',
  pendingConfirmation: '#D97706',
  pendingConfirmationSoft: '#FFFBEB',

  // Team colors - Vibrant and distinguishable
  teamColors: [
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#84CC16', // Lime
    '#6366F1', // Indigo
  ],

  // Background colors
  background: '#F8FAFC',
  backgroundAlt: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

// Typography - Modern and readable
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  fontSize: {
    '2xs': 10,
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  letterSpacing: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
  },
};

// Spacing - 4px base unit
export const spacing = {
  '2xs': 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 80,
};

// Border radius - Smooth curves
export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

// Shadows - Subtle and layered
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 12,
  },
  // Colored shadows for emphasis
  primary: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  success: {
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
};

// Animation durations
export const animation = {
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
};

// Common styles
export const commonStyles = {
  // Card styles
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardElevated: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
};

// Dark mode colors (for future use)
export const darkColors = {
  ...colors,
  background: '#0F172A',
  backgroundAlt: '#1E293B',
  surface: '#1E293B',
  surfaceElevated: '#334155',
  text: colors.white,
  textSecondary: colors.gray[400],
  border: colors.gray[700],
};

// Light mode colors
export const lightColors = {
  ...colors,
  background: colors.background,
  backgroundAlt: colors.backgroundAlt,
  surface: colors.white,
  surfaceElevated: colors.white,
  text: colors.gray[900],
  textSecondary: colors.gray[500],
  border: colors.gray[200],
};
