-- ATSUME Database Schema
-- Initial migration for Phase 1 (MVP)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom types
CREATE TYPE attendance_status AS ENUM ('pending', 'attending', 'not_attending', 'maybe');
CREATE TYPE payment_status AS ENUM ('unpaid', 'pending_confirmation', 'paid');
CREATE TYPE event_status AS ENUM ('draft', 'open', 'closed', 'in_progress', 'completed');
CREATE TYPE tournament_format AS ENUM ('tournament', 'round_robin', 'league');
CREATE TYPE match_status AS ENUM ('scheduled', 'in_progress', 'completed');
CREATE TYPE timer_position AS ENUM ('top', 'bottom');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    skill_level INTEGER DEFAULT 3 CHECK (skill_level >= 1 AND skill_level <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    date_time TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    fee INTEGER NOT NULL DEFAULT 0,
    capacity INTEGER,
    event_code TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    invite_link TEXT NOT NULL,
    status event_status DEFAULT 'open',
    timer_position timer_position DEFAULT 'bottom',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event participants table
CREATE TABLE event_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_status attendance_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'unpaid',
    payment_reported_at TIMESTAMPTZ,
    payment_confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members table
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, participant_id)
);

-- Tournaments table
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE UNIQUE,
    format tournament_format NOT NULL,
    concurrent_matches INTEGER DEFAULT 1,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    court INTEGER,
    team1_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    team2_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    team1_score INTEGER,
    team2_score INTEGER,
    winner_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    status match_status DEFAULT 'scheduled',
    scheduled_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group standings table (for round robin / league)
CREATE TABLE group_standings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    group_name TEXT,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    played INTEGER DEFAULT 0,
    won INTEGER DEFAULT 0,
    drawn INTEGER DEFAULT 0,
    lost INTEGER DEFAULT 0,
    goals_for INTEGER DEFAULT 0,
    goals_against INTEGER DEFAULT 0,
    goal_difference INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    rank INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tournament_id, team_id)
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timer states table
CREATE TABLE timer_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE UNIQUE,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    remaining_seconds INTEGER NOT NULL DEFAULT 0,
    is_running BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_code ON events(event_code);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_participants_event ON event_participants(event_id);
CREATE INDEX idx_participants_user ON event_participants(user_id);
CREATE INDEX idx_teams_event ON teams(event_id);
CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_participants_updated_at BEFORE UPDATE ON event_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_standings_updated_at BEFORE UPDATE ON group_standings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timer_states_updated_at BEFORE UPDATE ON timer_states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE timer_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: can read all users, but only update own profile
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Events: anyone can view open events, organizer can manage
CREATE POLICY "Anyone can view events" ON events
    FOR SELECT USING (true);

CREATE POLICY "Users can create events" ON events
    FOR INSERT WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their events" ON events
    FOR UPDATE USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their events" ON events
    FOR DELETE USING (auth.uid() = organizer_id);

-- Event participants: event members can view, users can manage own participation
CREATE POLICY "Participants can view event members" ON event_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_participants ep
            WHERE ep.event_id = event_participants.event_id
            AND ep.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_participants.event_id
            AND e.organizer_id = auth.uid()
        )
    );

CREATE POLICY "Users can join events" ON event_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation" ON event_participants
    FOR UPDATE USING (
        auth.uid() = user_id
        OR
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_participants.event_id
            AND e.organizer_id = auth.uid()
        )
    );

CREATE POLICY "Users can leave events" ON event_participants
    FOR DELETE USING (auth.uid() = user_id);

-- Teams: event participants can view, organizer can manage
CREATE POLICY "Event members can view teams" ON teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_participants ep
            WHERE ep.event_id = teams.event_id
            AND ep.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = teams.event_id
            AND e.organizer_id = auth.uid()
        )
    );

CREATE POLICY "Organizers can manage teams" ON teams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = teams.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- Team members: similar to teams
CREATE POLICY "Event members can view team members" ON team_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM teams t
            JOIN event_participants ep ON ep.event_id = t.event_id
            WHERE t.id = team_members.team_id
            AND ep.user_id = auth.uid()
        )
    );

CREATE POLICY "Organizers can manage team members" ON team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM teams t
            JOIN events e ON e.id = t.event_id
            WHERE t.id = team_members.team_id
            AND e.organizer_id = auth.uid()
        )
    );

-- Tournaments: event members can view, organizer can manage
CREATE POLICY "Event members can view tournaments" ON tournaments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_participants ep
            WHERE ep.event_id = tournaments.event_id
            AND ep.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = tournaments.event_id
            AND e.organizer_id = auth.uid()
        )
    );

CREATE POLICY "Organizers can manage tournaments" ON tournaments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = tournaments.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- Matches: similar to tournaments
CREATE POLICY "Event members can view matches" ON matches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tournaments t
            JOIN event_participants ep ON ep.event_id = t.event_id
            WHERE t.id = matches.tournament_id
            AND ep.user_id = auth.uid()
        )
    );

CREATE POLICY "Organizers can manage matches" ON matches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tournaments t
            JOIN events e ON e.id = t.event_id
            WHERE t.id = matches.tournament_id
            AND e.organizer_id = auth.uid()
        )
    );

-- Group standings: similar to matches
CREATE POLICY "Event members can view standings" ON group_standings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tournaments t
            JOIN event_participants ep ON ep.event_id = t.event_id
            WHERE t.id = group_standings.tournament_id
            AND ep.user_id = auth.uid()
        )
    );

CREATE POLICY "Organizers can manage standings" ON group_standings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tournaments t
            JOIN events e ON e.id = t.event_id
            WHERE t.id = group_standings.tournament_id
            AND e.organizer_id = auth.uid()
        )
    );

-- Notifications: users can only view/update their own
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Timer states: event members can view, organizer can manage
CREATE POLICY "Event members can view timer" ON timer_states
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_participants ep
            WHERE ep.event_id = timer_states.event_id
            AND ep.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = timer_states.event_id
            AND e.organizer_id = auth.uid()
        )
    );

CREATE POLICY "Organizers can manage timer" ON timer_states
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = timer_states.event_id
            AND e.organizer_id = auth.uid()
        )
    );
