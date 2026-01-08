import React, { useEffect, useRef } from 'react';
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
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Play, Pause, X, Zap, AlertCircle } from 'lucide-react-native';
import { useTimerStore, formatTime } from '../../stores/timerStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';

// Energetic accent colors (from UI Pro Max)
const TIMER_COLORS = {
  accent: '#F97316',
  warning: '#FBBF24',
  danger: '#EF4444',
  success: '#22C55E',
};

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
    stopTimer,
    tick,
  } = useTimerStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animation values
  const pulseOpacity = useSharedValue(1);
  const progressWidth = useSharedValue(0);

  // Timer tick effect
  useEffect(() => {
    if (activeTimer?.isRunning) {
      intervalRef.current = setInterval(() => {
        tick();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeTimer?.isRunning, tick]);

  // Update progress
  useEffect(() => {
    if (activeTimer) {
      const progress = activeTimer.duration > 0
        ? (activeTimer.duration - activeTimer.remainingTime) / activeTimer.duration
        : 0;
      progressWidth.value = withTiming(progress, { duration: 300 });
    }
  }, [activeTimer?.remainingTime]);

  // Subtle pulse animation (per UX guidelines - not distracting)
  useEffect(() => {
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
    if (activeTimer.isRunning) {
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

  // Calculate remaining progress for visual display
  const remainingProgress = activeTimer.duration > 0
    ? activeTimer.remainingTime / activeTimer.duration
    : 0;

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(15)}
      exiting={SlideOutDown.springify().damping(15)}
      style={[
        styles.container,
        { bottom: insets.bottom + bottomOffset + spacing.sm },
        isDone && styles.containerDone,
        isAlmostDone && styles.containerWarning,
      ]}
    >
      {/* Progress bar - shows remaining time */}
      <Animated.View
        style={[
          styles.progressBar,
          progressAnimatedStyle,
          isDone && styles.progressBarDone,
          isAlmostDone && styles.progressBarWarning,
        ]}
      />

      {/* Content */}
      <TouchableOpacity
        style={styles.content}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Energetic status indicator */}
        <Animated.View
          style={[
            styles.statusIndicator,
            isDone && styles.statusIndicatorDone,
            isAlmostDone && styles.statusIndicatorWarning,
            pulseAnimatedStyle,
          ]}
        >
          {isDone ? (
            <AlertCircle size={16} color={colors.white} />
          ) : activeTimer.isRunning ? (
            <Zap size={16} color={colors.white} />
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
              ]}
            >
              {isDone ? 'タイムアップ!' : formatTime(activeTimer.remainingTime)}
            </Text>
            {!isDone && (
              <Text style={styles.percentText}>
                {Math.round(remainingProgress * 100)}%
              </Text>
            )}
          </View>
        </View>

        {/* Control buttons - Block style */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              activeTimer.isRunning && styles.controlButtonPause,
              isDone && styles.controlButtonResume,
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
  containerWarning: {
    borderColor: TIMER_COLORS.warning,
    borderWidth: 3,
  },
  containerDone: {
    borderColor: TIMER_COLORS.danger,
    borderWidth: 3,
    backgroundColor: '#FEF2F2',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 4,
    backgroundColor: TIMER_COLORS.accent,
    borderTopLeftRadius: borderRadius.xl,
  },
  progressBarWarning: {
    backgroundColor: TIMER_COLORS.warning,
  },
  progressBarDone: {
    backgroundColor: TIMER_COLORS.danger,
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
    backgroundColor: TIMER_COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  statusIndicatorWarning: {
    backgroundColor: TIMER_COLORS.warning,
  },
  statusIndicatorDone: {
    backgroundColor: TIMER_COLORS.danger,
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
  timeTextWarning: {
    color: TIMER_COLORS.warning,
  },
  timeTextDone: {
    color: TIMER_COLORS.danger,
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
    backgroundColor: TIMER_COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  controlButtonPause: {
    backgroundColor: TIMER_COLORS.warning,
  },
  controlButtonResume: {
    backgroundColor: TIMER_COLORS.success,
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
