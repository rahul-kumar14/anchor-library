-- Run in this project's Supabase SQL Editor as the database owner.
-- Tightens access only; does not delete or rewrite application records.
BEGIN;

CREATE OR REPLACE FUNCTION public.anchor_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) $$;
REVOKE ALL ON FUNCTION public.anchor_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anchor_is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.anchor_is_participant(conversation uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = conversation AND user_id = auth.uid()) $$;
REVOKE ALL ON FUNCTION public.anchor_is_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anchor_is_participant(uuid) TO authenticated;

-- Public profile cards must never make the email column public, or let a
-- member grant themselves admin. API service-role operations remain available.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' LOOP
    EXECUTE format('DROP POLICY %I ON public.profiles', p.policyname);
  END LOOP;
END $$;
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT (id,username,full_name,avatar_url,bio,reading_streak,last_active_at,created_at) ON public.profiles TO anon;
GRANT SELECT (id,username,full_name,avatar_url,bio,reading_streak,last_active_at,created_at,is_admin) ON public.profiles TO authenticated;
GRANT UPDATE (username,full_name,avatar_url,bio) ON public.profiles TO authenticated;
CREATE POLICY anchor_public_profile ON public.profiles FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY anchor_update_own_profile ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Personal reading data and notifications: owner, or an authorised operator.
DO $$ DECLARE t text; p record; BEGIN
  FOREACH t IN ARRAY ARRAY['favorites','annotations','reading_progress','notifications'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon', t);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('CREATE POLICY anchor_personal_access ON public.%I FOR ALL TO authenticated USING (user_id = auth.uid() OR public.anchor_is_admin()) WITH CHECK (user_id = auth.uid() OR public.anchor_is_admin())', t);
  END LOOP;
END $$;

-- Participant checks must also hold at the direct Supabase/Realtime boundary.
DO $$ DECLARE t text; p record; BEGIN
  FOREACH t IN ARRAY ARRAY['messages','conversations','conversation_participants','chat_requests'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
CREATE POLICY anchor_participants_read ON public.conversation_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.anchor_is_participant(conversation_id) OR public.anchor_is_admin());
CREATE POLICY anchor_conversations_read ON public.conversations FOR SELECT TO authenticated
  USING (public.anchor_is_participant(id) OR public.anchor_is_admin() OR id IN (
    '00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000009'));
CREATE POLICY anchor_messages_read ON public.messages FOR SELECT TO authenticated
  USING ((public.anchor_is_participant(conversation_id) OR public.anchor_is_admin() OR conversation_id IN (
    '00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000009'))
    AND is_deleted = false AND created_at >= now() - interval '7 days');
CREATE POLICY anchor_chat_requests_read ON public.chat_requests FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid() OR public.anchor_is_admin());

COMMIT;
