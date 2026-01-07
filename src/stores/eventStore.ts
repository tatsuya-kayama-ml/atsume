import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { Event, EventParticipant, EventStatus, AttendanceStatus, PaymentStatus, SkillLevelSettings, GenderSettings, GenderType } from '../types';
import { hashPassword, verifyPassword, logger } from '../utils';

interface EventState {
  events: Event[];
  currentEvent: Event | null;
  participants: EventParticipant[];
  isLoading: boolean;
  error: string | null;

  // Event actions
  fetchMyEvents: () => Promise<void>;
  fetchEventById: (eventId: string) => Promise<void>;
  createEvent: (data: CreateEventData) => Promise<Event>;
  updateEvent: (eventId: string, data: Partial<Event>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  updateEventStatus: (eventId: string, status: EventStatus) => Promise<void>;
  duplicateEvent: (eventId: string) => Promise<Event>;

  // Participant actions
  fetchParticipants: (eventId: string) => Promise<void>;
  joinEvent: (eventId: string, code?: string, password?: string) => Promise<void>;
  joinEventByCode: (code: string, password?: string) => Promise<void>;
  leaveEvent: (eventId: string) => Promise<void>;
  addManualParticipant: (eventId: string, name: string, options?: { attendanceStatus?: AttendanceStatus; paymentStatus?: PaymentStatus; skillLevel?: number; gender?: GenderType }) => Promise<void>;
  updateManualParticipant: (participantId: string, data: { display_name?: string; attendance_status?: AttendanceStatus; payment_status?: PaymentStatus; skill_level?: number; gender?: GenderType }) => Promise<void>;
  removeParticipant: (participantId: string) => Promise<void>;
  updateAttendanceStatus: (participantId: string, status: AttendanceStatus) => Promise<void>;
  updatePaymentStatus: (participantId: string, status: PaymentStatus) => Promise<void>;
  updateParticipantProfile: (participantId: string, data: { skill_level?: number; gender?: GenderType }) => Promise<void>;
  reportPayment: (participantId: string) => Promise<void>;
  confirmPayment: (participantId: string) => Promise<void>;

  // Actual attendance (check-in)
  checkInParticipant: (participantId: string, attended: boolean) => Promise<void>;
  bulkCheckIn: (participantIds: string[], attended: boolean) => Promise<void>;

  // Utility
  clearError: () => void;
  clearCurrentEvent: () => void;
}

interface CreateEventData {
  name: string;
  description?: string;
  date_time: string;
  location: string;
  fee: number;
  capacity?: number;
  password?: string;
  skill_level_settings?: SkillLevelSettings;
  gender_settings?: GenderSettings;
  paypay_link?: string;
}

// Generate 6-character alphanumeric code
const generateEventCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  currentEvent: null,
  participants: [],
  isLoading: false,
  error: null,

  fetchMyEvents: async () => {
    try {
      set({ isLoading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインしていません');

      // Fetch events I organize
      const { data: organizedEvents, error: orgError } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user.id)
        .order('date_time', { ascending: true });

      if (orgError) throw orgError;

      // Fetch events I participate in
      const { data: participations, error: partError } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('user_id', user.id);

      if (partError) throw partError;

      const participatedEventIds = participations?.map(p => p.event_id) || [];

      let participatedEvents: Event[] = [];
      if (participatedEventIds.length > 0) {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .in('id', participatedEventIds)
          .neq('organizer_id', user.id)
          .order('date_time', { ascending: true });

        if (error) throw error;
        participatedEvents = data || [];
      }

      const allEvents = [...(organizedEvents || []), ...participatedEvents];
      allEvents.sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());

      set({ events: allEvents, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchEventById: async (eventId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      set({ currentEvent: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createEvent: async (data: CreateEventData) => {
    try {
      set({ isLoading: true, error: null });

      logger.log('[EventStore] createEvent called');

      const { data: { user } } = await supabase.auth.getUser();
      logger.log('[EventStore] Current user:', user?.id);
      if (!user) throw new Error('ログインしていません');

      const eventCode = generateEventCode();
      const inviteLink = `atsume://event/${eventCode}`;

      // Hash password if provided
      const passwordHash = data.password ? await hashPassword(data.password) : null;

      const insertData = {
        organizer_id: user.id,
        name: data.name,
        description: data.description || null,
        date_time: data.date_time,
        location: data.location,
        fee: data.fee,
        capacity: data.capacity || null,
        event_code: eventCode,
        password_hash: passwordHash,
        invite_link: inviteLink,
        status: 'open' as EventStatus,
        timer_position: 'bottom',
        skill_level_settings: data.skill_level_settings || null,
        gender_settings: data.gender_settings || null,
        paypay_link: data.paypay_link || null,
      };
      logger.log('[EventStore] Inserting event');

      const { data: event, error } = await supabase
        .from('events')
        .insert(insertData)
        .select()
        .single();

      logger.log('[EventStore] Insert result:', { eventId: event?.id, error });

      if (error) throw error;

      set((state) => ({
        events: [...state.events, event],
        isLoading: false,
      }));

      return event;
    } catch (error: any) {
      logger.error('[EventStore] createEvent error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateEvent: async (eventId: string, data: Partial<Event>) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase
        .from('events')
        .update(data)
        .eq('id', eventId);

      if (error) throw error;

      set((state) => ({
        events: state.events.map((e) => (e.id === eventId ? { ...e, ...data } : e)),
        currentEvent: state.currentEvent?.id === eventId
          ? { ...state.currentEvent, ...data }
          : state.currentEvent,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteEvent: async (eventId: string) => {
    try {
      set({ isLoading: true, error: null });

      // First delete all participants (due to foreign key constraint)
      const { error: participantsError } = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId);

      if (participantsError) throw participantsError;

      // Then delete the event
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      set((state) => ({
        events: state.events.filter((e) => e.id !== eventId),
        currentEvent: state.currentEvent?.id === eventId ? null : state.currentEvent,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateEventStatus: async (eventId: string, status: EventStatus) => {
    await get().updateEvent(eventId, { status });
  },

  fetchParticipants: async (eventId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          *,
          user:users (*)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      set({ participants: data || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  joinEvent: async (eventId: string, _code?: string, password?: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインしていません');

      // Check if event exists and verify password if needed
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw new Error('イベントが見つかりません');

      // Verify password if event has one
      if (event.password_hash) {
        if (!password) {
          throw new Error('パスワードが必要です');
        }
        const isValidPassword = await verifyPassword(password, event.password_hash);
        if (!isValidPassword) {
          throw new Error('パスワードが正しくありません');
        }
      }

      // Check if already participating
      const { data: existing } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        throw new Error('すでにこのイベントに参加しています');
      }

      // Check capacity
      if (event.capacity) {
        const { count } = await supabase
          .from('event_participants')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('attendance_status', 'attending');

        if (count && count >= event.capacity) {
          throw new Error('イベントの定員に達しています');
        }
      }

      const { error } = await supabase
        .from('event_participants')
        .insert({
          event_id: eventId,
          user_id: user.id,
          attendance_status: 'pending',
          payment_status: 'unpaid',
        });

      if (error) throw error;

      set({ isLoading: false });
      await get().fetchMyEvents();
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  joinEventByCode: async (code: string, password?: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('event_code', code.toUpperCase())
        .single();

      if (error || !event) {
        throw new Error('イベントコードが見つかりません');
      }

      await get().joinEvent(event.id, code, password);
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  leaveEvent: async (eventId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインしていません');

      const { error } = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;

      set({ isLoading: false });
      await get().fetchMyEvents();
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  addManualParticipant: async (eventId: string, name: string, options?: { attendanceStatus?: AttendanceStatus; paymentStatus?: PaymentStatus; skillLevel?: number; gender?: GenderType }) => {
    try {
      set({ isLoading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインしていません');

      // Check if user is the organizer
      const { data: event } = await supabase
        .from('events')
        .select('organizer_id')
        .eq('id', eventId)
        .single();

      if (!event || event.organizer_id !== user.id) {
        throw new Error('主催者のみ手動で参加者を追加できます');
      }

      // Insert manual participant (user_id is null for manual entries)
      const { data: participant, error } = await supabase
        .from('event_participants')
        .insert({
          event_id: eventId,
          user_id: null,
          display_name: name,
          attendance_status: options?.attendanceStatus || 'attending',
          payment_status: options?.paymentStatus || 'unpaid',
          skill_level: options?.skillLevel || null,
          gender: options?.gender || null,
          is_manual: true,
        })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        participants: [...state.participants, { ...participant, user: null }],
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateManualParticipant: async (participantId: string, data: { display_name?: string; attendance_status?: AttendanceStatus; payment_status?: PaymentStatus; skill_level?: number; gender?: GenderType }) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase
        .from('event_participants')
        .update(data)
        .eq('id', participantId);

      if (error) throw error;

      set((state) => ({
        participants: state.participants.map((p) =>
          p.id === participantId ? { ...p, ...data } : p
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  removeParticipant: async (participantId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase
        .from('event_participants')
        .delete()
        .eq('id', participantId);

      if (error) throw error;

      set((state) => ({
        participants: state.participants.filter((p) => p.id !== participantId),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateAttendanceStatus: async (participantId: string, status: AttendanceStatus) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase
        .from('event_participants')
        .update({ attendance_status: status })
        .eq('id', participantId);

      if (error) throw error;

      set((state) => ({
        participants: state.participants.map((p) =>
          p.id === participantId ? { ...p, attendance_status: status } : p
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updatePaymentStatus: async (participantId: string, status: PaymentStatus) => {
    try {
      set({ isLoading: true, error: null });

      const updateData: any = { payment_status: status };
      if (status === 'paid') {
        updateData.payment_confirmed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('event_participants')
        .update(updateData)
        .eq('id', participantId);

      if (error) throw error;

      set((state) => ({
        participants: state.participants.map((p) =>
          p.id === participantId ? { ...p, ...updateData } : p
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateParticipantProfile: async (participantId: string, data: { skill_level?: number; gender?: GenderType }) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase
        .from('event_participants')
        .update(data)
        .eq('id', participantId);

      if (error) throw error;

      set((state) => ({
        participants: state.participants.map((p) =>
          p.id === participantId ? { ...p, ...data } : p
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  reportPayment: async (participantId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase
        .from('event_participants')
        .update({
          payment_status: 'pending_confirmation',
          payment_reported_at: new Date().toISOString(),
        })
        .eq('id', participantId);

      if (error) throw error;

      set((state) => ({
        participants: state.participants.map((p) =>
          p.id === participantId
            ? {
                ...p,
                payment_status: 'pending_confirmation' as PaymentStatus,
                payment_reported_at: new Date().toISOString(),
              }
            : p
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  confirmPayment: async (participantId: string) => {
    await get().updatePaymentStatus(participantId, 'paid');
  },

  duplicateEvent: async (eventId: string) => {
    try {
      set({ isLoading: true, error: null });

      // 元のイベントを取得
      const { data: originalEvent, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (fetchError) throw fetchError;
      if (!originalEvent) throw new Error('イベントが見つかりません');

      // 新しいイベントコードを生成
      const generateEventCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      // 日付を1週間後に設定
      const originalDate = new Date(originalEvent.date_time);
      const newDate = new Date(originalDate);
      newDate.setDate(newDate.getDate() + 7);

      // 新しいイベントを作成（参加者はコピーしない）
      const eventCode = generateEventCode();
      const inviteLink = `atsume://event/${eventCode}`;

      const newEventData = {
        name: `${originalEvent.name}（コピー）`,
        description: originalEvent.description,
        date_time: newDate.toISOString(),
        location: originalEvent.location,
        fee: originalEvent.fee,
        capacity: originalEvent.capacity,
        organizer_id: originalEvent.organizer_id,
        event_code: eventCode,
        password_hash: originalEvent.password_hash,
        invite_link: inviteLink,
        status: 'open' as const,
        skill_level_settings: originalEvent.skill_level_settings,
        gender_settings: originalEvent.gender_settings,
      };

      const { data: newEvent, error: createError } = await supabase
        .from('events')
        .insert(newEventData)
        .select()
        .single();

      if (createError) throw createError;

      // 主催者を参加者として追加
      const { error: participantError } = await supabase
        .from('event_participants')
        .insert({
          event_id: newEvent.id,
          user_id: newEvent.organizer_id,
          attendance_status: 'attending',
          payment_status: 'paid',
        });

      if (participantError) throw participantError;

      set((state) => ({
        events: [newEvent, ...state.events],
        isLoading: false,
      }));

      return newEvent;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  checkInParticipant: async (participantId: string, attended: boolean) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase
        .from('event_participants')
        .update({
          actual_attendance: attended,
          checked_in_at: new Date().toISOString(),
        })
        .eq('id', participantId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        participants: state.participants.map((p) =>
          p.id === participantId
            ? { ...p, actual_attendance: attended, checked_in_at: new Date().toISOString() }
            : p
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  bulkCheckIn: async (participantIds: string[], attended: boolean) => {
    try {
      set({ isLoading: true, error: null });

      const now = new Date().toISOString();

      // Update all participants at once
      const { error } = await supabase
        .from('event_participants')
        .update({
          actual_attendance: attended,
          checked_in_at: now,
        })
        .in('id', participantIds);

      if (error) throw error;

      // Update local state
      set((state) => ({
        participants: state.participants.map((p) =>
          participantIds.includes(p.id)
            ? { ...p, actual_attendance: attended, checked_in_at: now }
            : p
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  clearCurrentEvent: () => set({ currentEvent: null, participants: [] }),
}));
