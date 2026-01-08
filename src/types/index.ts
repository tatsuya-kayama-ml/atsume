export * from './database';

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignUpFormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

export interface EventFormData {
  name: string;
  description?: string;
  dateTime: Date;
  location: string;
  fee: number;
  capacity?: number;
  password?: string;
}

// Navigation types
export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
  EventDetail: { eventId: string };
  EventCreate: undefined;
  EventEdit: { eventId: string };
  JoinEvent: { code?: string };
  ParticipantDetail: { participantId: string; eventId: string };
  TeamEdit: { eventId: string };
  MatchResult: { matchId: string };
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
  ResetPassword: undefined;
  ProfileEdit: undefined;
  ChangePassword: undefined;
  FAQ: undefined;
  Contact: undefined;
  NotificationSettings: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Notifications: undefined;
  Settings: undefined;
};

export type EventTabParamList = {
  Info: undefined;
  Participants: undefined;
  Payment: undefined;
  Teams: undefined;
  Matches: undefined;
  Stats: undefined;
};
