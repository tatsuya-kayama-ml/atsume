-- Migration 009: Fix Multiple Permissive Policies
-- The issue is that "FOR ALL" policies include SELECT, causing duplicates with dedicated SELECT policies
-- Solution: Change "FOR ALL" to specific actions (INSERT, UPDATE, DELETE) excluding SELECT

-- ============================================================================
-- TEAMS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Event members can view teams" ON teams;
DROP POLICY IF EXISTS "Organizers can manage teams" ON teams;

-- Single SELECT policy that covers both event members and organizers
CREATE POLICY "Select teams" ON teams
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

-- Organizers can INSERT, UPDATE, DELETE
CREATE POLICY "Organizers can insert teams" ON teams
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = teams.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

CREATE POLICY "Organizers can update teams" ON teams
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = teams.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

CREATE POLICY "Organizers can delete teams" ON teams
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = teams.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

-- ============================================================================
-- TEAM_MEMBERS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Event members can view team members" ON team_members;
DROP POLICY IF EXISTS "Organizers can manage team members" ON team_members;

-- Single SELECT policy
CREATE POLICY "Select team members" ON team_members
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

-- Organizers can INSERT, UPDATE, DELETE
CREATE POLICY "Organizers can insert team members" ON team_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM teams t
            JOIN events e ON e.id = t.event_id
            WHERE t.id = team_members.team_id
            AND e.organizer_id = (select auth.uid())
        )
    );

CREATE POLICY "Organizers can update team members" ON team_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM teams t
            JOIN events e ON e.id = t.event_id
            WHERE t.id = team_members.team_id
            AND e.organizer_id = (select auth.uid())
        )
    );

CREATE POLICY "Organizers can delete team members" ON team_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM teams t
            JOIN events e ON e.id = t.event_id
            WHERE t.id = team_members.team_id
            AND e.organizer_id = (select auth.uid())
        )
    );

-- ============================================================================
-- TOURNAMENTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Event members can view tournaments" ON tournaments;
DROP POLICY IF EXISTS "Organizers can manage tournaments" ON tournaments;

-- Single SELECT policy
CREATE POLICY "Select tournaments" ON tournaments
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

-- Organizers can INSERT, UPDATE, DELETE
CREATE POLICY "Organizers can insert tournaments" ON tournaments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = tournaments.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

CREATE POLICY "Organizers can update tournaments" ON tournaments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = tournaments.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

CREATE POLICY "Organizers can delete tournaments" ON tournaments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = tournaments.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

-- ============================================================================
-- MATCHES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Event members can view matches" ON matches;
DROP POLICY IF EXISTS "Organizers can manage matches" ON matches;

-- Single SELECT policy
CREATE POLICY "Select matches" ON matches
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

-- Organizers can INSERT, UPDATE, DELETE
CREATE POLICY "Organizers can insert matches" ON matches
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tournaments t
            JOIN events e ON e.id = t.event_id
            WHERE t.id = matches.tournament_id
            AND e.organizer_id = (select auth.uid())
        )
    );

CREATE POLICY "Organizers can update matches" ON matches
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM tournaments t
            JOIN events e ON e.id = t.event_id
            WHERE t.id = matches.tournament_id
            AND e.organizer_id = (select auth.uid())
        )
    );

CREATE POLICY "Organizers can delete matches" ON matches
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM tournaments t
            JOIN events e ON e.id = t.event_id
            WHERE t.id = matches.tournament_id
            AND e.organizer_id = (select auth.uid())
        )
    );

-- ============================================================================
-- GROUP_STANDINGS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Event members can view standings" ON group_standings;
DROP POLICY IF EXISTS "Organizers can manage standings" ON group_standings;

-- Single SELECT policy
CREATE POLICY "Select group standings" ON group_standings
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

-- Organizers can INSERT, UPDATE, DELETE
CREATE POLICY "Organizers can insert group standings" ON group_standings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tournaments t
            JOIN events e ON e.id = t.event_id
            WHERE t.id = group_standings.tournament_id
            AND e.organizer_id = (select auth.uid())
        )
    );

CREATE POLICY "Organizers can update group standings" ON group_standings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM tournaments t
            JOIN events e ON e.id = t.event_id
            WHERE t.id = group_standings.tournament_id
            AND e.organizer_id = (select auth.uid())
        )
    );

CREATE POLICY "Organizers can delete group standings" ON group_standings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM tournaments t
            JOIN events e ON e.id = t.event_id
            WHERE t.id = group_standings.tournament_id
            AND e.organizer_id = (select auth.uid())
        )
    );

-- ============================================================================
-- TIMER_STATES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Event members can view timer" ON timer_states;
DROP POLICY IF EXISTS "Organizers can manage timer" ON timer_states;

-- Single SELECT policy
CREATE POLICY "Select timer states" ON timer_states
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

-- Organizers can INSERT, UPDATE, DELETE
CREATE POLICY "Organizers can insert timer states" ON timer_states
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = timer_states.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

CREATE POLICY "Organizers can update timer states" ON timer_states
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = timer_states.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

CREATE POLICY "Organizers can delete timer states" ON timer_states
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = timer_states.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

-- ============================================================================
-- Summary
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration 009_fix_duplicate_policies.sql completed';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Fixed: Replaced FOR ALL policies with separate';
    RAISE NOTICE '       INSERT, UPDATE, DELETE policies to avoid';
    RAISE NOTICE '       duplicate SELECT policies.';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables fixed:';
    RAISE NOTICE '  - teams';
    RAISE NOTICE '  - team_members';
    RAISE NOTICE '  - tournaments';
    RAISE NOTICE '  - matches';
    RAISE NOTICE '  - group_standings';
    RAISE NOTICE '  - timer_states';
    RAISE NOTICE '============================================';
END $$;
