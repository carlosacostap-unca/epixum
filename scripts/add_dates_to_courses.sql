-- Add start_date and end_date to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;
