import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../../constants/theme';

export type BadgeVariant = 'solid' | 'soft' | 'outline';
export type BadgeColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  label: string;
  color?: BadgeColor;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  color = 'default',
  variant = 'soft',
  size = 'md',
  icon,
  style,
  textStyle,
}) => {
  const getBackgroundColor = (): string => {
    if (variant === 'outline') {
      return 'transparent';
    }
    if (variant === 'soft') {
      switch (color) {
        case 'primary':
          return colors.primarySoft;
        case 'secondary':
          return colors.secondarySoft;
        case 'success':
          return colors.successSoft;
        case 'warning':
          return colors.warningSoft;
        case 'error':
          return colors.errorSoft;
        case 'info':
          return colors.infoSoft;
        default:
          return colors.gray[100];
      }
    }
    // solid variant
    switch (color) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.secondary;
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.error;
      case 'info':
        return colors.info;
      default:
        return colors.gray[500];
    }
  };

  const getTextColor = (): string => {
    if (variant === 'solid') {
      return colors.white;
    }
    // soft or outline variant
    switch (color) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.secondary;
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.error;
      case 'info':
        return colors.info;
      default:
        return colors.gray[600];
    }
  };

  const getBorderColor = (): string | undefined => {
    if (variant !== 'outline') return undefined;
    switch (color) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.secondary;
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.error;
      case 'info':
        return colors.info;
      default:
        return colors.gray[300];
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing['2xs'],
        };
      case 'lg':
        return {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        };
      default:
        return {
          paddingHorizontal: spacing.sm + 2,
          paddingVertical: spacing.xs,
        };
    }
  };

  const getTextSize = (): number => {
    switch (size) {
      case 'sm':
        return typography.fontSize['2xs'];
      case 'lg':
        return typography.fontSize.sm;
      default:
        return typography.fontSize.xs;
    }
  };

  const borderColor = getBorderColor();

  return (
    <View
      style={[
        styles.badge,
        getSizeStyle(),
        { backgroundColor: getBackgroundColor() },
        borderColor ? { borderWidth: 1, borderColor } : undefined,
        style,
      ]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text
        style={[
          styles.text,
          { color: getTextColor(), fontSize: getTextSize() },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: spacing.xs,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
