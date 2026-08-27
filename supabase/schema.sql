-- ============================================================
-- One-Minute Manager (OMM) Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL UNIQUE,
  full_name    TEXT,
  role         TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('manager', 'employee')),
  manager_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: Automatically create public profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, manager_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    (NEW.raw_user_meta_data->>'manager_id')::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- GOALS (One-Minute Goals)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.goals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manager_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  objective       TEXT NOT NULL,
  expected_result TEXT NOT NULL,
  deadline        DATE NOT NULL,
  progress        INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status          TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'behind')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FEEDBACKS (One-Minute Praisings & Corrections)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id      UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  manager_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('praising', 'correction')),
  message      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true); -- Authenticated users can view other profiles to link manager/employee

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. Goals Policies
CREATE POLICY "goals_select_related" ON public.goals
  FOR SELECT USING (auth.uid() = manager_id OR auth.uid() = employee_id);

CREATE POLICY "goals_insert_manager" ON public.goals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "goals_update_related" ON public.goals
  FOR UPDATE USING (auth.uid() = manager_id OR auth.uid() = employee_id);

-- 3. Feedbacks Policies
CREATE POLICY "feedbacks_select_related" ON public.feedbacks
  FOR SELECT USING (auth.uid() = manager_id OR auth.uid() = employee_id);

CREATE POLICY "feedbacks_insert_manager" ON public.feedbacks
  FOR INSERT WITH CHECK (
    auth.uid() = manager_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON public.profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_goals_manager_id ON public.goals(manager_id);
CREATE INDEX IF NOT EXISTS idx_goals_employee_id ON public.goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_employee_id ON public.feedbacks(employee_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_type ON public.feedbacks(type);
