import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Appearance } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  eventReminders: boolean;
  paymentReminders: boolean;
  eventUpdates: boolean;
}

interface SettingsState {
  notifications: NotificationSettings;
  themeMode: ThemeMode;
  isDarkMode: boolean;

  // Actions
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  togglePushNotifications: () => void;
  toggleEmailNotifications: () => void;
  toggleEventReminders: () => void;
  togglePaymentReminders: () => void;
  toggleEventUpdates: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  updateSystemTheme: () => void;
}

const defaultNotificationSettings: NotificationSettings = {
  pushEnabled: true,
  emailEnabled: true,
  eventReminders: true,
  paymentReminders: true,
  eventUpdates: true,
};

// Get system dark mode preference
const getSystemIsDark = (): boolean => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === 'dark';
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      notifications: defaultNotificationSettings,
      themeMode: 'system' as ThemeMode,
      isDarkMode: getSystemIsDark(),

      updateNotificationSettings: (settings) =>
        set((state) => ({
          notifications: { ...state.notifications, ...settings },
        })),

      togglePushNotifications: () =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            pushEnabled: !state.notifications.pushEnabled,
          },
        })),

      toggleEmailNotifications: () =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            emailEnabled: !state.notifications.emailEnabled,
          },
        })),

      toggleEventReminders: () =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            eventReminders: !state.notifications.eventReminders,
          },
        })),

      togglePaymentReminders: () =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            paymentReminders: !state.notifications.paymentReminders,
          },
        })),

      toggleEventUpdates: () =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            eventUpdates: !state.notifications.eventUpdates,
          },
        })),

      setThemeMode: (mode: ThemeMode) =>
        set(() => {
          let isDark: boolean;
          if (mode === 'system') {
            isDark = getSystemIsDark();
          } else {
            isDark = mode === 'dark';
          }
          return { themeMode: mode, isDarkMode: isDark };
        }),

      updateSystemTheme: () =>
        set((state) => {
          if (state.themeMode === 'system') {
            return { isDarkMode: getSystemIsDark() };
          }
          return {};
        }),
    }),
    {
      name: 'atsume-settings',
      storage: createJSONStorage(() =>
        Platform.OS === 'web'
          ? localStorage
          : AsyncStorage
      ),
      partialize: (state) => ({
        notifications: state.notifications,
        themeMode: state.themeMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Update isDarkMode based on stored themeMode after rehydration
          if (state.themeMode === 'system') {
            state.isDarkMode = getSystemIsDark();
          } else {
            state.isDarkMode = state.themeMode === 'dark';
          }
        }
      },
    }
  )
);
