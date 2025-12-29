import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { useSettingsStore, ThemeMode } from '../stores/settingsStore';
import { colors, darkColors, lightColors } from '../constants/theme';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryGradient: string[];
  primarySoft: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  secondaryGradient: string[];
  secondarySoft: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  success: string;
  successLight: string;
  successSoft: string;
  warning: string;
  warningLight: string;
  warningSoft: string;
  error: string;
  errorLight: string;
  errorSoft: string;
  info: string;
  infoLight: string;
  infoSoft: string;
  white: string;
  black: string;
  gray: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  border: string;
  overlay: string;
  overlayLight: string;
  teamColors: string[];
  attending: string;
  attendingSoft: string;
  notAttending: string;
  notAttendingSoft: string;
  maybe: string;
  maybeSoft: string;
  pending: string;
  pendingSoft: string;
  paid: string;
  paidSoft: string;
  unpaid: string;
  unpaidSoft: string;
  pendingConfirmation: string;
  pendingConfirmationSoft: string;
}

interface ThemeContextValue {
  isDarkMode: boolean;
  themeMode: ThemeMode;
  theme: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isDarkMode, themeMode, setThemeMode, updateSystemTheme } = useSettingsStore();

  useEffect(() => {
    // Listen to system appearance changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      updateSystemTheme();
    });

    return () => {
      subscription.remove();
    };
  }, [updateSystemTheme]);

  // Create theme object based on isDarkMode
  const theme: ThemeColors = isDarkMode
    ? {
        ...colors,
        ...darkColors,
        gray: {
          50: '#1F2937',
          100: '#374151',
          200: '#4B5563',
          300: '#6B7280',
          400: '#9CA3AF',
          500: '#D1D5DB',
          600: '#E5E7EB',
          700: '#F3F4F6',
          800: '#F9FAFB',
          900: '#FFFFFF',
          950: '#FFFFFF',
        },
      }
    : {
        ...colors,
        ...lightColors,
      };

  return (
    <ThemeContext.Provider value={{ isDarkMode, themeMode, theme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
