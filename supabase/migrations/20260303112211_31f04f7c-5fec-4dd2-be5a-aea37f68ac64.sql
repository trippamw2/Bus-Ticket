
-- USSD session state table (replaces Redis)
CREATE TABLE public.ussd_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  phone text NOT NULL,
  step text NOT NULL DEFAULT 'main_menu',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

ALTER TABLE public.ussd_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.ussd_sessions
  AS RESTRICTIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- SMS logs table
CREATE TABLE public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  message text NOT NULL,
  sms_type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'queued',
  provider_response jsonb,
  booking_id uuid,
  created_at timestamp without time zone DEFAULT now()
);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.sms_logs
  AS RESTRICTIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Auto-cleanup old USSD sessions (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_ussd_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM ussd_sessions WHERE updated_at < now() - interval '1 hour';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
