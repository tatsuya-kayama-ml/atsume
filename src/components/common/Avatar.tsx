import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Image, ImageStyle } from 'react-native';
import { colors, borderRadius, typography } from '../../constants/theme';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name?: string;
  imageUrl?: string;
  size?: AvatarSize;
  backgroundColor?: string;
  style?: ViewStyle;
}

const sizeMap = {
  xs: { container: 24, text: 10 },
  sm: { container: 32, text: 12 },
  md: { container: 40, text: 16 },
  lg: { container: 56, text: 20 },
  xl: { container: 80, text: 30 },
};

const colorPalette = [
  colors.primary,
  colors.secondary,
  colors.accent,
  '#EC4899', // Pink
  '#F97316', // Orange
  '#06B6D4', // Cyan
];

const getColorFromName = (name: string): string => {
  const charCode = name.charCodeAt(0) || 0;
  return colorPalette[charCode % colorPalette.length];
};

const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({
  name = '',
  imageUrl,
  size = 'md',
  backgroundColor,
  style,
}) => {
  const sizeStyle = sizeMap[size];
  const bgColor = backgroundColor || getColorFromName(name);

  if (imageUrl) {
    const imageStyle: ImageStyle = {
      width: sizeStyle.container,
      height: sizeStyle.container,
      borderRadius: sizeStyle.container / 2,
    };
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[imageStyle, style as ImageStyle]}
      />
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: sizeStyle.container,
          height: sizeStyle.container,
          borderRadius: sizeStyle.container / 2,
          backgroundColor: bgColor,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize: sizeStyle.text }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: colors.white,
    fontWeight: '600',
  },
});
