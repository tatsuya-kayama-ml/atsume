import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Bell, X, Check } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { notificationService } from '../../services/notificationService';
import { Event } from '../../types';
import { Button } from '../common';

interface ReminderModalProps {
  visible: boolean;
  onClose: () => void;
  event: Event;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const REMINDER_OPTIONS = [
  { value: 15, label: '15分前' },
  { value: 30, label: '30分前' },
  { value: 60, label: '1時間前' },
  { value: 180, label: '3時間前' },
  { value: 1440, label: '1日前' },
];

export const ReminderModal: React.FC<ReminderModalProps> = ({
  visible,
  onClose,
  event,
  onSuccess,
  onError,
}) => {
  const [selectedReminders, setSelectedReminders] = useState<number[]>([60]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleReminder = (value: number) => {
    setSelectedReminders((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const handleSetReminders = async () => {
    if (selectedReminders.length === 0) {
      onError('リマインダーを選択してください');
      return;
    }

    setIsLoading(true);

    try {
      // Request permissions first
      const hasPermission = await notificationService.requestPermissions();

      if (!hasPermission) {
        onError('通知の許可が必要です。設定から通知を有効にしてください。');
        setIsLoading(false);
        return;
      }

      // Cancel existing notifications for this event
      await notificationService.cancelEventNotifications(event.id);

      // Schedule new reminders
      const identifiers = await notificationService.scheduleEventReminders(
        event,
        selectedReminders
      );

      if (identifiers.length > 0) {
        const reminderTexts = selectedReminders
          .map((m) => notificationService.formatReminderTime(m))
          .join('、');
        onSuccess(`${reminderTexts}にリマインダーを設定しました`);
      } else {
        onError('リマインダーの設定に失敗しました。イベントが過去の日時の可能性があります。');
      }

      onClose();
    } catch (error: any) {
      onError(error.message || 'リマインダーの設定に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <View style={styles.headerIconContainer}>
                <Bell size={24} color={colors.primary} />
              </View>
              <Text style={styles.title}>リマインダー</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={24} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            <View style={styles.webMessage}>
              <Text style={styles.webMessageText}>
                リマインダー機能はモバイルアプリでのみ利用可能です
              </Text>
            </View>

            <Button title="閉じる" onPress={onClose} fullWidth variant="outline" />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerIconContainer}>
              <Bell size={24} color={colors.primary} />
            </View>
            <Text style={styles.title}>リマインダー設定</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={colors.gray[500]} />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            イベント開始前に通知を受け取るタイミングを選択してください
          </Text>

          <View style={styles.optionsContainer}>
            {REMINDER_OPTIONS.map((option) => {
              const isSelected = selectedReminders.includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected,
                  ]}
                  onPress={() => toggleReminder(option.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Check size={16} color={colors.white} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Button
              title="キャンセル"
              onPress={onClose}
              variant="outline"
              style={styles.cancelButton}
            />
            <Button
              title="設定する"
              onPress={handleSetReminders}
              loading={isLoading}
              disabled={selectedReminders.length === 0}
              style={styles.confirmButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  closeButton: {
    padding: spacing.xs,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.lg,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  optionsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  optionButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.gray[700],
  },
  optionTextSelected: {
    color: colors.white,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
  webMessage: {
    padding: spacing.lg,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  webMessageText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
  },
});
