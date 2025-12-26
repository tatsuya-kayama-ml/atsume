-- Add skill_level_settings and gender_settings columns to events table
-- Migration for optional participant settings per event

-- Add skill_level_settings column (JSONB for flexible structure)
-- Structure: { enabled: boolean, label: string, options: [{ value: number, label: string, description?: string }] }
ALTER TABLE events
ADD COLUMN IF NOT EXISTS skill_level_settings JSONB DEFAULT NULL;

-- Add gender_settings column (JSONB for flexible structure)
-- Structure: { enabled: boolean, options: [{ value: 'male'|'female'|'other', label: string, fee?: number }] }
ALTER TABLE events
ADD COLUMN IF NOT EXISTS gender_settings JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN events.skill_level_settings IS 'Optional skill level configuration for this event. JSON structure with enabled flag, custom label, and level options.';
COMMENT ON COLUMN events.gender_settings IS 'Optional gender configuration for this event. JSON structure with enabled flag and gender options with optional per-gender fees.';
