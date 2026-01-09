-- Migration 010: Fix event_participants SELECT policy
-- The current policy requires users to already be a participant to see participant data,
-- but users need to query their own participation records to find their events.

DROP POLICY IF EXISTS "Select event participants" ON event_participants;

CREATE POLICY "Select event participants" ON event_participants
    FOR SELECT USING (
        -- User can see their own participation records
        (select auth.uid()) = user_id
        OR
        -- Organizer can see all participants of their events
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_participants.event_id
            AND e.organizer_id = (select auth.uid())
        )
    );

DO $$
BEGIN
    RAISE NOTICE 'Migration 010: Fixed event_participants SELECT policy';
    RAISE NOTICE 'Users can now see their own participation records';
END $$;
