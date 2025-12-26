import React from 'react';
import { RefreshControl, RefreshControlProps, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../../constants/theme';

interface AnimatedRefreshControlProps extends Omit<RefreshControlProps, 'colors' | 'tintColor'> {
  onRefresh: () => void;
  refreshing: boolean;
}

export const AnimatedRefreshControl: React.FC<AnimatedRefreshControlProps> = ({
  onRefresh,
  refreshing,
  ...props
}) => {
  const handleRefresh = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onRefresh();
  };

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={[colors.primary, colors.primaryLight]}
      tintColor={colors.primary}
      progressBackgroundColor={colors.white}
      {...props}
    />
  );
};
