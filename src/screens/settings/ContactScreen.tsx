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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MessageCircle, ExternalLink, HelpCircle, FileText } from 'lucide-react-native';
import { useToast } from '../../contexts/ToastContext';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { RootStackParamList } from '../../types';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Contact'>;
}

// GoogleフォームのURL（実際のURLに置き換えてください）
const GOOGLE_FORM_URL = 'https://forms.gle/YOUR_FORM_ID';

export const ContactScreen: React.FC<Props> = ({ navigation }) => {
  const { showToast } = useToast();

  const handleFormPress = async () => {
    try {
      const canOpen = await Linking.canOpenURL(GOOGLE_FORM_URL);
      if (canOpen) {
        await Linking.openURL(GOOGLE_FORM_URL);
      } else {
        showToast('フォームを開けませんでした', 'error');
      }
    } catch (error) {
      showToast('フォームを開けませんでした', 'error');
    }
  };

  const handleFAQPress = () => {
    navigation.navigate('FAQ');
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
        <Text style={styles.sectionTitle}>まずはFAQをご確認ください</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={handleFAQPress}>
            <View style={styles.menuIconContainer}>
              <HelpCircle size={20} color={colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>よくある質問</Text>
              <Text style={styles.menuDescription}>
                よくあるご質問とその回答
              </Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
        <Text style={styles.sectionTitle}>問題が解決しない場合</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={handleFormPress}>
            <View style={styles.menuIconContainer}>
              <FileText size={20} color={colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>お問い合わせフォーム</Text>
              <Text style={styles.menuDescription}>
                ご質問・ご要望・不具合報告など
              </Text>
            </View>
            <ExternalLink size={16} color={colors.gray[400]} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.infoSection}>
        <Text style={styles.infoTitle}>対応時間</Text>
        <Text style={styles.infoText}>
          通常、2〜3営業日以内にご返信いたします。
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>お問い合わせ時のお願い</Text>
        <View style={styles.tipsList}>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              ご利用のプラットフォーム（iOS/Android/Web）
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              問題が発生した画面・操作手順
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              エラーメッセージ（表示されている場合）
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              スクリーンショット（可能な場合）
            </Text>
          </View>
        </View>
        <Text style={styles.tipsNote}>
          詳しい情報をご提供いただくことで、より迅速に対応できます。
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
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
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
  menuArrow: {
    fontSize: typography.fontSize.xl,
    color: colors.gray[400],
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
    fontWeight: '600',
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    textAlign: 'center',
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
    marginBottom: spacing.md,
  },
  tipsList: {
    marginBottom: spacing.md,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  tipBullet: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginRight: spacing.xs,
    width: 16,
  },
  tipText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    lineHeight: typography.fontSize.sm * 1.6,
  },
  tipsNote: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    lineHeight: typography.fontSize.xs * 1.6,
  },
});
