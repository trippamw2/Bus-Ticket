
-- Add 'failed' and 'expired' to bookings status check
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('pending','paid','cancelled','changed','failed','expired'));

-- Create a table for seat locks (replaces Redis)
CREATE TABLE public.seat_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  phone text NOT NULL,
  locked_at timestamp NOT NULL DEFAULT now(),
  expires_at timestamp NOT NULL DEFAULT (now() + interval '3 minutes'),
  released boolean DEFAULT false
);

ALTER TABLE public.seat_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.seat_locks FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_seat_locks_trip ON public.seat_locks(trip_id, released, expires_at);

-- Function: confirm booking with atomic seat assignment
CREATE OR REPLACE FUNCTION public.confirm_booking(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_trip record;
  v_next_seat integer;
  v_result jsonb;
BEGIN
  -- Lock the booking row
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;
  
  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;
  
  IF v_booking.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking is not pending, status: ' || v_booking.status);
  END IF;

  -- Lock the trip row to prevent race conditions
  SELECT * INTO v_trip FROM trips WHERE id = v_booking.trip_id FOR UPDATE;
  
  IF v_trip IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trip not found');
  END IF;
  
  IF v_trip.available_seats <= 0 THEN
    -- No seats left, fail the booking
    UPDATE bookings SET status = 'failed' WHERE id = p_booking_id;
    RETURN jsonb_build_object('success', false, 'error', 'No seats available');
  END IF;

  -- Assign next seat number atomically
  SELECT COALESCE(MAX(seat_number), 0) + 1 INTO v_next_seat
  FROM bookings
  WHERE trip_id = v_booking.trip_id
    AND status = 'paid'
    AND seat_number IS NOT NULL;

  -- Update booking: assign seat, mark paid
  UPDATE bookings 
  SET status = 'paid', seat_number = v_next_seat
  WHERE id = p_booking_id;

  -- Decrement available seats, mark full if needed
  UPDATE trips 
  SET available_seats = available_seats - 1,
      status = CASE WHEN available_seats - 1 <= 0 THEN 'full' ELSE status END
  WHERE id = v_booking.trip_id;

  -- Release the seat lock
  UPDATE seat_locks SET released = true WHERE booking_id = p_booking_id;

  v_result := jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'seat_number', v_next_seat,
    'trip_id', v_booking.trip_id
  );
  
  RETURN v_result;
END;
$$;

-- Function: fail/expire a booking and release lock
CREATE OR REPLACE FUNCTION public.fail_booking(p_booking_id uuid, p_reason text DEFAULT 'failed')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;
  
  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;
  
  IF v_booking.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking is not pending');
  END IF;

  UPDATE bookings SET status = p_reason WHERE id = p_booking_id;
  UPDATE seat_locks SET released = true WHERE booking_id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id, 'status', p_reason);
END;
$$;

-- Function: expire stale locks (run periodically or on each booking check)
CREATE OR REPLACE FUNCTION public.expire_stale_locks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Mark expired locks
  UPDATE seat_locks SET released = true 
  WHERE released = false AND expires_at < now();
  
  -- Expire corresponding pending bookings
  WITH expired AS (
    UPDATE bookings b SET status = 'expired'
    WHERE b.status = 'pending'
      AND EXISTS (
        SELECT 1 FROM seat_locks sl 
        WHERE sl.booking_id = b.id 
          AND sl.released = true 
          AND sl.expires_at < now()
      )
    RETURNING b.id
  )
  SELECT count(*) INTO v_count FROM expired;
  
  RETURN v_count;
END;
$$;
