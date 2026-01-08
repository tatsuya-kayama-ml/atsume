import React from 'react';
import { View, StyleSheet, Text, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Button } from '../../../components/common';
import { colors, typography, spacing } from '../../../constants/theme';

interface OnboardingControlsProps {
  onSkip: () => void;
  onNext: () => void;
  isLastPage: boolean;
  showSkip: boolean;
}

export const OnboardingControls: React.FC<OnboardingControlsProps> = ({
  onSkip,
  onNext,
  isLastPage,
  showSkip,
}) => {
  const handleSkip = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSkip();
  };

  return (
    <View style={styles.container}>
      {showSkip ? (
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>スキップ</Text>
        </Pressable>
      ) : (
        <View style={styles.placeholder} />
      )}

      <Button
        title={isLastPage ? '始める' : '次へ'}
        onPress={onNext}
        variant="primary"
        size="lg"
        style={styles.nextButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  skipText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
    fontWeight: '500',
  },
  placeholder: {
    width: 80,
  },
  nextButton: {
    minWidth: 120,
  },
});
