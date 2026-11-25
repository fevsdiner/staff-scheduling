-- Close public Data API access on every public table.
--
-- Staff login is an app cookie, not Supabase Auth, so the Data API never
-- receives an authenticated JWT. Reads and writes from the Next.js server
-- use the service role, which bypasses RLS. The anon key stays in the
-- project only as a public identifier; it must not be able to read or write.
--
-- Apply this only after the matching app deploy is live. The previous server
-- code reads with the anon key. If this SQL runs first, those reads fail and
-- several stores substitute demo schedules, which can be saved over a real day.
--
-- Safe to run more than once.

DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
    ORDER BY c.relname
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',
      table_name
    );
    -- service_role bypasses RLS but still needs a table grant.
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
    RAISE NOTICE 'RLS enabled and client grants revoked: public.%', table_name;
  END LOOP;
END $$;

-- These policies allowed every anon or authenticated request to read rows.
-- With client grants revoked they were already unused; drop them so a later
-- GRANT SELECT cannot reopen the tables.
DROP POLICY IF EXISTS "Public can read teams" ON public.teams;
DROP POLICY IF EXISTS "Public can read active employees" ON public.employees;
DROP POLICY IF EXISTS "Public can read daily schedules" ON public.daily_schedules;
DROP POLICY IF EXISTS "Public can read daily schedule segments" ON public.daily_schedule_segments;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read supervisor_teams" ON public.supervisor_teams;

-- No anon or authenticated policies are created. RLS with no policy is deny-all
-- for those roles. The app does not use Supabase Auth, so a TO authenticated
-- policy would not match any request the app sends.

DO $$
DECLARE
  missing text;
  views text;
BEGIN
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
    INTO missing
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND NOT c.relrowsecurity;

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'public tables still missing RLS: %', missing;
  END IF;

  SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
    INTO views
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'v';

  IF views IS NOT NULL THEN
    RAISE EXCEPTION
      'public views are not covered by this migration (views bypass RLS unless security_invoker): %',
      views;
  END IF;
END $$;
