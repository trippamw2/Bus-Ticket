
-- 1. users
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  created_at timestamp DEFAULT now()
);

-- 2. operators
CREATE TABLE public.operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  commission_percent numeric DEFAULT 10,
  status text CHECK (status IN ('pending','approved','suspended')) DEFAULT 'pending',
  created_at timestamp DEFAULT now()
);

-- 3. buses
CREATE TABLE public.buses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid REFERENCES public.operators(id) ON DELETE CASCADE,
  plate_number text NOT NULL,
  capacity integer NOT NULL,
  status text CHECK (status IN ('active','inactive')) DEFAULT 'active',
  created_at timestamp DEFAULT now()
);

-- 4. routes
CREATE TABLE public.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid REFERENCES public.operators(id) ON DELETE CASCADE,
  origin text NOT NULL,
  destination text NOT NULL,
  one_way_price numeric NOT NULL,
  return_price numeric NOT NULL,
  status text CHECK (status IN ('active','inactive')) DEFAULT 'active',
  created_at timestamp DEFAULT now()
);

-- 5. trips
CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES public.routes(id) ON DELETE CASCADE,
  bus_id uuid REFERENCES public.buses(id) ON DELETE CASCADE,
  travel_date date NOT NULL,
  total_seats integer NOT NULL,
  available_seats integer NOT NULL,
  status text CHECK (status IN ('active','full','cancelled')) DEFAULT 'active',
  created_at timestamp DEFAULT now()
);

-- 6. bookings
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code text UNIQUE,
  phone text NOT NULL,
  trip_id uuid REFERENCES public.trips(id),
  ticket_type text CHECK (ticket_type IN ('one_way','return')) NOT NULL,
  amount numeric NOT NULL,
  seat_number integer,
  status text CHECK (status IN ('pending','paid','cancelled','changed')) DEFAULT 'pending',
  created_at timestamp DEFAULT now()
);

-- 7. payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id),
  transaction_reference text UNIQUE,
  amount numeric,
  status text CHECK (status IN ('pending','success','failed')) DEFAULT 'pending',
  created_at timestamp DEFAULT now()
);

-- 8. platform_settings
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_fee numeric DEFAULT 1000,
  cancellation_fee numeric DEFAULT 2000,
  default_commission numeric DEFAULT 10,
  created_at timestamp DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow service role full access to all tables
CREATE POLICY "Service role full access" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.operators FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.buses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.routes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.platform_settings FOR ALL USING (true) WITH CHECK (true);
