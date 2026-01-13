-- Add sprint_id to assignments table
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL;
