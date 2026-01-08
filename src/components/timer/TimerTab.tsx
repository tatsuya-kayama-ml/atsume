import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Plus,
  Trash2,
  Timer as TimerIcon,
  AlertCircle,
} from 'lucide-react-native';
import { useTimerStore, formatTime, parseTimeInput, TimerPreset } from '../../stores/timerStore';
import { useEventStore } from '../../stores/eventStore';
import { Card, Button } from '../common';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';

interface TimerTabProps {
  eventId: string;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const TimerTab: React.FC<TimerTabProps> = ({ eventId }) => {
  const { currentEvent } = useEventStore();
  const {
    activeTimer,
    presets,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    tick,
  } = useTimerStore();

  const [customMinutes, setCustomMinutes] = useState('');
  const [customSeconds, setCustomSeconds] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animation values
  const pulseScale = useSharedValue(1);
  const timerScale = useSharedValue(1);

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

  // Pulse animation when running
  useEffect(() => {
    if (activeTimer?.isRunning) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withSpring(1);
    }
  }, [activeTimer?.isRunning]);

  // Alert animation when timer is about to end (less than 30 seconds)
  const isAlmostDone = activeTimer && activeTimer.remainingTime <= 30 && activeTimer.remainingTime > 0;
  const isDone = activeTimer && activeTimer.remainingTime === 0;

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handlePresetPress = (preset: TimerPreset) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    startTimer(eventId, currentEvent?.name || 'イベント', preset.duration);
  };

  const handleCustomStart = () => {
    const minutes = parseInt(customMinutes, 10) || 0;
    const seconds = parseInt(customSeconds, 10) || 0;
    const totalSeconds = minutes * 60 + seconds;

    if (totalSeconds <= 0) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    startTimer(eventId, currentEvent?.name || 'イベント', totalSeconds);
    setCustomMinutes('');
    setCustomSeconds('');
  };

  const handlePlayPause = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (activeTimer?.isRunning) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  };

  const handleReset = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    resetTimer();
  };

  const handleStop = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    stopTimer();
  };

  const isCurrentEventTimer = activeTimer?.eventId === eventId;

  // Timer display component
  const renderTimerDisplay = () => {
    if (!activeTimer) return null;

    const timeString = formatTime(activeTimer.remainingTime);
    const progress = activeTimer.duration > 0
      ? (activeTimer.duration - activeTimer.remainingTime) / activeTimer.duration
      : 0;

    return (
      <Animated.View
        style={[styles.timerDisplayContainer, pulseAnimatedStyle]}
        entering={FadeIn.duration(300)}
      >
        <Card
          variant="elevated"
          style={{
            ...styles.timerCard,
            ...(isDone ? styles.timerCardDone : {}),
            ...(isAlmostDone ? styles.timerCardWarning : {}),
          }}
        >
          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${progress * 100}%` },
                isDone && styles.progressBarDone,
                isAlmostDone && styles.progressBarWarning,
              ]}
            />
          </View>

          {/* Event name */}
          <Text style={styles.timerEventName} numberOfLines={1}>
            {activeTimer.eventName}
          </Text>

          {/* Time display */}
          <View style={styles.timeDisplayRow}>
            <Text
              style={[
                styles.timeText,
                isDone && styles.timeTextDone,
                isAlmostDone && styles.timeTextWarning,
              ]}
            >
              {timeString}
            </Text>
            {isDone && (
              <View style={styles.doneIndicator}>
                <AlertCircle size={24} color={colors.error} />
                <Text style={styles.doneText}>終了!</Text>
              </View>
            )}
          </View>

          {/* Control buttons */}
          <View style={styles.controlButtons}>
            <TouchableOpacity
              style={[styles.controlButton, styles.controlButtonSecondary]}
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <RotateCcw size={20} color={colors.gray[600]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlButton,
                styles.controlButtonPrimary,
                activeTimer.isRunning && styles.controlButtonPause,
              ]}
              onPress={handlePlayPause}
              activeOpacity={0.7}
            >
              {activeTimer.isRunning ? (
                <Pause size={28} color={colors.white} />
              ) : (
                <Play size={28} color={colors.white} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.controlButtonDanger]}
              onPress={handleStop}
              activeOpacity={0.7}
            >
              <Trash2 size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </Card>
      </Animated.View>
    );
  };

  // Preset selection component
  const renderPresets = () => (
    <Animated.View entering={FadeInDown.delay(100).springify()}>
      <Card variant="elevated" style={styles.presetsCard}>
        <View style={styles.sectionHeader}>
          <Clock size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>プリセット</Text>
        </View>

        <View style={styles.presetsGrid}>
          {presets.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={styles.presetButton}
              onPress={() => handlePresetPress(preset)}
              activeOpacity={0.7}
            >
              <Text style={styles.presetText}>{preset.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
    </Animated.View>
  );

  // Custom time input component
  const renderCustomInput = () => (
    <Animated.View entering={FadeInDown.delay(200).springify()}>
      <Card variant="elevated" style={styles.customCard}>
        <View style={styles.sectionHeader}>
          <TimerIcon size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>カスタム時間</Text>
        </View>

        <View style={styles.customInputRow}>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.timeInput}
              value={customMinutes}
              onChangeText={setCustomMinutes}
              placeholder="00"
              placeholderTextColor={colors.gray[300]}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={styles.inputLabel}>分</Text>
          </View>

          <Text style={styles.inputSeparator}>:</Text>

          <View style={styles.inputGroup}>
            <TextInput
              style={styles.timeInput}
              value={customSeconds}
              onChangeText={setCustomSeconds}
              placeholder="00"
              placeholderTextColor={colors.gray[300]}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.inputLabel}>秒</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.startButton,
              (!customMinutes && !customSeconds) && styles.startButtonDisabled,
            ]}
            onPress={handleCustomStart}
            disabled={!customMinutes && !customSeconds}
            activeOpacity={0.7}
          >
            <Play size={18} color={colors.white} />
            <Text style={styles.startButtonText}>開始</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </Animated.View>
  );

  // Other event timer warning
  const renderOtherEventWarning = () => {
    if (!activeTimer || isCurrentEventTimer) return null;

    return (
      <Animated.View entering={FadeIn.duration(300)}>
        <Card variant="outlined" style={styles.warningCard}>
          <AlertCircle size={20} color={colors.warning} style={styles.warningIcon} />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>他のイベントでタイマー実行中</Text>
            <Text style={styles.warningText}>
              「{activeTimer.eventName}」のタイマーが実行中です。
              新しいタイマーを開始すると、現在のタイマーは停止されます。
            </Text>
          </View>
        </Card>
      </Animated.View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Active timer display */}
      {activeTimer && isCurrentEventTimer && renderTimerDisplay()}

      {/* Other event timer warning */}
      {renderOtherEventWarning()}

      {/* Presets */}
      {renderPresets()}

      {/* Custom input */}
      {renderCustomInput()}

      {/* Usage hints */}
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <View style={styles.hintsContainer}>
          <Text style={styles.hintsTitle}>ヒント</Text>
          <Text style={styles.hintsText}>
            • タイマーは画面下部にも表示されます{'\n'}
            • 他の画面に移動してもタイマーは継続します{'\n'}
            • 終了時にはアラート音が鳴ります
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing['3xl'],
  },

  // Timer display
  timerDisplayContainer: {
    marginBottom: spacing.lg,
  },
  timerCard: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  timerCardWarning: {
    borderWidth: 2,
    borderColor: colors.warning,
  },
  timerCardDone: {
    borderWidth: 2,
    borderColor: colors.error,
    backgroundColor: colors.error + '10',
  },
  progressBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.gray[100],
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressBarWarning: {
    backgroundColor: colors.warning,
  },
  progressBarDone: {
    backgroundColor: colors.error,
  },
  timerEventName: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  timeDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timeText: {
    fontSize: 56,
    fontWeight: '700',
    color: colors.gray[900],
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  timeTextWarning: {
    color: colors.warning,
  },
  timeTextDone: {
    color: colors.error,
  },
  doneIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  doneText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.error,
  },
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonPrimary: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    ...shadows.primary,
  },
  controlButtonPause: {
    backgroundColor: colors.warning,
  },
  controlButtonSecondary: {
    backgroundColor: colors.gray[100],
  },
  controlButtonDanger: {
    backgroundColor: colors.error + '15',
  },

  // Presets
  presetsCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  presetText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.primary,
  },

  // Custom input
  customCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputGroup: {
    alignItems: 'center',
  },
  timeInput: {
    width: 60,
    height: 48,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    textAlign: 'center',
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.gray[900],
  },
  inputLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginTop: spacing['2xs'],
  },
  inputSeparator: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '600',
    color: colors.gray[400],
    marginBottom: spacing.md,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginLeft: 'auto',
  },
  startButtonDisabled: {
    backgroundColor: colors.gray[300],
  },
  startButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.white,
  },

  // Warning card
  warningCard: {
    flexDirection: 'row',
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.warning + '10',
    borderColor: colors.warning + '30',
  },
  warningIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: spacing['2xs'],
  },
  warningText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    lineHeight: typography.fontSize.xs * 1.5,
  },

  // Hints
  hintsContainer: {
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
  },
  hintsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[600],
    marginBottom: spacing.xs,
  },
  hintsText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    lineHeight: typography.fontSize.xs * 1.8,
  },
});
