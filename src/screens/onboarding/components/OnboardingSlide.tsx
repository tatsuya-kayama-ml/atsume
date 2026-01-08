import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import {
  CalendarCheck,
  PlusCircle,
  Users,
  Trophy,
  Ticket,
  ClipboardList,
  LucideIcon,
} from 'lucide-react-native';
import { colors, typography, spacing, borderRadius } from '../../../constants/theme';

const { width } = Dimensions.get('window');

// アイコンマッピング
const ICONS: Record<string, LucideIcon> = {
  'calendar-check': CalendarCheck,
  'plus-circle': PlusCircle,
  users: Users,
  trophy: Trophy,
  ticket: Ticket,
  'clipboard-list': ClipboardList,
};

interface OnboardingSlideProps {
  icon: string;
  title: string;
  description: string;
  backgroundColor: string;
  badge?: string;
}

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({
  icon,
  title,
  description,
  backgroundColor,
  badge,
}) => {
  const IconComponent = ICONS[icon] || CalendarCheck;

  // バッジの色を決定
  const getBadgeStyle = () => {
    if (badge === '参加者向け') {
      return { backgroundColor: colors.success, color: colors.white };
    }
    if (badge === '主催者向け') {
      return { backgroundColor: colors.primary, color: colors.white };
    }
    return { backgroundColor: colors.gray[200], color: colors.gray[700] };
  };

  const badgeStyle = getBadgeStyle();

  return (
    <View style={styles.container}>
      {badge && (
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          style={[styles.badge, { backgroundColor: badgeStyle.backgroundColor }]}
        >
          <Text style={[styles.badgeText, { color: badgeStyle.color }]}>{badge}</Text>
        </Animated.View>
      )}

      <Animated.View
        entering={FadeInUp.delay(100).duration(600)}
        style={[styles.iconContainer, { backgroundColor }]}
      >
        <IconComponent size={80} color={colors.primary} strokeWidth={1.5} />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300).duration(600)}
        style={styles.textContainer}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  badge: {
    position: 'absolute',
    top: 60,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  iconContainer: {
    width: width * 0.45,
    height: width * 0.45,
    borderRadius: width * 0.225,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: typography.fontSize.lg,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: typography.fontSize.lg * 1.6,
  },
});
