// Supabase Database Types

export type AttendanceStatus = 'pending' | 'attending' | 'not_attending' | 'maybe' | 'unconfirmed';
export type PaymentStatus = 'unpaid' | 'pending_confirmation' | 'paid';
export type EventStatus = 'open' | 'completed'; // 実施予定 | 終了
export type TournamentFormat =
  | 'single_elimination'      // シングルエリミネーション（従来のトーナメント）
  | 'double_elimination'      // ダブルエリミネーション
  | 'round_robin'            // 総当たり戦（リーグ戦）
  | 'swiss'                  // スイスドロー方式
  | 'group_stage';           // グループステージ
export type MatchStatus = 'scheduled' | 'in_progress' | 'completed';
export type TimerPosition = 'top' | 'bottom';
export type CompetitionType = 'team' | 'individual'; // 団体戦 or 個人戦

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  skill_level: number; // 1-5
  created_at: string;
  updated_at: string;
}

// Skill level settings for an event
export interface SkillLevelSettings {
  enabled: boolean;
  label: string; // カスタムラベル（例: "レベル", "経験年数"）
  options: SkillLevelOption[];
}

export interface SkillLevelOption {
  value: number;
  label: string;
  description?: string;
}

// Gender settings for an event
export type GenderType = 'male' | 'female' | 'other';

export interface GenderSettings {
  enabled: boolean;
  options: GenderOption[];
}

export interface GenderOption {
  value: GenderType;
  label: string;
  fee?: number; // 性別ごとの参加費（設定しない場合はイベントのfeeを使用）
}

export interface Event {
  id: string;
  organizer_id: string;
  name: string;
  description: string | null;
  date_time: string;
  location: string;
  fee: number;
  capacity: number | null;
  event_code: string;
  password_hash: string | null;
  password: string | null; // Plain text password for display to participants
  invite_link: string;
  status: EventStatus;
  timer_position: TimerPosition;
  skill_level_settings: SkillLevelSettings | null;
  gender_settings: GenderSettings | null;
  payment_link: string | null; // 支払い情報（PayPay URLまたは銀行口座情報）
  payment_link_label: string | null; // 支払い情報のラベル（例: "PayPay", "銀行振込"）
  created_at: string;
  updated_at: string;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string | null; // null for manual participants
  attendance_status: AttendanceStatus;
  payment_status: PaymentStatus;
  payment_reported_at: string | null;
  payment_confirmed_at: string | null;
  payment_note: string | null; // 支払い報告時のメモ（例: PayPayで送りました、ユーザー名XXです）
  skill_level: number | null;
  gender: GenderType | null;
  actual_attendance: boolean | null; // 実際の出席状況 (null=未確認, true=出席, false=欠席)
  checked_in_at: string | null; // 出席確認日時
  created_at: string;
  updated_at: string;
  // Joined fields
  user?: User;
  display_name?: string; // 手動追加参加者用
  is_manual?: boolean; // 手動追加フラグ
}

export interface Team {
  id: string;
  event_id: string;
  name: string;
  color: string;
  order: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  team_id: string;
  participant_id: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  participant?: EventParticipant;
}

export interface Tournament {
  id: string;
  event_id: string;
  format: TournamentFormat;
  concurrent_matches: number;
  settings: TournamentSettings;
  created_at: string;
  updated_at: string;
}

export interface TournamentSettings {
  competition_type?: CompetitionType; // 競技タイプ (team or individual)
  team_count?: number;
  has_third_place_match?: boolean;

  // Scoring settings
  win_points?: number;
  draw_points?: number;
  loss_points?: number;

  // Group stage settings
  groups?: number;
  teams_per_group?: number;
  advancing_teams?: number;

  // Swiss system settings
  swiss_rounds?: number; // スイスドロー方式のラウンド数

  // Display settings
  enable_score_tracking?: boolean; // 試合結果記録を有効にするか
  enable_standings?: boolean; // 順位表を有効にするか

  // Bracket settings
  losers_bracket_enabled?: boolean; // ダブルエリミネーション用の敗者復活戦
}

export interface Match {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  court: number | null;
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  winner_id: string | null;
  status: MatchStatus;
  scheduled_time: string | null;
  bracket_type?: 'winners' | 'losers' | 'finals'; // ダブルエリミネーション用
  created_at: string;
  updated_at: string;
  // Joined fields
  team1?: Team;
  team2?: Team;
}

export interface GroupStanding {
  id: string;
  tournament_id: string;
  group_name: string | null;
  team_id: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  rank: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  team?: Team;
}

export interface Notification {
  id: string;
  user_id: string;
  event_id: string | null;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimerState {
  id: string;
  event_id: string;
  duration_seconds: number;
  remaining_seconds: number;
  is_running: boolean;
  started_at: string | null;
  updated_at: string;
}

// Database schema for Supabase
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
      events: {
        Row: Event;
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'event_code' | 'invite_link'>;
        Update: Partial<Omit<Event, 'id' | 'created_at' | 'updated_at'>>;
      };
      event_participants: {
        Row: EventParticipant;
        Insert: Omit<EventParticipant, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<EventParticipant, 'id' | 'created_at' | 'updated_at'>>;
      };
      teams: {
        Row: Team;
        Insert: Omit<Team, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Team, 'id' | 'created_at' | 'updated_at'>>;
      };
      team_members: {
        Row: TeamMember;
        Insert: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>>;
      };
      tournaments: {
        Row: Tournament;
        Insert: Omit<Tournament, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Tournament, 'id' | 'created_at' | 'updated_at'>>;
      };
      matches: {
        Row: Match;
        Insert: Omit<Match, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Match, 'id' | 'created_at' | 'updated_at'>>;
      };
      group_standings: {
        Row: GroupStanding;
        Insert: Omit<GroupStanding, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<GroupStanding, 'id' | 'created_at' | 'updated_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Notification, 'id' | 'created_at' | 'updated_at'>>;
      };
      timer_states: {
        Row: TimerState;
        Insert: Omit<TimerState, 'id' | 'updated_at'>;
        Update: Partial<Omit<TimerState, 'id' | 'updated_at'>>;
      };
    };
  };
}
