-- Migration: Separate RSVP and Actual Attendance
-- This migration creates separate tables for RSVP (attendance intent) and actual attendance records

-- ============================================
-- STEP 1: Add 'unconfirmed' to attendance_status enum if not exists
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'unconfirmed'
        AND enumtypid = 'attendance_status'::regtype
    ) THEN
        ALTER TYPE attendance_status ADD VALUE 'unconfirmed';
    END IF;
END $$;

-- ============================================
-- STEP 2: Create event_rsvps table (出席予定)
-- ============================================
CREATE TABLE IF NOT EXISTS event_rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
    status attendance_status NOT NULL DEFAULT 'pending',
    responded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, participant_id)
);

-- Indexes for event_rsvps
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_participant ON event_rsvps(participant_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_status ON event_rsvps(event_id, status);

-- Trigger for updated_at
CREATE TRIGGER update_event_rsvps_updated_at
    BEFORE UPDATE ON event_rsvps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE event_rsvps IS 'Stores participant RSVP (attendance intent) for events';
COMMENT ON COLUMN event_rsvps.status IS 'RSVP status: pending, attending, not_attending, maybe, unconfirmed';
COMMENT ON COLUMN event_rsvps.responded_at IS 'Timestamp when the participant last responded/changed their RSVP';

-- ============================================
-- STEP 3: Create event_attendances table (実際の出席)
-- ============================================
CREATE TABLE IF NOT EXISTS event_attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
    attended BOOLEAN NOT NULL,
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    checked_in_by UUID REFERENCES users(id),
    check_in_method TEXT DEFAULT 'manual',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, participant_id)
);

-- Indexes for event_attendances
CREATE INDEX IF NOT EXISTS idx_event_attendances_event ON event_attendances(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendances_participant ON event_attendances(participant_id);
CREATE INDEX IF NOT EXISTS idx_event_attendances_attended ON event_attendances(event_id, attended);

-- Trigger for updated_at
CREATE TRIGGER update_event_attendances_updated_at
    BEFORE UPDATE ON event_attendances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE event_attendances IS 'Stores actual attendance records confirmed by organizers';
COMMENT ON COLUMN event_attendances.attended IS 'Whether the participant actually attended (true=attended, false=no-show)';
COMMENT ON COLUMN event_attendances.checked_in_at IS 'Timestamp when attendance was confirmed';
COMMENT ON COLUMN event_attendances.checked_in_by IS 'User ID of the organizer who confirmed attendance';
COMMENT ON COLUMN event_attendances.check_in_method IS 'Method of check-in: manual, qr_code, auto';
COMMENT ON COLUMN event_attendances.notes IS 'Optional notes (e.g., late arrival, early departure)';

-- ============================================
-- STEP 4: Enable RLS
-- ============================================
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendances ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: RLS Policies for event_rsvps
-- ============================================

-- SELECT: Participants and organizers can view RSVPs
CREATE POLICY "Anyone can view RSVPs for events they participate in or organize" ON event_rsvps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_participants ep
            WHERE ep.event_id = event_rsvps.event_id
            AND ep.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_rsvps.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- INSERT: Users can create their own RSVP
CREATE POLICY "Users can create own RSVP" ON event_rsvps
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_participants ep
            WHERE ep.id = event_rsvps.participant_id
            AND ep.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_rsvps.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- UPDATE: Users can update their own RSVP, organizers can update any
CREATE POLICY "Users can update own RSVP or organizers can update any" ON event_rsvps
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM event_participants ep
            WHERE ep.id = event_rsvps.participant_id
            AND ep.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_rsvps.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- DELETE: Organizers can delete RSVPs
CREATE POLICY "Organizers can delete RSVPs" ON event_rsvps
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_rsvps.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- ============================================
-- STEP 6: RLS Policies for event_attendances
-- ============================================

-- SELECT: Participants and organizers can view attendance records
CREATE POLICY "Anyone can view attendances for events they participate in or organize" ON event_attendances
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_participants ep
            WHERE ep.event_id = event_attendances.event_id
            AND ep.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_attendances.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- INSERT: Only organizers can record attendance
CREATE POLICY "Organizers can record attendance" ON event_attendances
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_attendances.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- UPDATE: Only organizers can update attendance records
CREATE POLICY "Organizers can update attendance records" ON event_attendances
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_attendances.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- DELETE: Only organizers can delete attendance records
CREATE POLICY "Organizers can delete attendance records" ON event_attendances
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_attendances.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- ============================================
-- STEP 7: Remove old columns from event_participants
-- ============================================
ALTER TABLE event_participants DROP COLUMN IF EXISTS attendance_status;
ALTER TABLE event_participants DROP COLUMN IF EXISTS actual_attendance;
ALTER TABLE event_participants DROP COLUMN IF EXISTS checked_in_at;

-- Drop old index if exists
DROP INDEX IF EXISTS idx_participants_actual_attendance;

-- ============================================
-- STEP 8: Success message
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 012_separate_rsvp_and_attendance.sql completed successfully';
    RAISE NOTICE 'Created tables: event_rsvps, event_attendances';
    RAISE NOTICE 'Removed columns from event_participants: attendance_status, actual_attendance, checked_in_at';
END $$;
