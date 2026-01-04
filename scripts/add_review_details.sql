-- Add comments and result columns to sprint_reviews table
ALTER TABLE sprint_reviews ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE sprint_reviews ADD COLUMN IF NOT EXISTS result TEXT; -- Values: 'aprobado', 'reprobado', or null
