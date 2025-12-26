import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Bell, Mail, Calendar, Coins, FileText } from 'lucide-react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';

export const NotificationSettingsScreen: React.FC = () => {
  const {
    notifications,
    togglePushNotifications,
    toggleEmailNotifications,
    toggleEventReminders,
    togglePaymentReminders,
    toggleEventUpdates,
  } = useSettingsStore();

  const renderSwitch = (value: boolean, onToggle: () => void) => (
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: colors.gray[300], true: colors.primary + '60' }}
      thumbColor={value ? colors.primary : colors.gray[100]}
      ios_backgroundColor={colors.gray[300]}
    />
  );

  return (
    <ScrollView style={styles.container}>
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
        <Text style={styles.sectionTitle}>通知方法</Text>
        <View style={styles.menuCard}>
          <View style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Bell size={20} color={colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>プッシュ通知</Text>
              <Text style={styles.menuDescription}>
                アプリからの通知を受け取る
              </Text>
            </View>
            {renderSwitch(notifications.pushEnabled, togglePushNotifications)}
          </View>

          <View style={styles.menuDivider} />

          <View style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Mail size={20} color={colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>メール通知</Text>
              <Text style={styles.menuDescription}>
                メールで通知を受け取る
              </Text>
            </View>
            {renderSwitch(notifications.emailEnabled, toggleEmailNotifications)}
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
        <Text style={styles.sectionTitle}>通知の種類</Text>
        <View style={styles.menuCard}>
          <View style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Calendar size={20} color={colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>イベントリマインダー</Text>
              <Text style={styles.menuDescription}>
                イベント前日・当日にリマインド
              </Text>
            </View>
            {renderSwitch(notifications.eventReminders, toggleEventReminders)}
          </View>

          <View style={styles.menuDivider} />

          <View style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Coins size={20} color={colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>支払いリマインダー</Text>
              <Text style={styles.menuDescription}>
                未払いがある場合にリマインド
              </Text>
            </View>
            {renderSwitch(notifications.paymentReminders, togglePaymentReminders)}
          </View>

          <View style={styles.menuDivider} />

          <View style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <FileText size={20} color={colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>イベント更新</Text>
              <Text style={styles.menuDescription}>
                参加イベントの変更を通知
              </Text>
            </View>
            {renderSwitch(notifications.eventUpdates, toggleEventUpdates)}
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.infoSection}>
        <Text style={styles.infoText}>
          通知設定はこのデバイスに保存されます。{'\n'}
          プッシュ通知を受け取るには、デバイスの設定でも通知を許可してください。
        </Text>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  section: {
    padding: spacing.md,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[500],
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  menuCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.gray[900],
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginLeft: spacing.md + 40 + spacing.md,
  },
  infoSection: {
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * 1.6,
  },
});
