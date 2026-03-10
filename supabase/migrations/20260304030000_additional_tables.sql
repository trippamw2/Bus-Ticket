-- ============================================
-- BusLink Additional Tables Migration
-- ============================================

CREATE TABLE public.financial_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  balance_after NUMERIC,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id),
  event_type TEXT,
  event_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.operator_revenue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES public.operators(id),
  report_date DATE,
  gross_amount NUMERIC,
  commission_amount NUMERIC,
  net_amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES public.operators(id),
  report_date DATE,
ERIC,
  commission_amount NUMERIC,
  gross_amount NUM  net_amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.bus_capacity_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID REFERENCES public.buses(id),
  total_seats INT,
  standing_allowed BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_phone TEXT,
  points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT,
  severity TEXT,
  description TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.route_demand_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES public.routes(id),
  travel_date DATE,
  bookings_count INT,
  revenue_generated NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES public.routes(id),
  travel_date DATE,
  bookings_count INT,
  revenue_generated created_at TIMEST NUMERIC,
 AMPTZ DEFAULT now()
);

-- Function: post_ledger_entry
CREATE OR REPLACE FUNCTION public.post_ledger_entry(
  p_account TEXT,
  p_ref_type TEXT,
  p_ref_id UUID,
  p_debit NUMERIC,
  p_credit NUMERIC,
  p_desc TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN

INSERT INTO financial_ledger(
 account_type,
 reference_type,
 reference_id,
 debit,
 credit,
 balance_after,
 description
)
VALUES(
 p_account,
 p_ref_type,
 p_ref_id,
 p_debit,
 p_credit,
 0,
 p_desc
);

END;
$$;

-- Function: generate_sms_ticket
CREATE OR REPLACE FUNCTION public.generate_sms_ticket(
  p_booking_id UUID,
  p_phone TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
 ticket_code TEXT;
BEGIN

ticket_code := 'BUS' || floor(random()*999999)::TEXT;

INSERT INTO sms_tickets(
 booking_id,
 passenger_phone,
 ticket_code,
 expiry_time
)
VALUES(
 p_booking_id,
 p_phone,
 ticket_code,
 NOW() + INTERVAL '1 day'
);

RETURN ticket_code;

END;
$$;

-- Function: auto_settle_operator
CREATE OR REPLACE FUNCTION public.auto_settle_operator(
  p_trip_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN

UPDATE operator_wallets
SET balance = balance + (
 SELECT SUM(amount) FROM bookings
 WHERE trip_id = p_trip_id AND status='paid'
)
WHERE operator_id = (
 SELECT operator_id FROM routes
 JOIN trips ON trips.route_id = routes.id
 WHERE trips.id = p_trip_id
);

END;
$$;

-- DONE
