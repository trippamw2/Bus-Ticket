-- ============================================
-- BusLink Missing Tables Migration
-- Run this to add all missing tables and functions
-- Uses IF NOT EXISTS / OR REPLACE for safe re-runs
-- ============================================

-- ============================================
-- 1. OPERATOR USERS & AUDIT LOGS
-- ============================================

-- Operator Users (staff accounts)
CREATE TABLE IF NOT EXISTS public.operator_users (
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
DO $$ BEGIN
  CREATE POLICY "Operators can view own users" ON public.operator_users FOR SELECT USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Operators can insert own users" ON public.operator_users FOR INSERT WITH CHECK (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Operators can update own users" ON public.operator_users FOR UPDATE USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Operators can delete own users" ON public.operator_users FOR DELETE USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access operator_users" ON public.operator_users FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Operator Audit Logs
CREATE TABLE IF NOT EXISTS public.operator_audit_logs (
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

DO $$ BEGIN
  CREATE POLICY "Operators can view own audit logs" ON public.operator_audit_logs FOR SELECT USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Operators can insert own audit logs" ON public.operator_audit_logs FOR INSERT WITH CHECK (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access operator_audit_logs" ON public.operator_audit_logs FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_operator_audit_logs_operator_id ON public.operator_audit_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_audit_logs_created_at ON public.operator_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operator_audit_logs_action ON public.operator_audit_logs(action);

-- ============================================
-- 2. WALLET OPERATIONS
-- ============================================

-- Operator Wallets
CREATE TABLE IF NOT EXISTS public.operator_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0,
  held_funds NUMERIC NOT NULL DEFAULT 0,
  cleared_funds NUMERIC NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MWK',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operator_wallets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Operators can view own wallet" ON public.operator_wallets FOR SELECT USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access operator_wallets" ON public.operator_wallets FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Wallet Transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.operator_wallets(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL,  -- Added for RLS
  type TEXT NOT NULL CHECK (type IN ('booking_credit', 'booking_hold', 'booking_release', 'payout', 'refund', 'adjustment', 'commission', 'fee')),
  amount NUMERIC NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.operator_wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('booking_credit', 'booking_hold', 'booking_release', 'payout', 'refund', 'adjustment', 'commission', 'fee')),
  amount NUMERIC NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Operators can view own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access wallet_transactions" ON public.wallet_transactions FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);

-- Wallet Withdrawal Requests
CREATE TABLE IF NOT EXISTS public.wallet_withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES public.operator_wallets(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MWK',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('airtel_money', 'bank_transfer', 'tn_money')),
  provider TEXT NOT NULL CHECK (provider IN ('airtel', 'bank', 'tn')),
  phone_number TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_branch TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  processed_at TIMESTAMPTZ,
  failure_reason TEXT,
  provider_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_withdrawal_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Operators can view own withdrawal requests" ON public.wallet_withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Operators can insert withdrawal requests" ON public.wallet_withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access wallet_withdrawal_requests" ON public.wallet_withdrawal_requests FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_wallet_withdrawal_requests_user_id ON public.wallet_withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawal_requests_status ON public.wallet_withdrawal_requests(status);

-- ============================================
-- 3. SETTLEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  settlement_period_start DATE NOT NULL,
  settlement_period_end DATE NOT NULL,
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  airtel_fee NUMERIC NOT NULL DEFAULT 0,
  vat_amount NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'disputed', 'frozen')),
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Operators can view own settlements" ON public.settlements FOR SELECT USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access settlements" ON public.settlements FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_settlements_operator_id ON public.settlements(operator_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON public.settlements(status);
CREATE INDEX IF NOT EXISTS idx_settlements_period ON public.settlements(settlement_period_start, settlement_period_end);

-- ============================================
-- 4. FLEET OPERATIONS
-- ============================================

-- Drivers
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  license_number TEXT,
  license_expiry DATE,
  license_class TEXT DEFAULT 'C',
  national_id TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'terminated')),
  hire_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Operators can view own drivers" ON public.drivers FOR SELECT USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Operators can insert own drivers" ON public.drivers FOR INSERT WITH CHECK (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Operators can update own drivers" ON public.drivers FOR UPDATE USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Operators can delete own drivers" ON public.drivers FOR DELETE USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access drivers" ON public.drivers FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_drivers_operator_id ON public.drivers(operator_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(status);

-- Bus Documents
CREATE TABLE IF NOT EXISTS public.bus_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL,  -- Added for RLS
  document_type TEXT NOT NULL CHECK (document_type IN ('insurance', 'road_permit', 'fitness_certificate', 'registration', 'permit', 'tax_clearance', 'other')),
  document_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  issuing_authority TEXT,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'expiring', 'pending', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.bus_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('insurance', 'road_permit', 'fitness_certificate', 'registration', 'permit', 'tax_clearance', 'other')),
  document_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  issuing_authority TEXT,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'expiring', 'pending', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bus_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Operators can view own bus documents" ON public.bus_documents FOR SELECT USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Operators can insert own bus documents" ON public.bus_documents FOR INSERT WITH CHECK (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Operators can update own bus documents" ON public.bus_documents FOR UPDATE USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Operators can delete own bus documents" ON public.bus_documents FOR DELETE USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access bus_documents" ON public.bus_documents FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_bus_documents_bus_id ON public.bus_documents(bus_id);
CREATE INDEX IF NOT EXISTS idx_bus_documents_expiry ON public.bus_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_bus_documents_status ON public.bus_documents(status);

-- Maintenance Logs
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL,  -- Added for RLS
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('routine', 'repair', 'inspection', 'tire_replacement', 'engine_service', 'brake_service', 'transmission', 'electrical', 'body_work', 'other')),
  description TEXT,
  cost NUMERIC,
  performed_by TEXT,
  performed_date DATE NOT NULL,
  next_due_date DATE,
  next_due_km INTEGER,
  odometer_reading INTEGER,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('routine', 'repair', 'inspection', 'tire_replacement', 'engine_service', 'brake_service', 'transmission', 'electrical', 'body_work', 'other')),
  description TEXT,
  cost NUMERIC,
  performed_by TEXT,
  performed_date DATE NOT NULL,
  next_due_date DATE,
  next_due_km INTEGER,
  odometer_reading INTEGER,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  vendor_name TEXT,
  vendor_contact TEXT,
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Operators can view own maintenance logs" ON public.maintenance_logs FOR SELECT USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Operators can insert own maintenance logs" ON public.maintenance_logs FOR INSERT WITH CHECK (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Operators can update own maintenance logs" ON public.maintenance_logs FOR UPDATE USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Operators can delete own maintenance logs" ON public.maintenance_logs FOR DELETE USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access maintenance_logs" ON public.maintenance_logs FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_bus_id ON public.maintenance_logs(bus_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_performed_date ON public.maintenance_logs(performed_date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_next_due ON public.maintenance_logs(next_due_date);

-- Trip Assignments
CREATE TABLE IF NOT EXISTS public.trip_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  operator_id UUID NOT NULL,  -- Added for RLS
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by TEXT,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.trip_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by TEXT,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Operators can view own trip assignments" ON public.trip_assignments FOR SELECT USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Operators can manage own trip assignments" ON public.trip_assignments FOR ALL USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access trip_assignments" ON public.trip_assignments FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_trip_assignments_trip_id ON public.trip_assignments(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_assignments_driver_id ON public.trip_assignments(driver_id);

-- ============================================
-- 5. SEASONAL PRICING
-- ============================================

CREATE TABLE IF NOT EXISTS public.seasonal_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL,  -- Added for RLS
  season_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_modifier NUMERIC NOT NULL DEFAULT 0,
  is_percentage BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  apply_to TEXT NOT NULL DEFAULT 'both' CHECK (apply_to IN ('one_way', 'return', 'both')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  season_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_modifier NUMERIC NOT NULL DEFAULT 0,
  is_percentage BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  apply_to TEXT NOT NULL DEFAULT 'both' CHECK (apply_to IN ('one_way', 'return', 'both')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seasonal_pricing ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can view active seasonal pricing" ON public.seasonal_pricing FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Operators can manage own seasonal pricing" ON public.seasonal_pricing FOR ALL USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access seasonal_pricing" ON public.seasonal_pricing FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_seasonal_pricing_route_id ON public.seasonal_pricing(route_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_pricing_dates ON public.seasonal_pricing(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_seasonal_pricing_active ON public.seasonal_pricing(is_active);

-- Route Price History
CREATE TABLE IF NOT EXISTS public.route_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL,  -- Added for RLS
  old_price NUMERIC,
  new_price NUMERIC NOT NULL,
  price_type TEXT NOT NULL CHECK (price_type IN ('one_way', 'return', 'seasonal')),
  changed_by TEXT,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.route_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  old_price NUMERIC,
  new_price NUMERIC NOT NULL,
  price_type TEXT NOT NULL CHECK (price_type IN ('one_way', 'return', 'seasonal')),
  changed_by TEXT,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.route_price_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can view route price history" ON public.route_price_history FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Operators can manage own price history" ON public.route_price_history FOR ALL USING (auth.uid() = operator_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access route_price_history" ON public.route_price_history FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_route_price_history_route_id ON public.route_price_history(route_id);
CREATE INDEX IF NOT EXISTS idx_route_price_history_created_at ON public.route_price_history(created_at DESC);

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for tables with updated_at
DROP TRIGGER IF EXISTS update_operator_wallets_updated_at ON public.operator_wallets;
CREATE TRIGGER update_operator_wallets_updated_at BEFORE UPDATE ON public.operator_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_wallet_withdrawal_requests_updated_at ON public.wallet_withdrawal_requests;
CREATE TRIGGER update_wallet_withdrawal_requests_updated_at BEFORE UPDATE ON public.wallet_withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_settlements_updated_at ON public.settlements;
CREATE TRIGGER update_settlements_updated_at BEFORE UPDATE ON public.settlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON public.drivers;
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bus_documents_updated_at ON public.bus_documents;
CREATE TRIGGER update_bus_documents_updated_at BEFORE UPDATE ON public.bus_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_logs_updated_at ON public.maintenance_logs;
CREATE TRIGGER update_maintenance_logs_updated_at BEFORE UPDATE ON public.maintenance_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_seasonal_pricing_updated_at ON public.seasonal_pricing;
CREATE TRIGGER update_seasonal_pricing_updated_at BEFORE UPDATE ON public.seasonal_pricing FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_trip_assignments_updated_at ON public.trip_assignments;
CREATE TRIGGER update_trip_assignments_updated_at BEFORE UPDATE ON public.trip_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Get effective route price with seasonal modifiers
CREATE OR REPLACE FUNCTION public.get_effective_route_price(
  p_route_id UUID,
  p_ticket_type TEXT DEFAULT 'one_way'
)
RETURNS NUMERIC
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_base_price NUMERIC;
  v_modifier NUMERIC;
  v_is_percentage BOOLEAN;
BEGIN
  SELECT 
    CASE 
      WHEN p_ticket_type = 'one_way' THEN routes.one_way_price
      ELSE routes.return_price
    END INTO v_base_price
  FROM routes
  WHERE id = p_route_id;

  IF v_base_price IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT sp.price_modifier, sp.is_percentage INTO v_modifier, v_is_percentage
  FROM seasonal_pricing sp
  WHERE sp.route_id = p_route_id
    AND sp.is_active = true
    AND sp.start_date <= CURRENT_DATE
    AND sp.end_date >= CURRENT_DATE
    AND (sp.apply_to = 'both' OR sp.apply_to = p_ticket_type)
  ORDER BY sp.price_modifier DESC
  LIMIT 1;

  IF v_modifier IS NOT NULL AND v_modifier != 0 THEN
    IF v_is_percentage THEN
      v_base_price := v_base_price + (v_base_price * v_modifier / 100);
    ELSE
      v_base_price := v_base_price + v_modifier;
    END IF;
  END IF;

  RETURN v_base_price;
END;
$$;

-- Process trip settlement
CREATE OR REPLACE FUNCTION public.process_trip_settlement(
  p_trip_id UUID,
  p_commission_percent NUMERIC DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_trip RECORD;
  v_route RECORD;
  v_booking_total NUMERIC := 0;
  v_commission NUMERIC := 0;
  v_net_amount NUMERIC := 0;
  v_wallet_id UUID;
  v_operator_id UUID;
BEGIN
  SELECT t.*, r.one_way_price, r.return_price, r.operator_id
  INTO v_trip, v_route
  FROM trips t
  JOIN routes r ON t.route_id = r.id
  WHERE t.id = p_trip_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trip not found');
  END IF;

  v_operator_id := v_route.operator_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_booking_total
  FROM bookings
  WHERE trip_id = p_trip_id AND status = 'paid';

  IF v_booking_total = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No paid bookings for this trip');
  END IF;

  v_commission := v_booking_total * p_commission_percent / 100;
  v_net_amount := v_booking_total - v_commission;

  SELECT id INTO v_wallet_id
  FROM operator_wallets
  WHERE operator_id = v_operator_id;

  IF v_wallet_id IS NULL THEN
    INSERT INTO operator_wallets (operator_id, balance, held_funds, cleared_funds, total_earned)
    VALUES (v_operator_id, 0, 0, 0, 0)
    RETURNING id INTO v_wallet_id;
  END IF;

  UPDATE operator_wallets
  SET 
    balance = balance + v_net_amount,
    held_funds = held_funds + v_net_amount,
    total_earned = total_earned + v_net_amount,
    updated_at = now()
  WHERE id = v_wallet_id;

  INSERT INTO wallet_transactions (wallet_id, type, amount, reference_type, reference_id, description)
  VALUES (v_wallet_id, 'booking_hold', v_net_amount, 'trip', p_trip_id, 
    jsonb_build_object('trip_date', v_trip.travel_date, 'gross', v_booking_total, 'commission', v_commission)::text);

  RETURN jsonb_build_object(
    'success', true,
    'gross_amount', v_booking_total,
    'commission', v_commission,
    'net_amount', v_net_amount,
    'wallet_id', v_wallet_id
  );
END;
$$;

-- Check expiring documents
CREATE OR REPLACE FUNCTION public.check_expiring_documents()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE bus_documents
  SET status = 'expiring'
  WHERE expiry_date IS NOT NULL
    AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
    AND expiry_date >= CURRENT_DATE
    AND status = 'active';

  UPDATE bus_documents
  SET status = 'expired'
  WHERE expiry_date IS NOT NULL
    AND expiry_date < CURRENT_DATE
    AND status IN ('active', 'expiring');
END;
$$;

-- ============================================
-- DONE
-- ============================================
