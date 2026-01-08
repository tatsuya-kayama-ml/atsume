import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TimerPreset {
  id: string;
  name: string;
  duration: number; // seconds
}

export interface ActiveTimer {
  eventId: string;
  eventName: string;
  duration: number; // total duration in seconds
  remainingTime: number; // remaining time in seconds
  isRunning: boolean;
  startedAt: number | null; // timestamp when started
  pausedAt: number | null; // timestamp when paused
}

interface TimerState {
  activeTimer: ActiveTimer | null;
  presets: TimerPreset[];

  // Timer actions
  startTimer: (eventId: string, eventName: string, duration: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  tick: () => void;

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

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      activeTimer: null,
      presets: DEFAULT_PRESETS,

      startTimer: (eventId: string, eventName: string, duration: number) => {
        set({
          activeTimer: {
            eventId,
            eventName,
            duration,
            remainingTime: duration,
            isRunning: true,
            startedAt: Date.now(),
            pausedAt: null,
          },
        });
      },

      pauseTimer: () => {
        const { activeTimer } = get();
        if (!activeTimer || !activeTimer.isRunning) return;

        set({
          activeTimer: {
            ...activeTimer,
            isRunning: false,
            pausedAt: Date.now(),
          },
        });
      },

      resumeTimer: () => {
        const { activeTimer } = get();
        if (!activeTimer || activeTimer.isRunning) return;

        set({
          activeTimer: {
            ...activeTimer,
            isRunning: true,
            startedAt: Date.now(),
            pausedAt: null,
          },
        });
      },

      stopTimer: () => {
        set({ activeTimer: null });
      },

      resetTimer: () => {
        const { activeTimer } = get();
        if (!activeTimer) return;

        set({
          activeTimer: {
            ...activeTimer,
            remainingTime: activeTimer.duration,
            isRunning: false,
            startedAt: null,
            pausedAt: null,
          },
        });
      },

      tick: () => {
        const { activeTimer } = get();
        if (!activeTimer || !activeTimer.isRunning) return;

        const newRemainingTime = activeTimer.remainingTime - 1;

        if (newRemainingTime <= 0) {
          // Timer completed
          set({
            activeTimer: {
              ...activeTimer,
              remainingTime: 0,
              isRunning: false,
            },
          });
        } else {
          set({
            activeTimer: {
              ...activeTimer,
              remainingTime: newRemainingTime,
            },
          });
        }
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