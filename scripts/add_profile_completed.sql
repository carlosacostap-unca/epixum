-- Add profile_completed column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Update existing profiles to have profile_completed = TRUE (assuming existing users have completed their profile)
-- Or leave them as FALSE if we want to force them to confirm their details on next login.
-- Given the requirement "Solo cuando el usuario se loguea por primera vez", it implies new users.
-- However, for existing users, we might want to set it to TRUE so they are not bothered.
UPDATE public.profiles SET profile_completed = TRUE WHERE profile_completed IS NULL;
