-- ============================================================
-- Migration: Add Managing Director (Super Admin) & Lag Flagging
-- ============================================================

-- 1. Update profiles role check constraint to include 'managing_director'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('managing_director', 'manager', 'employee'));

-- 2. Create lag_flags table
CREATE TABLE IF NOT EXISTS public.lag_flags (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  director_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  manager_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_id         UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  flag_type       TEXT NOT NULL DEFAULT 'custom' CHECK (flag_type IN ('behind_goal', 'stale_feedback', 'performance_lag', 'custom')),
  directive       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

-- 3. Enable RLS on lag_flags
ALTER TABLE public.lag_flags ENABLE ROW LEVEL SECURITY;

-- 4. Policies for lag_flags
DROP POLICY IF EXISTS "lag_flags_select_parties" ON public.lag_flags;
CREATE POLICY "lag_flags_select_parties" ON public.lag_flags
  FOR SELECT USING (
    auth.uid() = director_id OR 
    auth.uid() = manager_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'managing_director')
  );

DROP POLICY IF EXISTS "lag_flags_insert_director" ON public.lag_flags;
CREATE POLICY "lag_flags_insert_director" ON public.lag_flags
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'managing_director')
  );

DROP POLICY IF EXISTS "lag_flags_update_parties" ON public.lag_flags;
CREATE POLICY "lag_flags_update_parties" ON public.lag_flags
  FOR UPDATE USING (
    auth.uid() = director_id OR auth.uid() = manager_id
  );

-- 5. Give Managing Director full visibility on goals and feedbacks
DROP POLICY IF EXISTS "goals_select_related" ON public.goals;
CREATE POLICY "goals_select_related" ON public.goals
  FOR SELECT USING (
    auth.uid() = manager_id OR 
    auth.uid() = employee_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'managing_director')
  );

DROP POLICY IF EXISTS "feedbacks_select_related" ON public.feedbacks;
CREATE POLICY "feedbacks_select_related" ON public.feedbacks
  FOR SELECT USING (
    auth.uid() = manager_id OR 
    auth.uid() = employee_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'managing_director')
  );

-- 6. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_lag_flags_manager_id ON public.lag_flags(manager_id);
CREATE INDEX IF NOT EXISTS idx_lag_flags_director_id ON public.lag_flags(director_id);
CREATE INDEX IF NOT EXISTS idx_lag_flags_status ON public.lag_flags(status);
