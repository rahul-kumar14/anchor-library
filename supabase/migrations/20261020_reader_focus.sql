-- Reader-first study mode: saved highlight colours and cumulative reading time.
BEGIN;

ALTER TABLE public.annotations ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'amber'
  CHECK (color IN ('amber', 'blue', 'pink', 'green'));

CREATE TABLE IF NOT EXISTS public.book_reading_time (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id bigint NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  total_seconds integer NOT NULL DEFAULT 0 CHECK (total_seconds >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);
ALTER TABLE public.book_reading_time ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.book_reading_time FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.book_reading_time TO authenticated;
GRANT ALL ON public.book_reading_time TO service_role;
DROP POLICY IF EXISTS anchor_book_reading_time_owner ON public.book_reading_time;
CREATE POLICY anchor_book_reading_time_owner ON public.book_reading_time FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.anchor_is_admin())
  WITH CHECK (user_id = auth.uid() OR public.anchor_is_admin());
COMMIT;
