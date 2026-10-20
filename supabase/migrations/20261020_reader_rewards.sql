-- Every book is split automatically into five reading milestones. Section 6 is
-- the one-time completion hamper after the final page.
BEGIN;
CREATE TABLE IF NOT EXISTS public.reader_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id bigint NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  section_number integer NOT NULL CHECK (section_number BETWEEN 1 AND 6),
  target_pages integer NOT NULL CHECK (target_pages > 0),
  points integer NOT NULL CHECK (points > 0),
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id, section_number)
);
ALTER TABLE public.reader_rewards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reader_rewards FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.reader_rewards TO authenticated;
GRANT ALL ON public.reader_rewards TO service_role;
DROP POLICY IF EXISTS anchor_reader_rewards_owner ON public.reader_rewards;
CREATE POLICY anchor_reader_rewards_owner ON public.reader_rewards FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.anchor_is_admin())
  WITH CHECK (user_id = auth.uid() OR public.anchor_is_admin());
COMMIT;
