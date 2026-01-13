-- Add avatar_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Verify policies (no change needed if "Users can update own profile" is already set for all columns, 
-- but good to keep in mind)
