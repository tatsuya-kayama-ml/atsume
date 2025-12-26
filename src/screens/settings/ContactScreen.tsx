import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Mail, MessageCircle, ExternalLink, HelpCircle } from 'lucide-react-native';
import { useToast } from '../../contexts/ToastContext';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';

const SUPPORT_EMAIL = 'support@atsume.app';
const FAQ_URL = 'https://atsume.app/faq';

export const ContactScreen: React.FC = () => {
  const { showToast } = useToast();

  const handleEmailPress = async () => {
    const subject = encodeURIComponent('ATSUMEアプリについてのお問い合わせ');
    const body = encodeURIComponent(`
【お問い合わせ内容】


【ご利用環境】
- プラットフォーム: ${Platform.OS}
- アプリバージョン: 1.0.0
    `.trim());

    const mailUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(mailUrl);
      if (canOpen) {
        await Linking.openURL(mailUrl);
      } else {
        showToast('メールアプリを開けませんでした', 'error');
      }
    } catch (error) {
      showToast('メールアプリを開けませんでした', 'error');
    }
  };

  const handleFAQPress = async () => {
    try {
      await Linking.openURL(FAQ_URL);
    } catch (error) {
      showToast('ページを開けませんでした', 'error');
    }
  };

  const copyEmail = () => {
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(SUPPORT_EMAIL);
      showToast('メールアドレスをコピーしました', 'success');
    } else {
      // For native, we could use expo-clipboard
      showToast(SUPPORT_EMAIL, 'info');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
        <View style={styles.iconContainer}>
          <MessageCircle size={32} color={colors.primary} />
        </View>
        <Text style={styles.title}>お問い合わせ</Text>
        <Text style={styles.subtitle}>
          ご質問やご要望がございましたら、{'\n'}
          お気軽にお問い合わせください。
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={handleEmailPress}>
            <View style={styles.menuIconContainer}>
              <Mail size={20} color={colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>メールでお問い合わせ</Text>
              <Text style={styles.menuDescription}>
                ご質問・ご要望・不具合報告など
              </Text>
            </View>
            <ExternalLink size={16} color={colors.gray[400]} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={handleFAQPress}>
            <View style={styles.menuIconContainer}>
              <HelpCircle size={20} color={colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>よくある質問</Text>
              <Text style={styles.menuDescription}>
                FAQ・ヘルプセンター
              </Text>
            </View>
            <ExternalLink size={16} color={colors.gray[400]} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.infoSection}>
        <Text style={styles.infoTitle}>サポート窓口</Text>
        <TouchableOpacity onPress={copyEmail}>
          <Text style={styles.infoEmail}>{SUPPORT_EMAIL}</Text>
        </TouchableOpacity>
        <Text style={styles.infoNote}>
          ※ 通常、2〜3営業日以内にご返信いたします。
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>お問い合わせ時のお願い</Text>
        <View style={styles.tipsList}>
          <Text style={styles.tipItem}>• ご利用のプラットフォーム（iOS/Android/Web）</Text>
          <Text style={styles.tipItem}>• 問題が発生した画面・操作</Text>
          <Text style={styles.tipItem}>• エラーメッセージ（表示されている場合）</Text>
        </View>
        <Text style={styles.tipsNote}>
          これらの情報をお知らせいただくと、スムーズに対応できます。
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
  header: {
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * 1.6,
  },
  section: {
    padding: spacing.md,
    marginTop: spacing.lg,
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
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  infoTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.sm,
  },
  infoEmail: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  infoNote: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[400],
  },
  tipsSection: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.lg,
  },
  tipsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  tipsList: {
    marginBottom: spacing.sm,
  },
  tipItem: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    lineHeight: typography.fontSize.sm * 1.8,
  },
  tipsNote: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    fontStyle: 'italic',
  },
});
