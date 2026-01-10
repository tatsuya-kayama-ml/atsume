-- Remove password-related columns from events table
-- Password authentication is no longer used; event access is controlled via invite links only

-- Drop password_hash column (hashed password for verification)
ALTER TABLE events DROP COLUMN IF EXISTS password_hash;

-- Note: The 'password' column (plain text for display) was added in a later migration (002_add_event_options.sql)
-- We need to check if it exists before dropping
ALTER TABLE events DROP COLUMN IF EXISTS password;
