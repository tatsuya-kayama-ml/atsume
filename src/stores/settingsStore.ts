import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  eventReminders: boolean;
  paymentReminders: boolean;
  eventUpdates: boolean;
}

interface SettingsState {
  notifications: NotificationSettings;

  // Actions
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  togglePushNotifications: () => void;
  toggleEmailNotifications: () => void;
  toggleEventReminders: () => void;
  togglePaymentReminders: () => void;
  toggleEventUpdates: () => void;
}

const defaultNotificationSettings: NotificationSettings = {
  pushEnabled: true,
  emailEnabled: true,
  eventReminders: true,
  paymentReminders: true,
  eventUpdates: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notifications: defaultNotificationSettings,

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
    }),
    {
      name: 'atsume-settings',
      storage: createJSONStorage(() =>
        Platform.OS === 'web'
          ? localStorage
          : AsyncStorage
      ),
    }
  )
);
