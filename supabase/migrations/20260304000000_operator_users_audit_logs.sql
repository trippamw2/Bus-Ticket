-- ============================================
-- Operator Users and Audit Logs
-- ============================================

-- 1. Operator Users table (staff accounts for operators)
-- Drop if exists to handle re-runs
DROP TABLE IF EXISTS public.operator_users CASCADE;
DROP TABLE IF EXISTS public.operator_audit_logs CASCADE;

CREATE TABLE public.operator_users (
CREATE TABLE public.operator_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  auth_user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff', 'driver')),
  permissions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operator_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for operator_users
CREATE POLICY "Operators can view own users" ON public.operator_users FOR SELECT USING (auth.uid() = operator_id);
CREATE POLICY "Operators can insert own users" ON public.operator_users FOR INSERT WITH CHECK (auth.uid() = operator_id);
CREATE POLICY "Operators can update own users" ON public.operator_users FOR UPDATE USING (auth.uid() = operator_id);
CREATE POLICY "Operators can delete own users" ON public.operator_users FOR DELETE USING (auth.uid() = operator_id);
CREATE POLICY "Service role full access operator_users" ON public.operator_users FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 2. Operator Audit Logs table (activity tracking for operators)
CREATE TABLE public.operator_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.operator_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operator_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for operator_audit_logs
CREATE POLICY "Operators can view own audit logs" ON public.operator_audit_logs FOR SELECT USING (auth.uid() = operator_id);
CREATE POLICY "Operators can insert own audit logs" ON public.operator_audit_logs FOR INSERT WITH CHECK (auth.uid() = operator_id);
CREATE POLICY "Service role full access operator_audit_logs" ON public.operator_audit_logs FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Index for faster queries
CREATE INDEX idx_operator_audit_logs_operator_id ON public.operator_audit_logs(operator_id);
CREATE INDEX idx_operator_audit_logs_created_at ON public.operator_audit_logs(created_at DESC);
CREATE INDEX idx_operator_audit_logs_action ON public.operator_audit_logs(action);

-- Trigger to update updated_at
CREATE TRIGGER update_operator_users_updated_at BEFORE UPDATE ON public.operator_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
