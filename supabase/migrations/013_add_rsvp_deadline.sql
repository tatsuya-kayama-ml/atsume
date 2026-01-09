-- Migration: Add RSVP deadline and close functionality
-- This migration adds fields for managing RSVP deadlines and closing registration

-- ============================================
-- STEP 1: Add deadline columns to events table
-- ============================================
ALTER TABLE events ADD COLUMN IF NOT EXISTS rsvp_deadline TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS rsvp_closed BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS rsvp_closed_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================
-- STEP 2: Add comments for documentation
-- ============================================
COMMENT ON COLUMN events.rsvp_deadline IS 'Optional deadline for RSVP responses. After this time, new participants cannot join (unless added by organizer)';
COMMENT ON COLUMN events.rsvp_closed IS 'Manual flag to close RSVP. When true, new participants cannot join';
COMMENT ON COLUMN events.rsvp_closed_at IS 'Timestamp when RSVP was closed (either manually or by deadline)';

-- ============================================
-- STEP 3: Create index for deadline queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_events_rsvp_deadline ON events(rsvp_deadline) WHERE rsvp_deadline IS NOT NULL;

-- ============================================
-- STEP 4: Success message
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 013_add_rsvp_deadline.sql completed successfully';
    RAISE NOTICE 'Added columns to events: rsvp_deadline, rsvp_closed, rsvp_closed_at';
END $$;
