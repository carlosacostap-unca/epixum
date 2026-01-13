-- Reset avatar_url for all profiles to force a refresh from Google on next login
UPDATE public.profiles SET avatar_url = NULL;
