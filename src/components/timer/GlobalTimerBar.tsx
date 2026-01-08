import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Play, Pause, X, AlertCircle, Check } from 'lucide-react-native';
import { useTimerStore, formatTime } from '../../stores/timerStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';

interface GlobalTimerBarProps {
  onPress?: () => void;
  bottomOffset?: number;
}

export const GlobalTimerBar: React.FC<GlobalTimerBarProps> = ({
  onPress,
  bottomOffset = 0,
}) => {
  const insets = useSafeAreaInsets();
  const {
    activeTimer,
    pauseTimer,
    resumeTimer,
    startPreparedTimer,
    stopTimer,
  } = useTimerStore();

  // Animation values
  const pulseOpacity = useSharedValue(1);
  const progressWidth = useSharedValue(0);

  // Update progress
  React.useEffect(() => {
    if (activeTimer) {
      const progress = activeTimer.duration > 0
        ? (activeTimer.duration - activeTimer.remainingTime) / activeTimer.duration
        : 0;
      progressWidth.value = withTiming(progress, { duration: 300 });
    }
  }, [activeTimer?.remainingTime]);

  // Subtle pulse animation (per UX guidelines - not distracting)
  React.useEffect(() => {
    if (activeTimer?.isRunning) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 600, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [activeTimer?.isRunning]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  if (!activeTimer) return null;

  const handlePlayPause = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (activeTimer.isPrepared) {
      startPreparedTimer();
    } else if (activeTimer.isRunning) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  };

  const handleStop = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    stopTimer();
  };

  const isAlmostDone = activeTimer.remainingTime <= 30 && activeTimer.remainingTime > 0;
  const isDone = activeTimer.remainingTime === 0;
  const isPrepared = activeTimer.isPrepared;

  // Calculate remaining progress for visual display
  const remainingProgress = activeTimer.duration > 0
    ? activeTimer.remainingTime / activeTimer.duration
    : 0;

  // 状態に応じた色（トンマナ統一）
  const getStatusColor = () => {
    if (isDone) return colors.error;
    if (isAlmostDone) return colors.warning;
    if (isPrepared) return colors.secondary;
    return colors.primary;
  };

  const statusColor = getStatusColor();

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(15)}
      exiting={SlideOutDown.springify().damping(15)}
      style={[
        styles.container,
        { bottom: insets.bottom + bottomOffset + spacing.sm },
        isDone && styles.containerDone,
        isAlmostDone && styles.containerWarning,
        isPrepared && styles.containerPrepared,
      ]}
    >
      {/* Progress bar - shows elapsed time */}
      <Animated.View
        style={[
          styles.progressBar,
          progressAnimatedStyle,
          { backgroundColor: statusColor },
        ]}
      />

      {/* Content */}
      <TouchableOpacity
        style={styles.content}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Status indicator */}
        <Animated.View
          style={[
            styles.statusIndicator,
            { backgroundColor: statusColor },
            pulseAnimatedStyle,
          ]}
        >
          {isDone ? (
            <AlertCircle size={16} color={colors.white} />
          ) : isPrepared ? (
            <Check size={16} color={colors.white} />
          ) : activeTimer.isRunning ? (
            <View style={styles.runningDot} />
          ) : (
            <Pause size={14} color={colors.white} />
          )}
        </Animated.View>

        {/* Event name and time */}
        <View style={styles.infoContainer}>
          <Text style={styles.eventName} numberOfLines={1}>
            {activeTimer.eventName}
          </Text>
          <View style={styles.timeRow}>
            <Text
              style={[
                styles.timeText,
                isDone && styles.timeTextDone,
                isAlmostDone && styles.timeTextWarning,
                isPrepared && styles.timeTextPrepared,
              ]}
            >
              {isDone ? 'タイムアップ!' : isPrepared ? '準備完了' : formatTime(activeTimer.remainingTime)}
            </Text>
            {!isDone && !isPrepared && (
              <Text style={styles.percentText}>
                {Math.round(remainingProgress * 100)}%
              </Text>
            )}
          </View>
        </View>

        {/* Control buttons */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              { backgroundColor: statusColor },
            ]}
            onPress={handlePlayPause}
            activeOpacity={0.7}
          >
            {activeTimer.isRunning ? (
              <Pause size={18} color={colors.white} />
            ) : (
              <Play size={18} color={colors.white} style={{ marginLeft: 2 }} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleStop}
            activeOpacity={0.7}
          >
            <X size={16} color={colors.gray[500]} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
    borderWidth: 2,
    borderColor: colors.gray[100],
  },
  containerPrepared: {
    borderColor: colors.secondary,
  },
  containerWarning: {
    borderColor: colors.warning,
  },
  containerDone: {
    borderColor: colors.error,
    backgroundColor: colors.errorSoft,
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 4,
    borderTopLeftRadius: borderRadius.xl,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 64,
  },
  statusIndicator: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  runningDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.white,
  },
  infoContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  eventName: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
    color: colors.gray[500],
    marginBottom: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  timeText: {
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
    color: colors.gray[900],
    fontVariant: ['tabular-nums'],
  },
  timeTextPrepared: {
    color: colors.secondary,
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  timeTextWarning: {
    color: colors.warning,
  },
  timeTextDone: {
    color: colors.error,
  },
  percentText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[400],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
});
