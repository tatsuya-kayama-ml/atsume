import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

export interface TimerPreset {
  id: string;
  name: string;
  duration: number; // seconds
}

export interface ActiveTimer {
  eventId: string;
  eventName: string;
  duration: number; // total duration in seconds
  remainingTime: number; // remaining time in seconds (表示用)
  remainingTimeAtStart: number; // 開始/再開時点の残り時間（計算用ベース）
  isRunning: boolean;
  isPrepared: boolean; // タイマーがセットされているが開始されていない状態
  startedAt: number | null; // timestamp when started
  pausedAt: number | null; // timestamp when paused
}

interface TimerState {
  activeTimer: ActiveTimer | null;
  presets: TimerPreset[];
  notificationEnabled: boolean;

  // Timer actions
  prepareTimer: (eventId: string, eventName: string, duration: number) => void; // セットするだけ（開始しない）
  startTimer: (eventId: string, eventName: string, duration: number) => void;
  startPreparedTimer: () => void; // 準備されたタイマーを開始
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  updateRemainingTime: () => void; // タイムスタンプベースの更新
  onTimerComplete: () => void; // タイマー完了時の通知

  // Settings
  setNotificationEnabled: (enabled: boolean) => void;

  // Preset actions
  addPreset: (name: string, duration: number) => void;
  removePreset: (id: string) => void;
  updatePreset: (id: string, name: string, duration: number) => void;
}

// Default presets for common game/event durations
const DEFAULT_PRESETS: TimerPreset[] = [
  { id: 'preset-5', name: '5分', duration: 5 * 60 },
  { id: 'preset-10', name: '10分', duration: 10 * 60 },
  { id: 'preset-15', name: '15分', duration: 15 * 60 },
  { id: 'preset-20', name: '20分', duration: 20 * 60 },
  { id: 'preset-25', name: '25分', duration: 25 * 60 },
  { id: 'preset-30', name: '30分', duration: 30 * 60 },
];

// タイマー完了時の通知音を再生
const playCompletionSound = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(
      // システム通知音的なビープ音を生成
      { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
      { shouldPlay: true, volume: 0.8 }
    );
    // 再生後にアンロード
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (error) {
    console.warn('Failed to play completion sound:', error);
  }
};

// タイマー完了時のバイブレーション
const triggerCompletionHaptics = async () => {
  if (Platform.OS === 'web') return;
  try {
    // 3回のバイブレーションパターン
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setTimeout(async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }, 300);
    setTimeout(async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 600);
  } catch (error) {
    console.warn('Failed to trigger haptics:', error);
  }
};

// Interval管理用（グローバル）
let timerInterval: ReturnType<typeof setInterval> | null = null;

const startTimerInterval = (store: TimerState) => {
  // 既存のintervalをクリア
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  timerInterval = setInterval(() => {
    store.updateRemainingTime();
  }, 1000);
};

const stopTimerInterval = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      activeTimer: null,
      presets: DEFAULT_PRESETS,
      notificationEnabled: true,

      // タイマーを準備する（開始しない）- プリセット押下時
      prepareTimer: (eventId: string, eventName: string, duration: number) => {
        stopTimerInterval();
        set({
          activeTimer: {
            eventId,
            eventName,
            duration,
            remainingTime: duration,
            remainingTimeAtStart: duration,
            isRunning: false,
            isPrepared: true,
            startedAt: null,
            pausedAt: null,
          },
        });
      },

      // タイマーを即座に開始（従来の動作）
      startTimer: (eventId: string, eventName: string, duration: number) => {
        const now = Date.now();
        set({
          activeTimer: {
            eventId,
            eventName,
            duration,
            remainingTime: duration,
            remainingTimeAtStart: duration,
            isRunning: true,
            isPrepared: false,
            startedAt: now,
            pausedAt: null,
          },
        });
        startTimerInterval(get());
      },

      // 準備されたタイマーを開始
      startPreparedTimer: () => {
        const { activeTimer } = get();
        if (!activeTimer || !activeTimer.isPrepared) return;

        const now = Date.now();
        set({
          activeTimer: {
            ...activeTimer,
            remainingTimeAtStart: activeTimer.remainingTime,
            isRunning: true,
            isPrepared: false,
            startedAt: now,
            pausedAt: null,
          },
        });
        startTimerInterval(get());
      },

      pauseTimer: () => {
        const { activeTimer } = get();
        if (!activeTimer || !activeTimer.isRunning) return;

        stopTimerInterval();
        const now = Date.now();
        // タイムスタンプベースで残り時間を計算（開始時点のベースから経過時間を引く）
        const elapsed = activeTimer.startedAt
          ? Math.floor((now - activeTimer.startedAt) / 1000)
          : 0;
        const newRemainingTime = Math.max(0, activeTimer.remainingTimeAtStart - elapsed);

        set({
          activeTimer: {
            ...activeTimer,
            isRunning: false,
            remainingTime: newRemainingTime,
            remainingTimeAtStart: newRemainingTime,
            pausedAt: now,
            startedAt: null,
          },
        });
      },

      resumeTimer: () => {
        const { activeTimer } = get();
        if (!activeTimer || activeTimer.isRunning) return;

        const now = Date.now();
        set({
          activeTimer: {
            ...activeTimer,
            remainingTimeAtStart: activeTimer.remainingTime,
            isRunning: true,
            isPrepared: false,
            startedAt: now,
            pausedAt: null,
          },
        });
        startTimerInterval(get());
      },

      stopTimer: () => {
        stopTimerInterval();
        set({ activeTimer: null });
      },

      resetTimer: () => {
        const { activeTimer } = get();
        if (!activeTimer) return;

        stopTimerInterval();
        set({
          activeTimer: {
            ...activeTimer,
            remainingTime: activeTimer.duration,
            remainingTimeAtStart: activeTimer.duration,
            isRunning: false,
            isPrepared: true,
            startedAt: null,
            pausedAt: null,
          },
        });
      },

      // タイムスタンプベースで残り時間を更新
      updateRemainingTime: () => {
        const { activeTimer, onTimerComplete, notificationEnabled } = get();
        if (!activeTimer || !activeTimer.isRunning || !activeTimer.startedAt) return;

        const now = Date.now();
        const elapsed = Math.floor((now - activeTimer.startedAt) / 1000);
        // 開始/再開時点のベース時間から経過時間を引く
        const newRemainingTime = Math.max(0, activeTimer.remainingTimeAtStart - elapsed);

        if (newRemainingTime <= 0) {
          // タイマー完了
          stopTimerInterval();
          set({
            activeTimer: {
              ...activeTimer,
              remainingTime: 0,
              isRunning: false,
              isPrepared: false,
            },
          });
          // 通知を発火
          if (notificationEnabled) {
            onTimerComplete();
          }
        } else {
          // 残り時間を更新（表示用）
          set({
            activeTimer: {
              ...activeTimer,
              remainingTime: newRemainingTime,
            },
          });
        }
      },

      // タイマー完了時の通知
      onTimerComplete: async () => {
        // バイブレーションと音声を同時に
        await Promise.all([
          triggerCompletionHaptics(),
          playCompletionSound(),
        ]);
      },

      setNotificationEnabled: (enabled: boolean) => {
        set({ notificationEnabled: enabled });
      },

      addPreset: (name: string, duration: number) => {
        const { presets } = get();
        const newPreset: TimerPreset = {
          id: `preset-${Date.now()}`,
          name,
          duration,
        };
        set({ presets: [...presets, newPreset] });
      },

      removePreset: (id: string) => {
        const { presets } = get();
        set({ presets: presets.filter((p) => p.id !== id) });
      },

      updatePreset: (id: string, name: string, duration: number) => {
        const { presets } = get();
        set({
          presets: presets.map((p) =>
            p.id === id ? { ...p, name, duration } : p
          ),
        });
      },
    }),
    {
      name: 'timer-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        presets: state.presets,
        notificationEnabled: state.notificationEnabled,
        // Don't persist activeTimer - it should be cleared on app restart
      }),
    }
  )
);

// Helper function to format time
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
};

// Helper function to parse time input (mm:ss or hh:mm:ss)
export const parseTimeInput = (input: string): number | null => {
  const parts = input.split(':').map((p) => parseInt(p, 10));

  if (parts.some(isNaN)) return null;

  if (parts.length === 2) {
    // mm:ss
    const [minutes, seconds] = parts;
    if (minutes < 0 || seconds < 0 || seconds >= 60) return null;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // hh:mm:ss
    const [hours, minutes, seconds] = parts;
    if (hours < 0 || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) return null;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return null;
};
