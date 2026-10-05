-- Chaitanya Website Database Schema
-- PostgreSQL / Supabase compatible
-- Note: Firebase Firestore does NOT import SQL directly.
-- This schema is intended for PostgreSQL/Supabase.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- 1. USERS
-- =========================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid VARCHAR(128) UNIQUE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    university VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    google_provider BOOLEAN NOT NULL DEFAULT TRUE,
    google_email VARCHAR(255),
    student_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- 2. EVENTS
-- =========================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('workshop', 'competition')),
    description TEXT,
    venue VARCHAR(255),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    registration_deadline TIMESTAMPTZ NOT NULL,
    capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'completed', 'cancelled')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time),
    CHECK (registration_deadline <= start_time)
);

-- =========================
-- 3. TEAMS
-- =========================
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_name VARCHAR(150) NOT NULL,
    team_code VARCHAR(30) NOT NULL UNIQUE,
    leader_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, team_name)
);

-- =========================
-- TEAM MEMBERS
-- =========================
CREATE TABLE IF NOT EXISTS team_members (
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member'
        CHECK (role IN ('leader', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (team_id, user_id)
);

-- =========================
-- 4. REGISTRATIONS
-- =========================
CREATE TABLE IF NOT EXISTS registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participation_type VARCHAR(20) NOT NULL
        CHECK (participation_type IN ('individual', 'team')),
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    registration_status VARCHAR(20) NOT NULL DEFAULT 'registered'
        CHECK (registration_status IN ('registered', 'cancelled', 'attended')),
    registration_qr_id VARCHAR(100) NOT NULL UNIQUE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (
        (participation_type = 'individual' AND team_id IS NULL)
        OR
        (participation_type = 'team' AND team_id IS NOT NULL)
    ),

    UNIQUE (user_id, event_id)
);

-- =========================
-- 5. ANALYTICS
-- =========================
CREATE TABLE IF NOT EXISTS event_analytics (
    event_id UUID PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
    total_registrations INTEGER NOT NULL DEFAULT 0,
    individual_registrations INTEGER NOT NULL DEFAULT 0,
    team_registrations INTEGER NOT NULL DEFAULT 0,
    total_teams INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    registrations INTEGER NOT NULL DEFAULT 0,
    individual_registrations INTEGER NOT NULL DEFAULT 0,
    team_registrations INTEGER NOT NULL DEFAULT 0,
    UNIQUE (event_id, date)
);

-- =========================
-- SUPPORTING CONTENT
-- =========================
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- INDEXES
-- =========================
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

CREATE INDEX IF NOT EXISTS idx_teams_event_id ON teams(event_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_team_id ON registrations(team_id);
CREATE INDEX IF NOT EXISTS idx_registrations_registered_at ON registrations(registered_at);

CREATE INDEX IF NOT EXISTS idx_daily_analytics_event_date
    ON event_daily_analytics(event_id, date);

CREATE INDEX IF NOT EXISTS idx_queries_user_id ON queries(user_id);
CREATE INDEX IF NOT EXISTS idx_queries_status ON queries(status);

-- =========================
-- TRIGGER: updated_at
-- =========================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS events_updated_at ON events;
CREATE TRIGGER events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS faqs_updated_at ON faqs;
CREATE TRIGGER faqs_updated_at
BEFORE UPDATE ON faqs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS queries_updated_at ON queries;
CREATE TRIGGER queries_updated_at
BEFORE UPDATE ON queries
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
