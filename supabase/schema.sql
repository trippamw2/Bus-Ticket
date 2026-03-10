-- BusLink Database Schema
-- Complete SQL file with tables, functions, and triggers

-- ============================================================================
-- TABLES
-- ============================================================================

-- Passengers table
CREATE TABLE IF NOT EXISTS passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    phone TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    ticket_reference TEXT UNIQUE,
    sms_sent BOOLEAN DEFAULT FALSE,
    issued_at TIMESTAMP DEFAULT NOW()
);

-- Refund requests table
CREATE TABLE IF NOT EXISTS refund_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    reason TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Operator settlements table
CREATE TABLE IF NOT EXISTS operator_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID REFERENCES operators(id),
    gross_amount NUMERIC,
    platform_commission NUMERIC,
    net_amount NUMERIC,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- SMS logs table (if not already exists)
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending',
    sent_at TIMESTAMP DEFAULT NOW()
);

-- Seat locks table (for seat locking mechanism)
CREATE TABLE IF NOT EXISTS seat_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id),
    seat_number INTEGER,
    locked_by TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to confirm booking when payment is successful
CREATE OR REPLACE FUNCTION confirm_booking_from_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'successful' OR NEW.status = 'completed' THEN
        UPDATE bookings
        SET status = 'confirmed'
        WHERE id = NEW.booking_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate ticket when booking is confirmed
CREATE OR REPLACE FUNCTION generate_ticket()
RETURNS TRIGGER AS $$
DECLARE
    ticket_ref TEXT;
BEGIN
    -- Generate unique ticket reference with BL prefix
    ticket_ref := 'BL' || floor(random()*100000000)::TEXT;
    
    -- Ensure uniqueness
    WHILE (SELECT COUNT(*) FROM tickets WHERE ticket_reference = ticket_ref) > 0 LOOP
        ticket_ref := 'BL' || floor(random()*100000000)::TEXT;
    END LOOP;
    
    INSERT INTO tickets (
        booking_id,
        ticket_reference
    )
    VALUES (
        NEW.id,
        ticket_ref
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log SMS when ticket is generated
CREATE OR REPLACE FUNCTION log_ticket_sms()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO sms_logs (
        phone_number,
        message,
        status
    )
    SELECT
        b.phone,
        'TICKET ' || NEW.ticket_reference || ' - Your bus ticket is ready. Show this at boarding.',
        'pending'
    FROM bookings b
    WHERE b.id = NEW.booking_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to release expired seat locks
CREATE OR REPLACE FUNCTION release_expired_seat_locks()
RETURNS VOID AS $$
BEGIN
    DELETE FROM seat_locks
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to calculate operator settlement
CREATE OR REPLACE FUNCTION calculate_operator_settlement(
    p_operator_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    operator_id UUID,
    gross_amount NUMERIC,
    platform_commission NUMERIC,
    net_amount NUMERIC,
    booking_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as operator_id,
        COALESCE(SUM(b.amount), 0) as gross_amount,
        COALESCE(SUM(b.amount), 0) * (o.commission_percent / 100) as platform_commission,
        COALESCE(SUM(b.amount), 0) - (COALESCE(SUM(b.amount), 0) * (o.commission_percent / 100)) as net_amount,
        COUNT(b.id)::INTEGER as booking_count
    FROM operators o
    LEFT JOIN bookings b ON b.operator_id = o.id
    LEFT JOIN trips t ON t.id = b.trip_id
    WHERE o.id = p_operator_id
        AND t.travel_date BETWEEN p_start_date AND p_end_date
        AND b.status = 'paid'
    GROUP BY o.id, o.commission_percent;
END;
$$ LANGUAGE plpgsql;

-- Function to process refund request
CREATE OR REPLACE FUNCTION process_refund_request(
    p_refund_id UUID,
    p_approved BOOLEAN
)
RETURNS VOID AS $$
DECLARE
    v_booking_id UUID;
    v_amount NUMERIC;
BEGIN
    -- Get refund request details
    SELECT booking_id INTO v_booking_id 
    FROM refund_requests 
    WHERE id = p_refund_id;
    
    IF p_approved THEN
        -- Update refund request status
        UPDATE refund_requests 
        SET status = 'approved' 
        WHERE id = p_refund_id;
        
        -- Cancel the booking
        UPDATE bookings 
        SET status = 'cancelled' 
        WHERE id = v_booking_id;
        
        -- Get refund amount from payment
        SELECT amount INTO v_amount 
        FROM payments 
        WHERE booking_id = v_booking_id 
        AND status IN ('completed', 'successful')
        LIMIT 1;
        
        -- Log refund (in production, this would process actual refund)
        RAISE NOTICE 'Processing refund of MWK % for booking %', v_amount, v_booking_id;
    ELSE
        -- Reject the refund request
        UPDATE refund_requests 
        SET status = 'rejected' 
        WHERE id = p_refund_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to confirm booking when payment is successful
DROP TRIGGER IF EXISTS payment_confirm_trigger ON payments;
CREATE TRIGGER payment_confirm_trigger
AFTER UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION confirm_booking_from_payment();

-- Trigger to generate ticket when booking is confirmed
DROP TRIGGER IF EXISTS ticket_generation_trigger ON bookings;
CREATE TRIGGER ticket_generation_trigger
AFTER UPDATE ON bookings
FOR EACH ROW
WHEN (NEW.status = 'confirmed')
EXECUTE FUNCTION generate_ticket();

-- Trigger to log SMS when ticket is generated
DROP TRIGGER IF EXISTS ticket_sms_trigger ON tickets;
CREATE TRIGGER ticket_sms_trigger
AFTER INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION log_ticket_sms();

-- ============================================================================
-- INDEXES (Performance optimization)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_passengers_phone ON passengers(phone);
CREATE INDEX IF NOT EXISTS idx_tickets_booking_id ON tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_tickets_reference ON tickets(ticket_reference);
CREATE INDEX IF NOT EXISTS idx_refund_requests_booking_id ON refund_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_operator_settlements_operator_id ON operator_settlements(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_settlements_status ON operator_settlements(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_seat_locks_trip_id ON seat_locks(trip_id);
CREATE INDEX IF NOT EXISTS idx_seat_locks_expires ON seat_locks(expires_at);

-- ============================================================================
-- SEED DATA (Optional - for testing)
-- ============================================================================

-- Insert sample passengers (if table is empty)
-- INSERT INTO passengers (name, phone) VALUES 
--     ('John Doe', '+265991234567'),
--     ('Jane Smith', '+265991234568'),
--     ('Robert Brown', '+265991234569')
-- ON CONFLICT (phone) DO NOTHING;
