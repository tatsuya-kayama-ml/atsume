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
  Easing,
  FadeIn,
  FadeInDown,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Square,
  Timer as TimerIcon,
  AlertCircle,
  Zap,
} from 'lucide-react-native';
import { useTimerStore, formatTime, TimerPreset } from '../../stores/timerStore';
import { useEventStore } from '../../stores/eventStore';
import { Card } from '../common';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';

// Energetic accent colors for sports/event app (from UI Pro Max)
const TIMER_COLORS = {
  primary: colors.primary,
  accent: '#F97316', // Energetic orange CTA
  warning: '#FBBF24', // Warm yellow
  danger: '#EF4444',
  success: '#22C55E',
};

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
  const progressAnim = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

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

  // Glow animation when running (subtle, not distracting per UX guidelines)
  useEffect(() => {
    if (activeTimer?.isRunning) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 800, easing: Easing.out(Easing.ease) }),
          withTiming(0.3, { duration: 800, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      glowOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [activeTimer?.isRunning]);

  // Alert animation when timer is about to end (less than 30 seconds)
  const isAlmostDone = activeTimer && activeTimer.remainingTime <= 30 && activeTimer.remainingTime > 0;
  const isDone = activeTimer && activeTimer.remainingTime === 0;

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
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

  // Timer display component with Vibrant & Block-based design
  const renderTimerDisplay = () => {
    if (!activeTimer) return null;

    const timeString = formatTime(activeTimer.remainingTime);
    const progress = activeTimer.duration > 0
      ? (activeTimer.duration - activeTimer.remainingTime) / activeTimer.duration
      : 0;
    const remainingProgress = 1 - progress;

    // Split time for block-style display
    const [minutes, seconds] = timeString.split(':');

    return (
      <Animated.View
        style={styles.timerDisplayContainer}
        entering={FadeIn.duration(300)}
      >
        {/* Glow effect behind the card (subtle per UX guidelines) */}
        {activeTimer.isRunning && (
          <Animated.View
            style={[
              styles.glowEffect,
              glowAnimatedStyle,
              isAlmostDone && styles.glowEffectWarning,
            ]}
          />
        )}

        <View
          style={[
            styles.timerCard,
            isDone && styles.timerCardDone,
            isAlmostDone && styles.timerCardWarning,
          ]}
        >
          {/* Circular progress indicator */}
          <View style={styles.circularProgressContainer}>
            <View style={styles.circularProgressBg}>
              <View
                style={[
                  styles.circularProgressFill,
                  {
                    backgroundColor: isDone
                      ? TIMER_COLORS.danger
                      : isAlmostDone
                      ? TIMER_COLORS.warning
                      : TIMER_COLORS.accent,
                  },
                ]}
              >
                {/* Time display - Block style */}
                <View style={styles.timeBlocksContainer}>
                  <View style={styles.timeBlock}>
                    <Text
                      style={[
                        styles.timeBlockNumber,
                        isDone && styles.timeBlockNumberDone,
                        isAlmostDone && styles.timeBlockNumberWarning,
                      ]}
                    >
                      {minutes}
                    </Text>
                    <Text style={styles.timeBlockLabel}>分</Text>
                  </View>

                  <Text
                    style={[
                      styles.timeSeparator,
                      isDone && styles.timeSeparatorDone,
                    ]}
                  >
                    :
                  </Text>

                  <View style={styles.timeBlock}>
                    <Text
                      style={[
                        styles.timeBlockNumber,
                        isDone && styles.timeBlockNumberDone,
                        isAlmostDone && styles.timeBlockNumberWarning,
                      ]}
                    >
                      {seconds}
                    </Text>
                    <Text style={styles.timeBlockLabel}>秒</Text>
                  </View>
                </View>

                {/* Status indicator */}
                <View style={styles.statusRow}>
                  {isDone ? (
                    <>
                      <AlertCircle size={16} color={TIMER_COLORS.danger} />
                      <Text style={styles.statusTextDone}>タイムアップ!</Text>
                    </>
                  ) : activeTimer.isRunning ? (
                    <>
                      <Zap size={14} color={TIMER_COLORS.accent} />
                      <Text style={styles.statusTextRunning}>計測中</Text>
                    </>
                  ) : (
                    <Text style={styles.statusTextPaused}>一時停止</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Progress ring */}
            <View style={styles.progressRingContainer}>
              <View
                style={[
                  styles.progressRing,
                  {
                    borderColor: isDone
                      ? TIMER_COLORS.danger
                      : isAlmostDone
                      ? TIMER_COLORS.warning
                      : TIMER_COLORS.accent,
                    borderLeftColor: 'transparent',
                    borderBottomColor: 'transparent',
                    transform: [{ rotate: `${progress * 360}deg` }],
                  },
                ]}
              />
            </View>
          </View>

          {/* Event name badge */}
          <View style={styles.eventBadge}>
            <Text style={styles.eventBadgeText} numberOfLines={1}>
              {activeTimer.eventName}
            </Text>
          </View>

          {/* Linear progress bar */}
          <View style={styles.linearProgressContainer}>
            <View
              style={[
                styles.linearProgress,
                { width: `${remainingProgress * 100}%` },
                isDone && styles.linearProgressDone,
                isAlmostDone && styles.linearProgressWarning,
              ]}
            />
            <Text style={styles.progressPercentText}>
              {Math.round(remainingProgress * 100)}%
            </Text>
          </View>

          {/* Control buttons - Block style with energetic colors */}
          <View style={styles.controlButtons}>
            <TouchableOpacity
              style={styles.controlButtonSecondary}
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <RotateCcw size={22} color={colors.gray[600]} />
              <Text style={styles.controlButtonLabel}>リセット</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlButtonPrimary,
                activeTimer.isRunning && styles.controlButtonPause,
                isDone && styles.controlButtonResume,
              ]}
              onPress={handlePlayPause}
              activeOpacity={0.7}
            >
              {activeTimer.isRunning ? (
                <Pause size={32} color={colors.white} />
              ) : (
                <Play size={32} color={colors.white} style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButtonDanger}
              onPress={handleStop}
              activeOpacity={0.7}
            >
              <Square size={20} color={TIMER_COLORS.danger} />
              <Text style={styles.controlButtonLabelDanger}>停止</Text>
            </TouchableOpacity>
          </View>
        </View>
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

  // Timer display - Vibrant & Block-based design
  timerDisplayContainer: {
    marginBottom: spacing.xl,
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    borderRadius: borderRadius['2xl'],
    backgroundColor: TIMER_COLORS.accent,
    ...shadows.lg,
  },
  glowEffectWarning: {
    backgroundColor: TIMER_COLORS.warning,
  },
  timerCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.lg,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  timerCardWarning: {
    borderColor: TIMER_COLORS.warning,
  },
  timerCardDone: {
    borderColor: TIMER_COLORS.danger,
    backgroundColor: '#FEF2F2',
  },

  // Circular progress
  circularProgressContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  circularProgressBg: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: colors.gray[200],
  },
  circularProgressFill: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
  },
  progressRing: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    borderWidth: 8,
    position: 'absolute',
  },

  // Time blocks - Block style typography
  timeBlocksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeBlock: {
    alignItems: 'center',
  },
  timeBlockNumber: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.white,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  timeBlockNumberWarning: {
    color: colors.gray[900],
  },
  timeBlockNumberDone: {
    color: colors.gray[900],
  },
  timeBlockLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: -4,
  },
  timeSeparator: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.white,
    marginBottom: spacing.sm,
  },
  timeSeparatorDone: {
    color: colors.gray[900],
  },

  // Status row
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusTextRunning: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusTextPaused: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  statusTextDone: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: TIMER_COLORS.danger,
  },

  // Event badge
  eventBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  eventBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[700],
  },

  // Linear progress
  linearProgressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  linearProgress: {
    height: '100%',
    backgroundColor: TIMER_COLORS.accent,
    borderRadius: borderRadius.full,
  },
  linearProgressWarning: {
    backgroundColor: TIMER_COLORS.warning,
  },
  linearProgressDone: {
    backgroundColor: TIMER_COLORS.danger,
  },
  progressPercentText: {
    position: 'absolute',
    right: 0,
    top: 12,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.gray[500],
  },

  // Control buttons - Block style
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    width: '100%',
  },
  controlButtonPrimary: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: TIMER_COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  controlButtonPause: {
    backgroundColor: TIMER_COLORS.warning,
  },
  controlButtonResume: {
    backgroundColor: TIMER_COLORS.success,
  },
  controlButtonSecondary: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDanger: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: TIMER_COLORS.danger + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.gray[500],
    marginTop: 2,
  },
  controlButtonLabelDanger: {
    fontSize: 10,
    fontWeight: '600',
    color: TIMER_COLORS.danger,
    marginTop: 2,
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
