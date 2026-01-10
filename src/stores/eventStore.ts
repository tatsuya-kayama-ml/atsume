import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { Event, EventParticipant, EventRsvp, EventAttendance, EventPaymentMethod, EventStatus, RsvpStatus, PaymentStatus, PaymentMethodType, SkillLevelSettings, GenderSettings, GenderType } from '../types';
import { logger } from '../utils';

interface EventState {
  events: Event[];
  currentEvent: Event | null;
  participants: EventParticipant[];
  paymentMethods: EventPaymentMethod[];
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

  // Payment method actions
  fetchPaymentMethods: (eventId: string) => Promise<void>;
  addPaymentMethod: (eventId: string, data: { type: PaymentMethodType; label: string; value: string }) => Promise<EventPaymentMethod>;
  updatePaymentMethod: (methodId: string, data: { type?: PaymentMethodType; label?: string; value?: string }) => Promise<void>;
  deletePaymentMethod: (methodId: string) => Promise<void>;
  reorderPaymentMethods: (methodIds: string[]) => Promise<void>;

  // Participant actions
  fetchParticipants: (eventId: string) => Promise<void>;
  joinEvent: (eventId: string) => Promise<void>;
  joinEventByCode: (code: string) => Promise<void>;
  leaveEvent: (eventId: string) => Promise<void>;
  addManualParticipant: (eventId: string, name: string, options?: { rsvpStatus?: RsvpStatus; paymentStatus?: PaymentStatus; skillLevel?: number; gender?: GenderType }) => Promise<void>;
  updateManualParticipant: (participantId: string, data: { display_name?: string; payment_status?: PaymentStatus; skill_level?: number; gender?: GenderType }) => Promise<void>;
  removeParticipant: (participantId: string) => Promise<void>;
  updatePaymentStatus: (participantId: string, status: PaymentStatus) => Promise<void>;
  updateParticipantProfile: (participantId: string, data: { skill_level?: number; gender?: GenderType }) => Promise<void>;
  reportPayment: (participantId: string, note?: string, paymentMethodId?: string) => Promise<void>;
  confirmPayment: (participantId: string) => Promise<void>;

  // RSVP actions (出席予定)
  updateRsvpStatus: (participantId: string, status: RsvpStatus) => Promise<void>;
  closeRsvp: (eventId: string) => Promise<void>;
  reopenRsvp: (eventId: string) => Promise<void>;
  isRsvpClosed: (event: Event | null) => boolean;

  // Attendance actions (実際の出席)
  recordAttendance: (participantId: string, attended: boolean) => Promise<void>;
  removeAttendance: (participantId: string) => Promise<void>;
  bulkRecordAttendance: (participantIds: string[], attended: boolean) => Promise<void>;

  // Event lookup
  findEventByCode: (code: string) => Promise<{ event: Event } | null>;

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
  skill_level_settings?: SkillLevelSettings;
  gender_settings?: GenderSettings;
  rsvp_deadline?: string;
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
  paymentMethods: [],
  isLoading: false,
  error: null,

  fetchMyEvents: async () => {
    try {
      set({ isLoading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      logger.log('[EventStore] fetchMyEvents - user:', user?.id);
      if (!user) throw new Error('ログインしていません');

      // Fetch events I organize
      const { data: organizedEvents, error: orgError } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user.id)
        .order('date_time', { ascending: true });

      logger.log('[EventStore] fetchMyEvents - organizedEvents:', organizedEvents?.length, 'error:', orgError);
      if (orgError) throw orgError;

      // Fetch events I participate in
      const { data: participations, error: partError } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('user_id', user.id);

      logger.log('[EventStore] fetchMyEvents - participations:', participations?.length, 'error:', partError);
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

      const insertData = {
        organizer_id: user.id,
        name: data.name,
        description: data.description || null,
        date_time: data.date_time,
        location: data.location,
        fee: data.fee,
        capacity: data.capacity || null,
        event_code: eventCode,
        invite_link: inviteLink,
        status: 'open' as EventStatus,
        timer_position: 'bottom',
        skill_level_settings: data.skill_level_settings || null,
        gender_settings: data.gender_settings || null,
        rsvp_deadline: data.rsvp_deadline || null,
      };
      logger.log('[EventStore] Inserting event');

      const { data: event, error } = await supabase
        .from('events')
        .insert(insertData)
        .select()
        .single();

      logger.log('[EventStore] Insert result:', { eventId: event?.id, error });

      if (error) throw error;

      // 主催者を参加者として自動追加（支払い済み状態）
      const { data: organizerParticipant, error: participantError } = await supabase
        .from('event_participants')
        .insert({
          event_id: event.id,
          user_id: user.id,
          payment_status: 'paid',
        })
        .select()
        .single();

      if (participantError) {
        logger.warn('[EventStore] Failed to add organizer as participant:', participantError);
        // 参加者追加に失敗してもイベント作成は成功として扱う
      } else if (organizerParticipant) {
        // Create RSVP for organizer
        const { error: rsvpError } = await supabase
          .from('event_rsvps')
          .insert({
            event_id: event.id,
            participant_id: organizerParticipant.id,
            status: 'attending',
          });

        if (rsvpError) {
          logger.warn('[EventStore] Failed to create RSVP for organizer:', rsvpError);
        }
      }

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

  // Payment method actions
  fetchPaymentMethods: async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_payment_methods')
        .select('*')
        .eq('event_id', eventId)
        .order('order_index', { ascending: true });

      if (error) throw error;

      set({ paymentMethods: data || [] });
    } catch (error: any) {
      logger.error('[EventStore] fetchPaymentMethods error:', error);
      set({ paymentMethods: [] });
    }
  },

  addPaymentMethod: async (eventId: string, data: { type: PaymentMethodType; label: string; value: string }) => {
    try {
      // Get current max order_index
      const { paymentMethods } = get();
      const maxOrder = paymentMethods.reduce((max, m) => Math.max(max, m.order_index), -1);

      const { data: newMethod, error } = await supabase
        .from('event_payment_methods')
        .insert({
          event_id: eventId,
          type: data.type,
          label: data.label,
          value: data.value,
          order_index: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        paymentMethods: [...state.paymentMethods, newMethod],
      }));

      return newMethod;
    } catch (error: any) {
      logger.error('[EventStore] addPaymentMethod error:', error);
      throw error;
    }
  },

  updatePaymentMethod: async (methodId: string, data: { type?: PaymentMethodType; label?: string; value?: string }) => {
    try {
      const { error } = await supabase
        .from('event_payment_methods')
        .update(data)
        .eq('id', methodId);

      if (error) throw error;

      set((state) => ({
        paymentMethods: state.paymentMethods.map((m) =>
          m.id === methodId ? { ...m, ...data } : m
        ),
      }));
    } catch (error: any) {
      logger.error('[EventStore] updatePaymentMethod error:', error);
      throw error;
    }
  },

  deletePaymentMethod: async (methodId: string) => {
    try {
      const { error } = await supabase
        .from('event_payment_methods')
        .delete()
        .eq('id', methodId);

      if (error) throw error;

      set((state) => ({
        paymentMethods: state.paymentMethods.filter((m) => m.id !== methodId),
      }));
    } catch (error: any) {
      logger.error('[EventStore] deletePaymentMethod error:', error);
      throw error;
    }
  },

  reorderPaymentMethods: async (methodIds: string[]) => {
    try {
      // Update each method's order_index
      const updates = methodIds.map((id, index) =>
        supabase
          .from('event_payment_methods')
          .update({ order_index: index })
          .eq('id', id)
      );

      await Promise.all(updates);

      set((state) => ({
        paymentMethods: state.paymentMethods
          .map((m) => ({
            ...m,
            order_index: methodIds.indexOf(m.id),
          }))
          .sort((a, b) => a.order_index - b.order_index),
      }));
    } catch (error: any) {
      logger.error('[EventStore] reorderPaymentMethods error:', error);
      throw error;
    }
  },

  fetchParticipants: async (eventId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          *,
          user:users (*),
          rsvp:event_rsvps (*),
          attendance:event_attendances (*)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Supabase returns arrays for one-to-one relations, extract first element
      const participants = (data || []).map((p: any) => ({
        ...p,
        rsvp: Array.isArray(p.rsvp) ? p.rsvp[0] || null : p.rsvp,
        attendance: Array.isArray(p.attendance) ? p.attendance[0] || null : p.attendance,
      }));

      set({ participants, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  joinEvent: async (eventId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインしていません');

      // Check if event exists
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw new Error('イベントが見つかりません');

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

      // Check capacity using RSVP table
      if (event.capacity) {
        const { count } = await supabase
          .from('event_rsvps')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('status', 'attending');

        if (count && count >= event.capacity) {
          throw new Error('イベントの定員に達しています');
        }
      }

      // Create participant record
      const { data: participant, error } = await supabase
        .from('event_participants')
        .insert({
          event_id: eventId,
          user_id: user.id,
          payment_status: 'unpaid',
        })
        .select()
        .single();

      if (error) throw error;

      // Create RSVP record
      const { error: rsvpError } = await supabase
        .from('event_rsvps')
        .insert({
          event_id: eventId,
          participant_id: participant.id,
          status: 'pending',
        });

      if (rsvpError) {
        logger.warn('[EventStore] Failed to create RSVP:', rsvpError);
      }

      set({ isLoading: false });
      await get().fetchMyEvents();
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  joinEventByCode: async (code: string) => {
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

      await get().joinEvent(event.id);
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

  addManualParticipant: async (eventId: string, name: string, options?: { rsvpStatus?: RsvpStatus; paymentStatus?: PaymentStatus; skillLevel?: number; gender?: GenderType }) => {
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
          payment_status: options?.paymentStatus || 'unpaid',
          skill_level: options?.skillLevel || null,
          gender: options?.gender || null,
          is_manual: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Create RSVP record
      const rsvpStatus = options?.rsvpStatus || 'attending';
      const { data: rsvp, error: rsvpError } = await supabase
        .from('event_rsvps')
        .insert({
          event_id: eventId,
          participant_id: participant.id,
          status: rsvpStatus,
        })
        .select()
        .single();

      if (rsvpError) {
        logger.warn('[EventStore] Failed to create RSVP for manual participant:', rsvpError);
      }

      set((state) => ({
        participants: [...state.participants, { ...participant, user: null, rsvp: rsvp || null, attendance: null }],
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateManualParticipant: async (participantId: string, data: { display_name?: string; payment_status?: PaymentStatus; skill_level?: number; gender?: GenderType }) => {
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

  updateRsvpStatus: async (participantId: string, status: RsvpStatus) => {
    try {
      set({ isLoading: true, error: null });

      // Get participant to find event_id
      const participant = get().participants.find(p => p.id === participantId);
      if (!participant) throw new Error('参加者が見つかりません');

      // Check if RSVP exists
      const { data: existingRsvp } = await supabase
        .from('event_rsvps')
        .select('id')
        .eq('participant_id', participantId)
        .single();

      const now = new Date().toISOString();

      if (existingRsvp) {
        // Update existing RSVP
        const { error } = await supabase
          .from('event_rsvps')
          .update({ status, responded_at: now })
          .eq('participant_id', participantId);

        if (error) throw error;
      } else {
        // Create new RSVP
        const { error } = await supabase
          .from('event_rsvps')
          .insert({
            event_id: participant.event_id,
            participant_id: participantId,
            status,
            responded_at: now,
          });

        if (error) throw error;
      }

      set((state) => ({
        participants: state.participants.map((p) =>
          p.id === participantId
            ? {
                ...p,
                rsvp: {
                  ...(p.rsvp || { id: '', event_id: p.event_id, participant_id: p.id, created_at: now, updated_at: now }),
                  status,
                  responded_at: now,
                } as EventRsvp,
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

  closeRsvp: async (eventId: string) => {
    try {
      set({ isLoading: true, error: null });

      const now = new Date().toISOString();

      const { error } = await supabase
        .from('events')
        .update({
          rsvp_closed: true,
          rsvp_closed_at: now,
        })
        .eq('id', eventId);

      if (error) throw error;

      set((state) => ({
        currentEvent: state.currentEvent
          ? { ...state.currentEvent, rsvp_closed: true, rsvp_closed_at: now }
          : null,
        events: state.events.map((e) =>
          e.id === eventId ? { ...e, rsvp_closed: true, rsvp_closed_at: now } : e
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  reopenRsvp: async (eventId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase
        .from('events')
        .update({
          rsvp_closed: false,
          rsvp_closed_at: null,
        })
        .eq('id', eventId);

      if (error) throw error;

      set((state) => ({
        currentEvent: state.currentEvent
          ? { ...state.currentEvent, rsvp_closed: false, rsvp_closed_at: null }
          : null,
        events: state.events.map((e) =>
          e.id === eventId ? { ...e, rsvp_closed: false, rsvp_closed_at: null } : e
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  isRsvpClosed: (event: Event | null) => {
    if (!event) return false;

    // Manual close takes priority
    if (event.rsvp_closed) return true;

    // Check deadline
    if (event.rsvp_deadline) {
      const deadline = new Date(event.rsvp_deadline);
      return new Date() > deadline;
    }

    return false;
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

  reportPayment: async (participantId: string, note?: string, paymentMethodId?: string) => {
    try {
      set({ isLoading: true, error: null });

      const updateData: {
        payment_status: PaymentStatus;
        payment_reported_at: string;
        payment_note?: string | null;
        payment_method_id?: string | null;
      } = {
        payment_status: 'pending_confirmation',
        payment_reported_at: new Date().toISOString(),
      };

      if (note !== undefined) {
        updateData.payment_note = note || null;
      }

      if (paymentMethodId !== undefined) {
        updateData.payment_method_id = paymentMethodId || null;
      }

      const { error } = await supabase
        .from('event_participants')
        .update(updateData)
        .eq('id', participantId);

      if (error) throw error;

      // Get the payment method if specified
      const paymentMethod = paymentMethodId
        ? get().paymentMethods.find((m) => m.id === paymentMethodId)
        : undefined;

      set((state) => ({
        participants: state.participants.map((p) =>
          p.id === participantId
            ? {
                ...p,
                payment_status: 'pending_confirmation' as PaymentStatus,
                payment_reported_at: new Date().toISOString(),
                payment_note: note || null,
                payment_method_id: paymentMethodId || null,
                payment_method: paymentMethod,
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
      const { data: organizerParticipant, error: participantError } = await supabase
        .from('event_participants')
        .insert({
          event_id: newEvent.id,
          user_id: newEvent.organizer_id,
          payment_status: 'paid',
        })
        .select()
        .single();

      if (participantError) throw participantError;

      // Create RSVP for organizer
      if (organizerParticipant) {
        const { error: rsvpError } = await supabase
          .from('event_rsvps')
          .insert({
            event_id: newEvent.id,
            participant_id: organizerParticipant.id,
            status: 'attending',
          });

        if (rsvpError) {
          logger.warn('[EventStore] Failed to create RSVP for organizer in duplicated event:', rsvpError);
        }
      }

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

  recordAttendance: async (participantId: string, attended: boolean) => {
    try {
      set({ isLoading: true, error: null });

      const participant = get().participants.find(p => p.id === participantId);
      if (!participant) throw new Error('参加者が見つかりません');

      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      // Check if attendance record exists
      const { data: existingAttendance } = await supabase
        .from('event_attendances')
        .select('id')
        .eq('participant_id', participantId)
        .single();

      let attendanceRecord: EventAttendance;

      if (existingAttendance) {
        // Update existing attendance
        const { data, error } = await supabase
          .from('event_attendances')
          .update({
            attended,
            checked_in_at: now,
            checked_in_by: user?.id || null,
          })
          .eq('participant_id', participantId)
          .select()
          .single();

        if (error) throw error;
        attendanceRecord = data;
      } else {
        // Create new attendance record
        const { data, error } = await supabase
          .from('event_attendances')
          .insert({
            event_id: participant.event_id,
            participant_id: participantId,
            attended,
            checked_in_at: now,
            checked_in_by: user?.id || null,
            check_in_method: 'manual',
          })
          .select()
          .single();

        if (error) throw error;
        attendanceRecord = data;
      }

      set((state) => ({
        participants: state.participants.map((p) =>
          p.id === participantId
            ? { ...p, attendance: attendanceRecord }
            : p
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  removeAttendance: async (participantId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase
        .from('event_attendances')
        .delete()
        .eq('participant_id', participantId);

      if (error) throw error;

      set((state) => ({
        participants: state.participants.map((p) =>
          p.id === participantId
            ? { ...p, attendance: undefined }
            : p
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  bulkRecordAttendance: async (participantIds: string[], attended: boolean) => {
    try {
      set({ isLoading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const participants = get().participants;

      // Process each participant
      for (const participantId of participantIds) {
        const participant = participants.find(p => p.id === participantId);
        if (!participant) continue;

        // Check if attendance record exists
        const { data: existingAttendance } = await supabase
          .from('event_attendances')
          .select('id')
          .eq('participant_id', participantId)
          .single();

        if (existingAttendance) {
          await supabase
            .from('event_attendances')
            .update({
              attended,
              checked_in_at: now,
              checked_in_by: user?.id || null,
            })
            .eq('participant_id', participantId);
        } else {
          await supabase
            .from('event_attendances')
            .insert({
              event_id: participant.event_id,
              participant_id: participantId,
              attended,
              checked_in_at: now,
              checked_in_by: user?.id || null,
              check_in_method: 'manual',
            });
        }
      }

      // Refetch to get updated data
      const currentEvent = get().currentEvent;
      if (currentEvent) {
        await get().fetchParticipants(currentEvent.id);
      }

      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  findEventByCode: async (code: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('event_code', code.toUpperCase())
        .single();

      set({ isLoading: false });

      if (error || !event) {
        return null;
      }

      return { event };
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  clearError: () => set({ error: null }),
  clearCurrentEvent: () => set({ currentEvent: null, participants: [], paymentMethods: [] }),
}));
