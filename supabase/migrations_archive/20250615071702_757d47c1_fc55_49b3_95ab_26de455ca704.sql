
-- 1. Drop the public.users table if it exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    EXECUTE 'DROP TABLE public.users CASCADE';
  END IF;
END$$;

-- 2. Drop any policy on a table named "users" (just in case).
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT policyname FROM pg_policies WHERE tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.users;', rec.policyname);
  END LOOP;
END$$;

-- 3. Show any triggers on "users" or "profiles"
SELECT event_object_schema, event_object_table, trigger_name
FROM information_schema.triggers
WHERE event_object_table IN ('users', 'profiles');

-- 4. Show any RLS policies on "profiles" that mention "users" (should be none)
SELECT * FROM pg_policies WHERE tablename = 'profiles'
  AND (qual ILIKE '%users%' OR with_check ILIKE '%users%');
