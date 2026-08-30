-- ============================================================
-- Migration: Add Department, Job Title, and Staff Assignment
-- ============================================================

-- 1. Add department and job_title columns to profiles table if they don't exist
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS job_title TEXT;

-- 2. Indexes for efficient filtering by department, role, and manager
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_job_title ON public.profiles(job_title);

-- 3. Update handle_new_user() trigger to accept department and job_title
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    manager_id,
    department,
    job_title
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'manager_id' IS NULL 
           OR NEW.raw_user_meta_data->>'manager_id' = '' 
           OR NEW.raw_user_meta_data->>'manager_id' = 'undefined' THEN NULL
      ELSE (NEW.raw_user_meta_data->>'manager_id')::uuid
    END,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), ''), 'General'),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'job_title'), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    department = COALESCE(EXCLUDED.department, public.profiles.department),
    job_title = COALESCE(EXCLUDED.job_title, public.profiles.job_title);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS Policy: Allow Super Admin (managing_director) to update any profile
DROP POLICY IF EXISTS "profiles_update_director" ON public.profiles;
CREATE POLICY "profiles_update_director" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'managing_director'
    )
  );

-- 5. RPC Function: Transactional Staff Assignment by Super Admin
-- This SECURITY DEFINER function safely performs staff reassignments
-- after validating the caller has the managing_director role.
CREATE OR REPLACE FUNCTION public.assign_staff_by_super_admin(
  staff_ids UUID[],
  target_manager_id UUID,
  new_department TEXT DEFAULT NULL,
  new_job_title TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  target_manager_role TEXT;
  updated_count INT;
BEGIN
  -- Verify caller is Managing Director (Super Admin)
  SELECT role INTO caller_role 
  FROM public.profiles 
  WHERE id = auth.uid();

  IF caller_role IS NULL OR caller_role <> 'managing_director' THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admins can assign staff members to managers.';
  END IF;

  -- Verify target manager exists and is eligible
  IF target_manager_id IS NOT NULL THEN
    SELECT role INTO target_manager_role 
    FROM public.profiles 
    WHERE id = target_manager_id;

    IF target_manager_role IS NULL OR target_manager_role NOT IN ('manager', 'managing_director') THEN
      RAISE EXCEPTION 'Invalid target: Assigned person must have manager or managing_director role.';
    END IF;
  END IF;

  -- Perform bulk update
  UPDATE public.profiles
  SET 
    manager_id = target_manager_id,
    department = CASE 
      WHEN new_department IS NOT NULL AND TRIM(new_department) <> '' THEN TRIM(new_department)
      ELSE department
    END,
    job_title = CASE 
      WHEN new_job_title IS NOT NULL AND TRIM(new_job_title) <> '' THEN TRIM(new_job_title)
      ELSE job_title
    END,
    updated_at = NOW()
  WHERE id = ANY(staff_ids);

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', updated_count,
    'target_manager_id', target_manager_id
  );
END;
$$;

-- Grant execution to authenticated users (internal role check enforces security)
GRANT EXECUTE ON FUNCTION public.assign_staff_by_super_admin(UUID[], UUID, TEXT, TEXT) TO authenticated;
