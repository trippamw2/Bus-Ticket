
ALTER TABLE public.operators ADD COLUMN IF NOT EXISTS email text UNIQUE;
ALTER TABLE public.operators ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS departure_time time WITHOUT TIME ZONE;
