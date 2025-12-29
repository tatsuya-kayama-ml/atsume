-- Add actual attendance tracking
-- This allows tracking both planned attendance and who actually showed up

-- Add actual_attendance column to event_participants
-- This is separate from attendance_status which represents the participant's RSVP
ALTER TABLE event_participants
ADD COLUMN IF NOT EXISTS actual_attendance BOOLEAN DEFAULT NULL;

-- Add checked_in_at timestamp to track when attendance was confirmed
ALTER TABLE event_participants
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN event_participants.attendance_status IS 'Participant RSVP status (pending, attending, not_attending, maybe)';
COMMENT ON COLUMN event_participants.actual_attendance IS 'Whether the participant actually attended (NULL = not yet checked, true = attended, false = no-show)';
COMMENT ON COLUMN event_participants.checked_in_at IS 'Timestamp when attendance was checked/confirmed by organizer';

-- Create index for quick lookup of checked-in participants
CREATE INDEX IF NOT EXISTS idx_participants_actual_attendance
ON event_participants(event_id, actual_attendance)
WHERE actual_attendance IS NOT NULL;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 004_add_actual_attendance.sql completed successfully';
END $$;
