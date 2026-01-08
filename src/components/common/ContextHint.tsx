import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { X, Lightbulb } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { useOnboardingStore, TooltipId, TOOLTIP_CONTENT } from '../../stores/onboardingStore';

interface ContextHintProps {
  tooltipId: TooltipId;
  // 表示を制御するための条件（例: 主催者のみ、参加者のみ）
  show?: boolean;
  // 表示位置
  position?: 'top' | 'bottom';
  // 表示までの遅延（ms）
  delay?: number;
}

/**
 * コンテキストに応じたヒントを表示するコンポーネント
 * 初回表示後は自動的に非表示になり、再度表示されない
 */
export const ContextHint: React.FC<ContextHintProps> = ({
  tooltipId,
  show = true,
  position = 'bottom',
  delay = 500,
}) => {
  const { shouldShowTooltip, markTooltipAsShown, hasCompletedWalkthrough } = useOnboardingStore();
  const [visible, setVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const content = TOOLTIP_CONTENT[tooltipId];

  useEffect(() => {
    // オンボーディング完了後、表示条件を満たし、まだ表示していない場合
    if (show && hasCompletedWalkthrough && shouldShowTooltip(tooltipId)) {
      const timer = setTimeout(() => {
        setVisible(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [show, hasCompletedWalkthrough, tooltipId, delay]);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      markTooltipAsShown(tooltipId);
    });
  };

  if (!visible || !content) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'top' ? styles.positionTop : styles.positionBottom,
        { opacity: fadeAnim },
      ]}
    >
      <View style={styles.iconContainer}>
        <Lightbulb size={18} color={colors.warning} />
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.message}>{content.message}</Text>
      </View>
      <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
        <X size={18} color={colors.gray[400]} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    ...shadows.md,
  },
  positionTop: {
    marginTop: spacing.md,
  },
  positionBottom: {
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warningSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 2,
  },
  message: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    lineHeight: typography.fontSize.xs * 1.5,
  },
  closeButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
});
