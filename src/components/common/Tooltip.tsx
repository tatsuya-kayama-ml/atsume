import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, borderRadius, shadows } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TooltipPosition = 'top' | 'bottom';

interface TooltipProps {
  visible: boolean;
  title: string;
  message: string;
  onDismiss: () => void;
  targetRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  position?: TooltipPosition;
}

export const Tooltip: React.FC<TooltipProps> = ({
  visible,
  title,
  message,
  onDismiss,
  targetRect,
  position = 'bottom',
}) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      opacity.value = withSpring(1);
    } else {
      scale.value = withSpring(0);
      opacity.value = withSpring(0);
    }
  }, [visible, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const getTooltipPosition = () => {
    if (!targetRect) return {};

    const padding = 24;

    if (position === 'bottom') {
      return {
        top: targetRect.y + targetRect.height + 12,
        left: padding,
        right: padding,
      };
    }
    return {
      bottom: Dimensions.get('window').height - targetRect.y + 12,
      left: padding,
      right: padding,
    };
  };

  const getArrowPosition = () => {
    if (!targetRect) return {};

    const arrowLeft = targetRect.x + targetRect.width / 2 - 24 - 8;

    return {
      left: Math.max(16, Math.min(arrowLeft, SCREEN_WIDTH - 48 - 16)),
    };
  };

  if (!visible || !targetRect) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Animated.View
          style={[styles.tooltip, getTooltipPosition(), animatedStyle]}
        >
          {position === 'bottom' && (
            <View style={[styles.arrowUp, getArrowPosition()]} />
          )}

          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onDismiss} hitSlop={8}>
              <X size={20} color={colors.gray[400]} />
            </Pressable>
          </View>

          <Text style={styles.message}>{message}</Text>

          <Pressable style={styles.gotItButton} onPress={onDismiss}>
            <Text style={styles.gotItText}>わかった</Text>
          </Pressable>

          {position === 'top' && (
            <View style={[styles.arrowDown, getArrowPosition()]} />
          )}
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  arrowUp: {
    position: 'absolute',
    top: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.white,
  },
  arrowDown: {
    position: 'absolute',
    bottom: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.gray[900],
  },
  message: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    lineHeight: typography.fontSize.base * 1.5,
    marginBottom: spacing.md,
  },
  gotItButton: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.lg,
  },
  gotItText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
});
