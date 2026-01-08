import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Play,
  Pause,
  RotateCcw,
  Square,
} from 'lucide-react-native';
import { useTimerStore, formatTime, TimerPreset } from '../../stores/timerStore';
import { useEventStore } from '../../stores/eventStore';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

interface TimerTabProps {
  eventId: string;
  onClose?: () => void;
}

export const TimerTab: React.FC<TimerTabProps> = ({ eventId, onClose }) => {
  const { currentEvent } = useEventStore();
  const {
    activeTimer,
    presets,
    prepareTimer,
    startPreparedTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
  } = useTimerStore();

  const [customMinutes, setCustomMinutes] = useState('');

  const isCurrentEventTimer = activeTimer?.eventId === eventId;
  const isAlmostDone = activeTimer && activeTimer.remainingTime <= 30 && activeTimer.remainingTime > 0;
  const isDone = activeTimer && activeTimer.remainingTime === 0;
  const isPrepared = activeTimer?.isPrepared;

  // 状態に応じた色
  const getStatusColor = () => {
    if (isDone) return colors.error;
    if (isAlmostDone) return colors.warning;
    if (isPrepared) return colors.secondary;
    return colors.primary;
  };

  const statusColor = getStatusColor();

  // プリセット押下時
  const handlePresetPress = (preset: TimerPreset) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    prepareTimer(eventId, currentEvent?.name || 'イベント', preset.duration);
  };

  // カスタム時間をセット
  const handleCustomSet = () => {
    const minutes = parseInt(customMinutes, 10) || 0;
    if (minutes <= 0) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    prepareTimer(eventId, currentEvent?.name || 'イベント', minutes * 60);
    setCustomMinutes('');
  };

  // 再生/一時停止
  const handlePlayPause = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (activeTimer?.isPrepared) {
      startPreparedTimer();
    } else if (activeTimer?.isRunning) {
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
    onClose?.();
  };

  // プログレス計算
  const progress = activeTimer && activeTimer.duration > 0
    ? (activeTimer.duration - activeTimer.remainingTime) / activeTimer.duration
    : 0;

  return (
    <View style={styles.container}>
      {/* タイマー表示（アクティブな場合のみ） */}
      {activeTimer && isCurrentEventTimer && (
        <View style={styles.timerSection}>
          {/* 時間表示 */}
          <Text style={[styles.timeDisplay, { color: statusColor }]}>
            {isDone ? 'タイムアップ!' : formatTime(activeTimer.remainingTime)}
          </Text>

          {/* ステータス */}
          <Text style={styles.statusText}>
            {isDone ? '' : isPrepared ? '準備完了 - 開始ボタンを押してください' : activeTimer.isRunning ? '計測中' : '一時停止中'}
          </Text>

          {/* プログレスバー */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${(1 - progress) * 100}%`, backgroundColor: statusColor }]} />
          </View>

          {/* コントロールボタン */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <RotateCcw size={20} color={colors.gray[600]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: statusColor }]}
              onPress={handlePlayPause}
              activeOpacity={0.7}
            >
              {activeTimer.isRunning ? (
                <Pause size={28} color={colors.white} />
              ) : (
                <Play size={28} color={colors.white} style={{ marginLeft: 3 }} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={handleStop}
              activeOpacity={0.7}
            >
              <Square size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* プリセット選択 */}
      <View style={styles.presetsSection}>
        <Text style={styles.sectionTitle}>時間を選択</Text>
        <View style={styles.presetsGrid}>
          {presets.map((preset) => {
            const isSelected = activeTimer?.duration === preset.duration && isCurrentEventTimer;
            return (
              <TouchableOpacity
                key={preset.id}
                style={[styles.presetButton, isSelected && styles.presetButtonSelected]}
                onPress={() => handlePresetPress(preset)}
                activeOpacity={0.7}
              >
                <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>
                  {preset.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* カスタム入力 */}
      <View style={styles.customSection}>
        <Text style={styles.sectionTitle}>カスタム</Text>
        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            value={customMinutes}
            onChangeText={setCustomMinutes}
            placeholder="0"
            placeholderTextColor={colors.gray[400]}
            keyboardType="number-pad"
            maxLength={3}
          />
          <Text style={styles.customLabel}>分</Text>
          <TouchableOpacity
            style={[styles.setButton, !customMinutes && styles.setButtonDisabled]}
            onPress={handleCustomSet}
            disabled={!customMinutes}
            activeOpacity={0.7}
          >
            <Text style={styles.setButtonText}>セット</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },

  // タイマー表示
  timerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  timeDisplay: {
    fontSize: 56,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginBottom: spacing.xs,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.md,
  },
  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: colors.gray[200],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: colors.errorSoft,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // プリセット
  presetsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[600],
    marginBottom: spacing.sm,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.full,
  },
  presetButtonSelected: {
    backgroundColor: colors.primary,
  },
  presetText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[700],
  },
  presetTextSelected: {
    color: colors.white,
  },

  // カスタム入力
  customSection: {},
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  customInput: {
    width: 64,
    height: 44,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
    textAlign: 'center',
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  customLabel: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
  },
  setButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.full,
    marginLeft: 'auto',
  },
  setButtonDisabled: {
    backgroundColor: colors.gray[300],
  },
  setButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.white,
  },
});
