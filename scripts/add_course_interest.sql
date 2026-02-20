-- Add course_interest and request_processed columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS course_interest TEXT,
ADD COLUMN IF NOT EXISTS request_processed BOOLEAN DEFAULT FALSE;
