-- ============================================================
-- Migration: Enable Super Admin (Managing Director) Goal Operations
-- ============================================================

-- 1. Allow Super Admin (and Managers) to insert goals
DROP POLICY IF EXISTS "goals_insert_manager" ON public.goals;
CREATE POLICY "goals_insert_manager" ON public.goals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('manager', 'managing_director')
    )
  );

-- 2. Allow Super Admin (and involved parties) to view goals
DROP POLICY IF EXISTS "goals_select_related" ON public.goals;
CREATE POLICY "goals_select_related" ON public.goals
  FOR SELECT USING (
    auth.uid() = manager_id OR 
    auth.uid() = employee_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'managing_director')
  );

-- 3. Allow Super Admin (and involved parties) to update goals
DROP POLICY IF EXISTS "goals_update_related" ON public.goals;
CREATE POLICY "goals_update_related" ON public.goals
  FOR UPDATE USING (
    auth.uid() = manager_id OR 
    auth.uid() = employee_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'managing_director')
  );

-- 4. Allow Super Admin (and manager creators) to delete goals
DROP POLICY IF EXISTS "goals_delete_manager" ON public.goals;
CREATE POLICY "goals_delete_manager" ON public.goals
  FOR DELETE USING (
    (auth.uid() = manager_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'managing_director')
  );
