-- ============================================
-- BusLink Triggers and Functions Migration
-- ============================================

-- Function: confirm_booking_from_payment
CREATE OR REPLACE FUNCTION public.confirm_booking_from_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

IF NEW.status = 'completed' THEN

UPDATE bookings
SET status = 'paid',
updated_at = NOW()
WHERE id = NEW.booking_id;

END IF;

RETURN NEW;

END;
$$;

-- Trigger: on_payment_received
DROP TRIGGER IF EXISTS on_payment_received ON payments;
CREATE TRIGGER on_payment_received
AFTER UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION confirm_booking_from_payment();

-- Function: auto_settle_operator
CREATE OR REPLACE FUNCTION public.auto_settle_operator()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
 trip_total NUMERIC;
 operator_id UUID;
BEGIN

IF NEW.status = 'completed' THEN

SELECT r.operator_id
INTO operator_id
FROM trips t
JOIN routes r ON t.route_id = r.id
WHERE t.id = NEW.id;

SELECT COALESCE(SUM(amount),0)
INTO trip_total
FROM bookings
WHERE trip_id = NEW.id
AND status = 'paid';

UPDATE operator_wallets
SET balance = balance + trip_total,
held_funds = held_funds - trip_total,
updated_at = NOW()
WHERE operator_id = operator_id;

END IF;

RETURN NEW;

END;
$$;

-- Trigger: on_trip_completed
DROP TRIGGER IF EXISTS on_trip_completed ON trips;
CREATE TRIGGER on_trip_completed
AFTER UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION auto_settle_operator();

-- Function: validate_payment_security
CREATE OR REPLACE FUNCTION public.validate_payment_security()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN

IF NEW.amount <= 0 THEN
RAISE EXCEPTION 'Invalid payment amount';
END IF;

END IF;

RETURN NEW;

END;
$$;

-- Trigger: payment_security_check
DROP TRIGGER IF EXISTS payment_security_check ON payments;
CREATE TRIGGER payment_security_check
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION validate_payment_security();

-- Function: send_sms_ticket_after_payment
CREATE OR REPLACE FUNCTION public.send_sms_ticket_after_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
 ticket_code TEXT;
 passenger_phone TEXT;
BEGIN

IF NEW.status = 'completed' THEN

SELECT phone INTO passenger_phone
FROM bookings
WHERE id = NEW.booking_id;

ticket_code := 'BUS' || floor(random()*999999);

INSERT INTO sms_tickets(
 booking_id,
 passenger_phone,
 ticket_code,
 expiry_time
)
VALUES(
 NEW.booking_id,
 passenger_phone,
 ticket_code,
 NOW() + INTERVAL '1 day'
);

END IF;

RETURN NEW;

END;
$$;

-- Trigger: sms_ticket_delivery
DROP TRIGGER IF EXISTS sms_ticket_delivery ON payments;
CREATE TRIGGER sms_ticket_delivery
AFTER UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION send_sms_ticket_after_payment();

-- Function: protect_seat_booking
CREATE OR REPLACE FUNCTION public.protect_seat_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

IF EXISTS (
 SELECT 1 FROM seat_inventory
 WHERE trip_id = NEW.trip_id
 AND seat_number = NEW.seat_number
 AND status <> 'available'
) THEN

RAISE EXCEPTION 'Seat already booked';

END IF;

RETURN NEW;

END;
$$;

-- Trigger: seat_protection
DROP TRIGGER IF EXISTS seat_protection ON bookings;
CREATE TRIGGER seat_protection
BEFORE INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION protect_seat_booking();

-- Function: release_seat_on_failed_payment
CREATE OR REPLACE FUNCTION public.release_seat_on_failed_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

IF NEW.status = 'failed' THEN

UPDATE seat_inventory
SET status = 'available'
WHERE trip_id = NEW.booking_id;

END IF;

RETURN NEW;

END;
$$;

-- Trigger: seat_release_trigger
DROP TRIGGER IF EXISTS seat_release_trigger ON payments;
CREATE TRIGGER seat_release_trigger
AFTER UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION release_seat_on_failed_payment();

-- Function: auto_operator_settlement_trigger
CREATE OR REPLACE FUNCTION public.auto_operator_settlement_trigger()
CREATE OR REPLACE FUNCTION public.auto_operator_s: auto_operator_settlement_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
 total_paid NUMERIC;
 operator_id UUID;
BEGIN

IF NEW.status = 'completed' THEN

SELECT r.operator_id INTO operator_id
FROM trips t
JOIN routes r ON t.route_id = r.id
WHERE t.id = NEW.id;

SELECT COALESCE(SUM(amount),0)
INTO total_paid
FROM bookings
WHERE trip_id = NEW.id
AND status = 'paid';

UPDATE operator_wallets
SET balance = balance + total_paid,
updated_at = NOW()
WHERE operator_id = operator_id;

END IF;

RETURN NEW;

END;
$$;

-- Trigger: trip_settlement_trigger
DROP TRIGGER IF EXISTS trip_settlement_trigger ON trips;
CREATE TRIGGER trip_settlement_trigger
AFTER UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION auto_operator_settlement_trigger();

-- Function: expire_old_bookings
CREATE OR REPLACE FUNCTION public.expire_old_bookings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

UPDATE bookings
SET status='cancelled'
WHERE status='pending'
AND created_at < NOW() - INTERVAL '15 minutes';

RETURN NEW;

END;
$$;

-- Trigger: booking_expiry_trigger
DROP TRIGGER IF EXISTS booking_expiry_trigger ON bookings;
CREATE TRIGGER booking_expiry_trigger
AFTER INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION expire_old_bookings();

-- Function: detect_fraud_activity
CREATE OR REPLACE FUNCTION public.detect_fraud_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

IF NEW.amount > 100000 THEN

INSERT INTO security_alerts(alert_type,severity,description)
VALUES(
 'HIGH_VALUE_TRANSACTION',
 'HIGH',
 'Large transaction detected'
);

END IF;

RETURN NEW;

END;
$$;

-- DONE
