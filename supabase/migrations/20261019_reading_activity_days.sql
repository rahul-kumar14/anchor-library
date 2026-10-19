-- Daily activity powers personal streaks and the dashboard's seven-day rhythm.
BEGIN;
CREATE TABLE IF NOT EXISTS public.reading_activity_days (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, activity_date)
);
ALTER TABLE public.reading_activity_days ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reading_activity_days FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.reading_activity_days TO authenticated;
GRANT ALL ON public.reading_activity_days TO service_role;
DROP POLICY IF EXISTS anchor_reading_activity_days_owner ON public.reading_activity_days;
CREATE POLICY anchor_reading_activity_days_owner ON public.reading_activity_days FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.anchor_is_admin()) WITH CHECK (user_id = auth.uid() OR public.anchor_is_admin());
COMMIT;
