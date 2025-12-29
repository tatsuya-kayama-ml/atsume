-- Migration for Matches Feature
-- This migration assumes 001_initial_schema.sql has already been run
-- Only adds/updates what's needed for the matches feature

-- Check if event_participants table needs skill_level and gender columns
DO $$
BEGIN
    -- Add skill_level column to event_participants if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_participants'
        AND column_name = 'skill_level'
    ) THEN
        ALTER TABLE event_participants
        ADD COLUMN skill_level INTEGER CHECK (skill_level >= 1 AND skill_level <= 5);
    END IF;

    -- Add gender column to event_participants if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_participants'
        AND column_name = 'gender'
    ) THEN
        -- Create gender type if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_type') THEN
            CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
        END IF;

        ALTER TABLE event_participants
        ADD COLUMN gender gender_type;
    END IF;

    -- Add display_name column to event_participants for manual participants
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_participants'
        AND column_name = 'display_name'
    ) THEN
        ALTER TABLE event_participants
        ADD COLUMN display_name TEXT;
    END IF;

    -- Add is_manual column to event_participants
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_participants'
        AND column_name = 'is_manual'
    ) THEN
        ALTER TABLE event_participants
        ADD COLUMN is_manual BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add avatar_url column to users if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE users
        ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- Modify event_participants user_id to be nullable for manual participants
ALTER TABLE event_participants
ALTER COLUMN user_id DROP NOT NULL;

-- Update the unique constraint to handle manual participants
ALTER TABLE event_participants
DROP CONSTRAINT IF EXISTS event_participants_event_id_user_id_key;

-- Add comments for new columns
COMMENT ON COLUMN event_participants.skill_level IS 'Participant skill level (1-5), can override user default';
COMMENT ON COLUMN event_participants.gender IS 'Participant gender, can override user default';
COMMENT ON COLUMN event_participants.display_name IS 'Display name for manual participants (those without user accounts)';
COMMENT ON COLUMN event_participants.is_manual IS 'True if this participant was manually added by organizer (no user account)';

-- Update RLS policies to allow organizers to add manual participants
DROP POLICY IF EXISTS "Users can join events" ON event_participants;

CREATE POLICY "Users can join events" ON event_participants
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_participants.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- Ensure tournaments, matches, and group_standings tables exist with proper structure
-- (They should already exist from 001_initial_schema.sql, this is just a safety check)

-- Verify tournaments table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournaments') THEN
        RAISE EXCEPTION 'tournaments table does not exist. Please run 001_initial_schema.sql first.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matches') THEN
        RAISE EXCEPTION 'matches table does not exist. Please run 001_initial_schema.sql first.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_standings') THEN
        RAISE EXCEPTION 'group_standings table does not exist. Please run 001_initial_schema.sql first.';
    END IF;
END $$;

-- Add index for manual participants lookup
CREATE INDEX IF NOT EXISTS idx_participants_is_manual ON event_participants(event_id, is_manual) WHERE is_manual = TRUE;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 003_matches_feature.sql completed successfully';
END $$;
