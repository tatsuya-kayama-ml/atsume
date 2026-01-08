import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import {
  CalendarCheck,
  PlusCircle,
  Users,
  Trophy,
  LucideIcon,
} from 'lucide-react-native';
import { colors, typography, spacing } from '../../../constants/theme';

const { width } = Dimensions.get('window');

// アイコンマッピング
const ICONS: Record<string, LucideIcon> = {
  'calendar-check': CalendarCheck,
  'plus-circle': PlusCircle,
  users: Users,
  trophy: Trophy,
};

interface OnboardingSlideProps {
  icon: string;
  title: string;
  description: string;
  backgroundColor: string;
}

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({
  icon,
  title,
  description,
  backgroundColor,
}) => {
  const IconComponent = ICONS[icon] || CalendarCheck;

  return (
    <View style={styles.container}>
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
  iconContainer: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
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
