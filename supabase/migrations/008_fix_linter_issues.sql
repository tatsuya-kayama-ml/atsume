-- Migration 008: Fix Supabase Linter Issues
-- This migration addresses all 75 issues reported by Supabase Database Linter

-- ============================================================================
-- 1. FIX: function_search_path_mutable
-- Set search_path for update_updated_at_column function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. FIX: rls_policy_always_true
-- Replace overly permissive policies with proper role-based checks
-- ============================================================================

-- Fix notifications INSERT policy (currently WITH CHECK (true))
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Only authenticated users can create notifications for other users
-- Or service_role can create any notification
CREATE POLICY "Authenticated users can create notifications" ON notifications
    FOR INSERT WITH CHECK (
        -- User can create notification for themselves (edge case)
        (select auth.uid()) = user_id
        OR
        -- Organizer can create notifications for event participants
        EXISTS (
            SELECT 1 FROM events e
            JOIN event_participants ep ON ep.event_id = e.id
            WHERE e.organizer_id = (select auth.uid())
            AND ep.user_id = notifications.user_id
            AND (notifications.event_id IS NULL OR notifications.event_id = e.id)
        )
    );

-- Fix users INSERT policy (currently WITH CHECK (true) for Service role)
DROP POLICY IF EXISTS "Service role can insert users" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Users can only insert their own profile (linked to auth.users)
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- ============================================================================
-- 3. FIX: auth_rls_initplan
-- Wrap auth.uid() with (select ...) for better performance
-- This prevents re-evaluation of auth.uid() for each row
-- ============================================================================

-- === USERS TABLE ===
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING ((select auth.uid()) = id);

-- === EVENTS TABLE ===
DROP POLICY IF EXISTS "Users can create events" ON events;
CREATE POLICY "Users can create events" ON events
    FOR INSERT WITH CHECK ((select auth.uid()) = organizer_id);

DROP POLICY IF EXISTS "Organizers can update their events" ON events;
CREATE POLICY "Organizers can update their events" ON events
    FOR UPDATE USING ((select auth.uid()) = organizer_id);

DROP POLICY IF EXISTS "Organizers can delete their events" ON events;
CREATE POLICY "Organizers can delete their events" ON events
    FOR DELETE USING ((select auth.uid()) = organizer_id);

-- === EVENT_PARTICIPANTS TABLE ===
-- Drop all existing policies first
DROP POLICY IF EXISTS "Participants can view event members" ON event_participants;
DROP POLICY IF EXISTS "Users can join events" ON event_participants;
DROP POLICY IF EXISTS "Users can update own participation" ON event_participants;
DROP POLICY IF EXISTS "Users can leave events" ON event_participants;
DROP POLICY IF EXISTS "Select event participants" ON event_participants;
DROP POLICY IF EXISTS "Insert event participants" ON event_participants;
DROP POLICY IF EXISTS "Update event participants" ON event_participants;
DROP POLICY IF EXISTS "Delete event participants" ON event_participants;
DROP POLICY IF EXISTS "Participants can delete own record" ON event_participants;
DROP POLICY IF EXISTS "Organizers can delete event participants" ON event_participants;

-- Create consolidated policies (fixing multiple_permissive_policies issue too)
CREATE POLICY "Select event participants" ON event_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_participants ep
            WHERE ep.event_id = event_participants.event_id
            AND ep.user_id = (select auth.uid())
        )
        OR
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_participants.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

-- Single INSERT policy (combines "Users can join events" and organizer manual add)
CREATE POLICY "Insert event participants" ON event_participants
    FOR INSERT WITH CHECK (
        (select auth.uid()) = user_id
        OR
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_participants.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

CREATE POLICY "Update event participants" ON event_participants
    FOR UPDATE USING (
        (select auth.uid()) = user_id
        OR
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_participants.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

-- Single DELETE policy (combines all delete policies)
CREATE POLICY "Delete event participants" ON event_participants
    FOR DELETE USING (
        (select auth.uid()) = user_id
        OR
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_participants.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

-- === TEAMS TABLE ===
DROP POLICY IF EXISTS "Event members can view teams" ON teams;
DROP POLICY IF EXISTS "Organizers can manage teams" ON teams;

CREATE POLICY "Event members can view teams" ON teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_participants ep
            WHERE ep.event_id = teams.event_id
            AND ep.user_id = (select auth.uid())
        )
        OR
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = teams.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

CREATE POLICY "Organizers can manage teams" ON teams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = teams.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

-- === TEAM_MEMBERS TABLE ===
DROP POLICY IF EXISTS "Event members can view team members" ON team_members;
DROP POLICY IF EXISTS "Organizers can manage team members" ON team_members;

CREATE POLICY "Event members can view team members" ON team_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM teams t
            JOIN event_participants ep ON ep.event_id = t.event_id
            WHERE t.id = team_members.team_id
            AND ep.user_id = (select auth.uid())
        )
        OR
        EXISTS (
            SELECT 1 FROM teams t
            JOIN events e ON e.id = t.event_id
            WHERE t.id = team_members.team_id
            AND e.organizer_id = (select auth.uid())
        )
    );

CREATE POLICY "Organizers can manage team members" ON team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM teams t
            JOIN events e ON e.id = t.event_id
            WHERE t.id = team_members.team_id
            AND e.organizer_id = (select auth.uid())
        )
    );

-- === TOURNAMENTS TABLE ===
DROP POLICY IF EXISTS "Event members can view tournaments" ON tournaments;
DROP POLICY IF EXISTS "Organizers can manage tournaments" ON tournaments;

CREATE POLICY "Event members can view tournaments" ON tournaments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_participants ep
            WHERE ep.event_id = tournaments.event_id
            AND ep.user_id = (select auth.uid())
        )
        OR
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = tournaments.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

CREATE POLICY "Organizers can manage tournaments" ON tournaments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = tournaments.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

-- === MATCHES TABLE ===
DROP POLICY IF EXISTS "Event members can view matches" ON matches;
DROP POLICY IF EXISTS "Organizers can manage matches" ON matches;

CREATE POLICY "Event members can view matches" ON matches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tournaments t
            JOIN event_participants ep ON ep.event_id = t.event_id
            WHERE t.id = matches.tournament_id
            AND ep.user_id = (select auth.uid())
        )
        OR
        EXISTS (
            SELECT 1 FROM tournaments t
            JOIN events e ON e.id = t.event_id
            WHERE t.id = matches.tournament_id
            AND e.organizer_id = (select auth.uid())
        )
    );

CREATE POLICY "Organizers can manage matches" ON matches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tournaments t
            JOIN events e ON e.id = t.event_id
            WHERE t.id = matches.tournament_id
            AND e.organizer_id = (select auth.uid())
        )
    );

-- === GROUP_STANDINGS TABLE ===
DROP POLICY IF EXISTS "Event members can view standings" ON group_standings;
DROP POLICY IF EXISTS "Organizers can manage standings" ON group_standings;

CREATE POLICY "Event members can view standings" ON group_standings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tournaments t
            JOIN event_participants ep ON ep.event_id = t.event_id
            WHERE t.id = group_standings.tournament_id
            AND ep.user_id = (select auth.uid())
        )
        OR
        EXISTS (
            SELECT 1 FROM tournaments t
            JOIN events e ON e.id = t.event_id
            WHERE t.id = group_standings.tournament_id
            AND e.organizer_id = (select auth.uid())
        )
    );

CREATE POLICY "Organizers can manage standings" ON group_standings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tournaments t
            JOIN events e ON e.id = t.event_id
            WHERE t.id = group_standings.tournament_id
            AND e.organizer_id = (select auth.uid())
        )
    );

-- === NOTIFICATIONS TABLE ===
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING ((select auth.uid()) = user_id);

-- === TIMER_STATES TABLE ===
DROP POLICY IF EXISTS "Event members can view timer" ON timer_states;
DROP POLICY IF EXISTS "Organizers can manage timer" ON timer_states;

CREATE POLICY "Event members can view timer" ON timer_states
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_participants ep
            WHERE ep.event_id = timer_states.event_id
            AND ep.user_id = (select auth.uid())
        )
        OR
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = timer_states.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

CREATE POLICY "Organizers can manage timer" ON timer_states
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = timer_states.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

-- ============================================================================
-- 4. FIX: unindexed_foreign_keys
-- Add missing indexes for foreign keys
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_group_standings_team_id ON group_standings(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_team1_id ON matches(team1_id);
CREATE INDEX IF NOT EXISTS idx_matches_team2_id ON matches(team2_id);
CREATE INDEX IF NOT EXISTS idx_matches_winner_id ON matches(winner_id);
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_team_members_participant_id ON team_members(participant_id);

-- ============================================================================
-- 5. INFO: unused_index (optional cleanup - commented out for safety)
-- These indexes may be unused but could be needed in the future
-- Uncomment to remove if confirmed unnecessary
-- ============================================================================

-- DROP INDEX IF EXISTS idx_events_status;
-- DROP INDEX IF EXISTS idx_notifications_unread;
-- DROP INDEX IF EXISTS idx_participants_is_manual;
-- DROP INDEX IF EXISTS idx_participants_actual_attendance;

-- ============================================================================
-- Summary
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration 008_fix_linter_issues.sql completed';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Fixed issues:';
    RAISE NOTICE '  - function_search_path_mutable (1 issue)';
    RAISE NOTICE '  - rls_policy_always_true (2 issues)';
    RAISE NOTICE '  - auth_rls_initplan (27 issues)';
    RAISE NOTICE '  - multiple_permissive_policies (40+ issues)';
    RAISE NOTICE '  - unindexed_foreign_keys (6 issues)';
    RAISE NOTICE '';
    RAISE NOTICE 'Manual actions required:';
    RAISE NOTICE '  1. Enable "Leaked Password Protection" in Supabase Dashboard';
    RAISE NOTICE '     -> Authentication -> Providers -> Email -> Enable "Protect against leaked passwords"';
    RAISE NOTICE '  2. Consider switching Auth DB connections to percentage-based';
    RAISE NOTICE '     -> Project Settings -> Auth -> Database connection strategy';
    RAISE NOTICE '============================================';
END $$;
