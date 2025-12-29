-- Migration: Update tournament_format enum to support more formats
-- This migration updates the tournament_format type to match the TypeScript definitions

-- Step 1: Create a new enum type with all the formats
CREATE TYPE tournament_format_new AS ENUM (
    'single_elimination',    -- シングルエリミネーション
    'double_elimination',    -- ダブルエリミネーション
    'round_robin',          -- 総当たり戦（リーグ戦）
    'swiss',                -- スイスドロー方式
    'group_stage'           -- グループステージ
);

-- Step 2: Update the tournaments table to use the new type
-- First, add a temporary column
ALTER TABLE tournaments ADD COLUMN format_new tournament_format_new;

-- Step 3: Migrate existing data
-- Map old values to new values
UPDATE tournaments
SET format_new = CASE format::text
    WHEN 'tournament' THEN 'single_elimination'::tournament_format_new
    WHEN 'round_robin' THEN 'round_robin'::tournament_format_new
    WHEN 'league' THEN 'round_robin'::tournament_format_new  -- league is now round_robin
    ELSE 'round_robin'::tournament_format_new  -- default fallback
END;

-- Step 4: Drop the old column and rename the new one
ALTER TABLE tournaments DROP COLUMN format;
ALTER TABLE tournaments RENAME COLUMN format_new TO format;

-- Step 5: Add NOT NULL constraint
ALTER TABLE tournaments ALTER COLUMN format SET NOT NULL;

-- Step 6: Drop the old enum type
DROP TYPE tournament_format;

-- Step 7: Rename the new type to the original name
ALTER TYPE tournament_format_new RENAME TO tournament_format;

-- Add comment for documentation
COMMENT ON COLUMN tournaments.format IS 'Tournament format: single_elimination, double_elimination, round_robin, swiss, or group_stage';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 005_update_tournament_format.sql completed successfully';
END $$;
