-- ============================================================
-- Migration: Two-Way Goal Strategy Bidding & Mutual Agreement
-- ============================================================

-- 1. Add strategy columns to public.goals
ALTER TABLE public.goals 
  ADD COLUMN IF NOT EXISTS strategy_status TEXT NOT NULL DEFAULT 'pending_submission'
    CHECK (strategy_status IN ('pending_submission', 'submitted', 'approved', 'revision_requested')),
  ADD COLUMN IF NOT EXISTS strategy_text TEXT,
  ADD COLUMN IF NOT EXISTS strategy_feedback TEXT,
  ADD COLUMN IF NOT EXISTS strategy_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS strategy_approved_at TIMESTAMPTZ;

-- 2. Create goal_strategy_iterations table for full back-and-forth dialogue history
CREATE TABLE IF NOT EXISTS public.goal_strategy_iterations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id          UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role      TEXT NOT NULL CHECK (sender_role IN ('employee', 'manager', 'managing_director')),
  action_type      TEXT NOT NULL CHECK (action_type IN ('submitted', 'revision_requested', 'approved', 'co_edited')),
  strategy_content TEXT NOT NULL,
  feedback_note    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable RLS on goal_strategy_iterations
ALTER TABLE public.goal_strategy_iterations ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for goal_strategy_iterations
DROP POLICY IF EXISTS "strategy_iterations_select" ON public.goal_strategy_iterations;
CREATE POLICY "strategy_iterations_select" ON public.goal_strategy_iterations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = goal_id AND (
        auth.uid() = g.employee_id OR 
        auth.uid() = g.manager_id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'managing_director')
      )
    )
  );

DROP POLICY IF EXISTS "strategy_iterations_insert" ON public.goal_strategy_iterations;
CREATE POLICY "strategy_iterations_insert" ON public.goal_strategy_iterations
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
  );

-- 5. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_goals_strategy_status ON public.goals(strategy_status);
CREATE INDEX IF NOT EXISTS idx_strategy_iterations_goal_id ON public.goal_strategy_iterations(goal_id);
CREATE INDEX IF NOT EXISTS idx_strategy_iterations_created_at ON public.goal_strategy_iterations(created_at);
