-- Remove full_name column from profiles and whitelist tables
ALTER TABLE profiles DROP COLUMN IF EXISTS full_name;
ALTER TABLE whitelist DROP COLUMN IF EXISTS full_name;
