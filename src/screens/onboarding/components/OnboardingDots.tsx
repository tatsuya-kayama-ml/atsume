import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors, spacing } from '../../../constants/theme';

interface OnboardingDotsProps {
  total: number;
  current: number;
}

export const OnboardingDots: React.FC<OnboardingDotsProps> = ({ total, current }) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, index) => (
        <Dot key={index} isActive={index === current} />
      ))}
    </View>
  );
};

const Dot: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    width: withSpring(isActive ? 24 : 8, { damping: 15, stiffness: 200 }),
    backgroundColor: isActive ? colors.primary : colors.gray[300],
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
