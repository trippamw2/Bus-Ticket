-- ============================================
-- BusLink Missing Tables Migration
-- ============================================

CREATE TABLE IF NOT EXISTS public.operator_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  auth_user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','manager','staff','driver')),
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.operator_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.operator_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.operator_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID UNIQUE NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  balance NUMERIC DEFAULT 0,
  held_funds NUMERIC DEFAULT 0,
  cleared_funds NUMERIC DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  total_paid NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'MWK',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.operator_wallets(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL,
  type TEXT CHECK (type IN (
    'booking_credit','booking_hold','booking_release',
    'payout','refund','adjustment','commission','fee'
  )),
  amount NUMERIC DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.operators(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES public.operator_wallets(id),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'MWK',
  payment_method TEXT CHECK (payment_method IN ('airtel_money','bank_transfer','tn_money')),
  provider TEXT CHECK (provider IN ('airtel','bank','tn')),
  phone_number TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_branch TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  processed_at TIMESTAMPTZ,
  failure_reason TEXT,
  provider_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES public.operators(id) ON DELETE CASCADE,
  settlement_period_start DATE NOT NULL,
  settlement_period_end DATE NOT NULL,
  gross_amount NUMERIC DEFAULT 0,
  commission_amount NUMERIC DEFAULT 0,
  airtel_fee NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  net_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','disputed','frozen')),
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES public.operators(id) ON DELETE CASCADE,
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
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','suspended','terminated')),
  hire_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bus_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID REFERENCES public.buses(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL,
  document_type TEXT,
  document_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  issuing_authority TEXT,
  document_url TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID REFERENCES public.buses(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL,
  maintenance_type TEXT,
  description TEXT,
  cost NUMERIC,
  performed_by TEXT,
  performed_date DATE,
  next_due_date DATE,
  odometer_reading INTEGER,
  status TEXT DEFAULT 'completed',
  vendor_name TEXT,
  vendor_contact TEXT,
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trip_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  operator_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by TEXT,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned','confirmed','cancelled','completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seasonal_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL,
  season_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_modifier NUMERIC DEFAULT 0,
  is_percentage BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  apply_to TEXT DEFAULT 'both',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.route_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL,
  old_price NUMERIC,
  new_price NUMERIC,
  price_type TEXT,
  changed_by TEXT,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Function: get_effective_route_price
CREATE OR REPLACE FUNCTION public.get_effective_route_price(
  p_route_id UUID,
  p_ticket_type TEXT DEFAULT 'one_way'
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_price NUMERIC;
  v_modifier NUMERIC;
  v_is_percentage BOOLEAN;
BEGIN

SELECT
CASE
WHEN p_ticket_type='one_way' THEN one_way_price
ELSE return_price
END
INTO v_base_price
FROM routes
WHERE id=p_route_id;

SELECT price_modifier,is_percentage
INTO v_modifier,v_is_percentage
FROM seasonal_pricing
WHERE route_id=p_route_id
AND is_active=true
AND start_date<=CURRENT_DATE
AND end_date>=CURRENT_DATE
LIMIT 1;

IF v_modifier IS NOT NULL THEN
IF v_is_percentage THEN
v_base_price:=v_base_price+(v_base_price*v_modifier/100);
ELSE
v_base_price:=v_base_price+v_modifier;
END IF;
END IF;

RETURN v_base_price;

END;
$$;

-- DONE
