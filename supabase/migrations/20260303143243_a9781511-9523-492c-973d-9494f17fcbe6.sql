
-- ============================================
-- BusLink Full Database Schema
-- ============================================

-- 1. Operators table
CREATE TABLE public.operators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  company_name TEXT DEFAULT '',
  company_address TEXT DEFAULT '',
  company_reg_number TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  contact_person TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  commission_percent NUMERIC DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can view own record" ON public.operators FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Operators can update own record" ON public.operators FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Anyone can insert operator (registration)" ON public.operators FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role full access operators" ON public.operators FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 2. Buses table
CREATE TABLE public.buses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can view own buses" ON public.buses FOR SELECT USING (auth.uid() = operator_id);
CREATE POLICY "Operators can insert own buses" ON public.buses FOR INSERT WITH CHECK (auth.uid() = operator_id);
CREATE POLICY "Operators can update own buses" ON public.buses FOR UPDATE USING (auth.uid() = operator_id);
CREATE POLICY "Operators can delete own buses" ON public.buses FOR DELETE USING (auth.uid() = operator_id);
CREATE POLICY "Service role full access buses" ON public.buses FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 3. Routes table
CREATE TABLE public.routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  one_way_price NUMERIC NOT NULL DEFAULT 0,
  return_price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can view own routes" ON public.routes FOR SELECT USING (auth.uid() = operator_id);
CREATE POLICY "Anyone can view active routes" ON public.routes FOR SELECT USING (status = 'active');
CREATE POLICY "Operators can insert own routes" ON public.routes FOR INSERT WITH CHECK (auth.uid() = operator_id);
CREATE POLICY "Operators can update own routes" ON public.routes FOR UPDATE USING (auth.uid() = operator_id);
CREATE POLICY "Service role full access routes" ON public.routes FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 4. Trips table
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES public.operators(id) ON DELETE SET NULL,
  travel_date DATE NOT NULL,
  departure_time TEXT DEFAULT '',
  total_seats INTEGER NOT NULL,
  available_seats INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'full', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can view own trips" ON public.trips FOR SELECT USING (auth.uid() = operator_id);
CREATE POLICY "Anyone can view active trips" ON public.trips FOR SELECT USING (status = 'active');
CREATE POLICY "Operators can insert own trips" ON public.trips FOR INSERT WITH CHECK (auth.uid() = operator_id);
CREATE POLICY "Operators can update own trips" ON public.trips FOR UPDATE USING (auth.uid() = operator_id);
CREATE POLICY "Service role full access trips" ON public.trips FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 5. Bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  operator_phone TEXT,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  ticket_type TEXT NOT NULL DEFAULT 'one_way' CHECK (ticket_type IN ('one_way', 'return')),
  amount NUMERIC NOT NULL DEFAULT 0,
  ticket_code TEXT NOT NULL UNIQUE,
  seat_number INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'failed', 'changed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access bookings" ON public.bookings FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Public can view own bookings by phone" ON public.bookings FOR SELECT USING (true);

-- 6. Seat locks table
CREATE TABLE public.seat_locks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  released BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '3 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seat_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access seat_locks" ON public.seat_locks FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 7. Payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  transaction_reference TEXT NOT NULL UNIQUE,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded', 'refund_failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access payments" ON public.payments FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 8. SMS logs table
CREATE TABLE public.sms_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  sms_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  provider_response JSONB,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access sms_logs" ON public.sms_logs FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 9. USSD sessions table
CREATE TABLE public.ussd_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  step TEXT NOT NULL DEFAULT 'main_menu',
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ussd_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access ussd_sessions" ON public.ussd_sessions FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 10. Platform settings table
CREATE TABLE public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  default_commission NUMERIC NOT NULL DEFAULT 10,
  cancellation_fee NUMERIC NOT NULL DEFAULT 2000,
  change_fee NUMERIC NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view settings" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Service role full access settings" ON public.platform_settings FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Insert default platform settings
INSERT INTO public.platform_settings (default_commission, cancellation_fee, change_fee) VALUES (10, 2000, 1000);

-- 11. Admin users table
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  role_id TEXT NOT NULL DEFAULT 'admin',
  permissions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view own record" ON public.admin_users FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Service role full access admin_users" ON public.admin_users FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 12. Audit logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Service role full access audit_logs" ON public.audit_logs FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- Database Functions
-- ============================================

-- Expire stale seat locks
CREATE OR REPLACE FUNCTION public.expire_stale_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE seat_locks SET released = true WHERE released = false AND expires_at < now();
END;
$$;

-- Confirm booking (atomic seat assignment)
CREATE OR REPLACE FUNCTION public.confirm_booking(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_trip RECORD;
  v_seat INTEGER;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Booking not found'); END IF;
  IF v_booking.status != 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'Booking not pending'); END IF;

  SELECT * INTO v_trip FROM trips WHERE id = v_booking.trip_id FOR UPDATE;
  IF v_trip.available_seats <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'No seats'); END IF;

  -- Assign next seat number
  SELECT COALESCE(MAX(seat_number), 0) + 1 INTO v_seat FROM bookings WHERE trip_id = v_booking.trip_id AND status = 'paid';

  UPDATE bookings SET status = 'paid', seat_number = v_seat WHERE id = p_booking_id;
  UPDATE trips SET available_seats = available_seats - 1, status = CASE WHEN available_seats - 1 <= 0 THEN 'full' ELSE status END WHERE id = v_booking.trip_id;
  UPDATE seat_locks SET released = true WHERE booking_id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'seat_number', v_seat, 'phone', v_booking.phone, 'operator_phone', v_booking.operator_phone);
END;
$$;

-- Fail booking
CREATE OR REPLACE FUNCTION public.fail_booking(p_booking_id UUID, p_reason TEXT DEFAULT 'failed')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_booking RECORD;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Not found'); END IF;

  UPDATE bookings SET status = 'failed' WHERE id = p_booking_id;
  UPDATE seat_locks SET released = true WHERE booking_id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'reason', p_reason);
END;
$$;

-- Cleanup USSD sessions older than 30 minutes
CREATE OR REPLACE FUNCTION public.cleanup_ussd_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM ussd_sessions WHERE updated_at < now() - interval '30 minutes';
END;
$$;

-- Updated_at trigger function
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

-- ============================================
-- Triggers
-- ============================================

CREATE TRIGGER update_operators_updated_at BEFORE UPDATE ON public.operators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ussd_sessions_updated_at BEFORE UPDATE ON public.ussd_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
