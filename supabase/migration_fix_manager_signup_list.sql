-- ============================================================
-- Fix: Allow anonymous visitors to read available managers on signup
-- ============================================================

-- 1. Create a SECURITY DEFINER function to bypass RLS safely for signup dropdown
CREATE OR REPLACE FUNCTION public.get_available_managers()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, full_name, email, role
  FROM public.profiles
  WHERE role IN ('manager', 'managing_director')
  ORDER BY full_name ASC;
$$;

-- 2. Grant execution to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_available_managers() TO anon, authenticated;

-- 3. Explicitly grant SELECT policy on public.profiles to anon for managers
DROP POLICY IF EXISTS "profiles_select_managers_public" ON public.profiles;
CREATE POLICY "profiles_select_managers_public" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (role IN ('manager', 'managing_director'));

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);
