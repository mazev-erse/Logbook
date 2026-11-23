-- Add automated step counter fields to active_recovery_logs
ALTER TABLE public.active_recovery_logs 
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC(6, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS average_speed_kmh NUMERIC(5, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS calculated_steps INT DEFAULT NULL;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
