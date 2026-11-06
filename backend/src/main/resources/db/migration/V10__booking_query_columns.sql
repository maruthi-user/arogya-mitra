-- Bookings were filtered in Java after loading every row. The patient is now a real column so
-- lists can be filtered in SQL; existing rows are filled from their JSON document on startup
-- (CatalogRepository).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_id VARCHAR(80);
CREATE INDEX IF NOT EXISTS bookings_patient ON bookings(patient_id, booking_date, booking_time);
CREATE INDEX IF NOT EXISTS bookings_provider ON bookings(pid, booking_date, booking_time);
CREATE INDEX IF NOT EXISTS bookings_pending_expiry ON bookings(status, expires_at);
