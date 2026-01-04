-- Add configuration flags to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS has_sprints BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_classes BOOLEAN DEFAULT TRUE;

-- Update existing courses to have defaults
UPDATE courses SET has_sprints = FALSE WHERE has_sprints IS NULL;
UPDATE courses SET has_classes = TRUE WHERE has_classes IS NULL;
