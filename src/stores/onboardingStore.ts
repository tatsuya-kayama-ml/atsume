import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ツールチップのID（各機能箇所で使用）
export type TooltipId =
  | 'home_create_event'
  | 'home_join_event'
  | 'event_detail_participants'
  | 'event_detail_share'
  // 参加者向け
  | 'participant_attendance'
  | 'participant_payment'
  // 主催者向け - チーム機能
  | 'organizer_team_setup'
  | 'organizer_team_edit'
  // 主催者向け - 対戦表機能
  | 'organizer_match_create'
  | 'organizer_match_score';

// ツールチップのコンテンツ定義
export const TOOLTIP_CONTENT: Record<TooltipId, { title: string; message: string; role?: 'participant' | 'organizer' }> = {
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
    role: 'organizer',
  },
  event_detail_share: {
    title: '招待コードを共有',
    message: 'このボタンで招待コードを友達に共有できます。',
  },
  // 参加者向けヒント
  participant_attendance: {
    title: '出欠を報告しよう',
    message: '出席予定・欠席・未定をタップして報告してください。主催者に通知されます。',
    role: 'participant',
  },
  participant_payment: {
    title: '支払いを報告',
    message: '参加費を払ったら「支払済」をタップ。主催者が確認してくれます。',
    role: 'participant',
  },
  // 主催者向け - チーム機能
  organizer_team_setup: {
    title: 'チーム分けをしよう',
    message: 'チーム数を選んで「ランダム」か「スキル均等」で自動振り分け。参加予定者・来ている人から選べます。',
    role: 'organizer',
  },
  organizer_team_edit: {
    title: 'チームを編集',
    message: 'チーム名の変更やメンバーの移動ができます。後から追加された人も簡単に振り分けられます。',
    role: 'organizer',
  },
  // 主催者向け - 対戦表機能
  organizer_match_create: {
    title: '対戦表を作成',
    message: '総当たり戦やトーナメントなど形式を選んで対戦表を作成。途中でチームが増えても新しい対戦表を追加できます。',
    role: 'organizer',
  },
  organizer_match_score: {
    title: 'スコアを記録',
    message: '「スコア入力」をタップして試合結果を記録。順位表が自動で更新されます。',
    role: 'organizer',
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
