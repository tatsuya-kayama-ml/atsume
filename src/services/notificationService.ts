import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Event } from '../types';
import { logger } from '../utils';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  // Request notification permissions
  requestPermissions: async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      // Web notifications not supported in this version
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  },

  // Schedule event reminder notification
  scheduleEventReminder: async (
    event: Event,
    minutesBefore: number = 60
  ): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return null;
    }

    try {
      const eventDate = new Date(event.date_time);
      const triggerDate = new Date(eventDate.getTime() - minutesBefore * 60 * 1000);

      // Don't schedule if the trigger time is in the past
      if (triggerDate <= new Date()) {
        return null;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'イベントリマインダー 📅',
          body: `${event.name} がまもなく始まります`,
          data: { eventId: event.id, type: 'event_reminder' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      return identifier;
    } catch (error) {
      logger.error('Failed to schedule notification:', error);
      return null;
    }
  },

  // Schedule multiple reminders for an event
  scheduleEventReminders: async (
    event: Event,
    reminderMinutes: number[] = [60, 1440] // 1 hour and 24 hours before
  ): Promise<string[]> => {
    const identifiers: string[] = [];

    for (const minutes of reminderMinutes) {
      const id = await notificationService.scheduleEventReminder(event, minutes);
      if (id) {
        identifiers.push(id);
      }
    }

    return identifiers;
  },

  // Cancel a scheduled notification
  cancelNotification: async (identifier: string): Promise<void> => {
    if (Platform.OS === 'web') return;
    await Notifications.cancelScheduledNotificationAsync(identifier);
  },

  // Cancel all scheduled notifications for an event
  cancelEventNotifications: async (eventId: string): Promise<void> => {
    if (Platform.OS === 'web') return;

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.data?.eventId === eventId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  },

  // Get all scheduled notifications
  getScheduledNotifications: async () => {
    if (Platform.OS === 'web') return [];
    return await Notifications.getAllScheduledNotificationsAsync();
  },

  // Cancel all scheduled notifications
  cancelAllNotifications: async (): Promise<void> => {
    if (Platform.OS === 'web') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  // Send immediate notification (for testing)
  sendImmediateNotification: async (
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> => {
    if (Platform.OS === 'web') return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // null means immediately
    });
  },

  // Get push notification token
  getPushToken: async (): Promise<string | null> => {
    if (Platform.OS === 'web') return null;

    try {
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
      if (!projectId) {
        logger.warn('EXPO_PUBLIC_PROJECT_ID is not set');
        return null;
      }
      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      return token.data;
    } catch (error) {
      logger.error('Failed to get push token:', error);
      return null;
    }
  },

  // Format reminder time for display
  formatReminderTime: (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}分前`;
    } else if (minutes < 1440) {
      return `${Math.floor(minutes / 60)}時間前`;
    } else {
      return `${Math.floor(minutes / 1440)}日前`;
    }
  },
};
