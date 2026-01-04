-- Add sprint_id to classes table
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL;
