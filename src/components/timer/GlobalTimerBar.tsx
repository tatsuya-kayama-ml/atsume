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
  FadeInDown,
  FadeOutDown,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Play, Pause, X, Timer } from 'lucide-react-native';
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

  // Pulse animation when running
  useEffect(() => {
    if (activeTimer?.isRunning) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      pulseOpacity.value = withSpring(1);
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
      {/* Progress bar */}
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
        {/* Timer icon with pulse */}
        <Animated.View style={[styles.timerIconContainer, pulseAnimatedStyle]}>
          <Timer
            size={18}
            color={isDone ? colors.error : isAlmostDone ? colors.warning : colors.primary}
          />
        </Animated.View>

        {/* Event name and time */}
        <View style={styles.infoContainer}>
          <Text style={styles.eventName} numberOfLines={1}>
            {activeTimer.eventName}
          </Text>
          <Text
            style={[
              styles.timeText,
              isDone && styles.timeTextDone,
              isAlmostDone && styles.timeTextWarning,
            ]}
          >
            {isDone ? '終了!' : formatTime(activeTimer.remainingTime)}
          </Text>
        </View>

        {/* Control buttons */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              activeTimer.isRunning && styles.controlButtonPause,
            ]}
            onPress={handlePlayPause}
            activeOpacity={0.7}
          >
            {activeTimer.isRunning ? (
              <Pause size={16} color={colors.white} />
            ) : (
              <Play size={16} color={colors.white} />
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
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  containerWarning: {
    borderColor: colors.warning,
    borderWidth: 2,
  },
  containerDone: {
    borderColor: colors.error,
    borderWidth: 2,
    backgroundColor: colors.error + '08',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
    backgroundColor: colors.primary,
    borderTopLeftRadius: borderRadius.xl,
  },
  progressBarWarning: {
    backgroundColor: colors.warning,
  },
  progressBarDone: {
    backgroundColor: colors.error,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  timerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  infoContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  eventName: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginBottom: 2,
  },
  timeText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.gray[900],
    fontVariant: ['tabular-nums'],
  },
  timeTextWarning: {
    color: colors.warning,
  },
  timeTextDone: {
    color: colors.error,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonPause: {
    backgroundColor: colors.warning,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
});
