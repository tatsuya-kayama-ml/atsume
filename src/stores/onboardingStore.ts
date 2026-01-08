import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ツールチップのID（各機能箇所で使用）
export type TooltipId =
  | 'home_create_event'
  | 'home_join_event'
  | 'event_detail_participants'
  | 'event_detail_share';

// ツールチップのコンテンツ定義
export const TOOLTIP_CONTENT: Record<TooltipId, { title: string; message: string }> = {
  home_create_event: {
    title: 'イベントを作成しよう',
    message: 'ここからイベントを作成できます。日時や場所、参加費を設定して招待コードを発行しましょう。',
  },
  home_join_event: {
    title: 'イベントに参加',
    message: '招待コードを入力して、友達が作成したイベントに参加できます。',
  },
  event_detail_participants: {
    title: '参加者を管理',
    message: '参加者の出欠状況や支払い状況をこちらで確認・管理できます。',
  },
  event_detail_share: {
    title: '招待コードを共有',
    message: 'このボタンで招待コードを友達に共有できます。',
  },
};

interface OnboardingState {
  // ウォークスルー完了フラグ
  hasCompletedWalkthrough: boolean;

  // 新規ユーザーフラグ（サインアップ時にtrueになる）
  isNewUser: boolean;

  // 表示済みツールチップのリスト（Setはシリアライズできないため配列で保持）
  shownTooltips: TooltipId[];

  // 現在表示中のツールチップ（1つのみ表示）
  activeTooltip: TooltipId | null;

  // アクション
  completeWalkthrough: () => void;
  markTooltipAsShown: (id: TooltipId) => void;
  setActiveTooltip: (id: TooltipId | null) => void;
  shouldShowTooltip: (id: TooltipId) => boolean;
  setIsNewUser: (isNew: boolean) => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      hasCompletedWalkthrough: false,
      isNewUser: false,
      shownTooltips: [],
      activeTooltip: null,

      completeWalkthrough: () =>
        set({ hasCompletedWalkthrough: true, isNewUser: false }),

      markTooltipAsShown: (id) =>
        set((state) => ({
          shownTooltips: state.shownTooltips.includes(id)
            ? state.shownTooltips
            : [...state.shownTooltips, id],
          activeTooltip: null,
        })),

      setActiveTooltip: (id) =>
        set({ activeTooltip: id }),

      shouldShowTooltip: (id) => {
        const state = get();
        return state.hasCompletedWalkthrough && !state.shownTooltips.includes(id);
      },

      setIsNewUser: (isNew) =>
        set({ isNewUser: isNew }),

      resetOnboarding: () =>
        set({
          hasCompletedWalkthrough: false,
          isNewUser: true,
          shownTooltips: [],
          activeTooltip: null,
        }),
    }),
    {
      name: 'atsume-onboarding',
      storage: createJSONStorage(() =>
        Platform.OS === 'web' ? localStorage : AsyncStorage
      ),
      partialize: (state) => ({
        hasCompletedWalkthrough: state.hasCompletedWalkthrough,
        isNewUser: state.isNewUser,
        shownTooltips: state.shownTooltips,
      }),
    }
  )
);
