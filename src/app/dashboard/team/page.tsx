import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TeamClient from './TeamClient'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'manager' && profile.role !== 'managing_director')) {
    redirect('/dashboard') // Employees shouldn't access the team roster
  }

  const isDirector = profile.role === 'managing_director'

  // Fetch all managers for name lookup if director
  let managersMap = new Map<string, string>()
  if (isDirector) {
    const { data: managersData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('role', ['manager', 'managing_director'])
    if (managersData) {
      managersMap = new Map(managersData.map(m => [m.id, m.full_name || m.email]))
    }
  }

  // Fetch employees
  const employeesQuery = supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, role, department, job_title, manager_id')

  if (!isDirector) {
    employeesQuery.eq('manager_id', user.id)
  } else {
    employeesQuery.eq('role', 'employee')
  }
  const { data: rawEmployees } = await employeesQuery

  const employees = (rawEmployees || []).map(emp => ({
    id: emp.id,
    full_name: emp.full_name,
    email: emp.email,
    avatar_url: emp.avatar_url,
    department: (emp as { department?: string }).department || 'General',
    job_title: (emp as { job_title?: string }).job_title || null,
    role: emp.role,
    manager_id: emp.manager_id,
    manager_name: emp.manager_id ? managersMap.get(emp.manager_id) || null : null,
  }))

  // Fetch goals
  const goalsQuery = supabase
    .from('goals')
    .select('id, objective, expected_result, deadline, progress, status, employee_id')

  if (!isDirector) {
    goalsQuery.eq('manager_id', user.id)
  }
  const { data: goals } = await goalsQuery

  // Standard current date string (YYYY-MM-DD) for timezone-neutral overdue comparison
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // Format goals with real-time overdue detection
  const formattedGoals = (goals || []).map(g => {
    let effectiveStatus = g.status
    if (effectiveStatus !== 'completed' && g.deadline < todayStr) {
      effectiveStatus = 'behind'
    }
    return {
      ...g,
      status: effectiveStatus as 'not_started' | 'in_progress' | 'completed' | 'behind',
    }
  })

  // Fetch feedbacks
  const feedbacksQuery = supabase
    .from('feedbacks')
    .select('id, type, message, created_at, employee_id')
    .order('created_at', { ascending: false })

  if (!isDirector) {
    feedbacksQuery.eq('manager_id', user.id)
  }
  const { data: feedbacks } = await feedbacksQuery

  return (
    <TeamClient
      managerProfile={{
        full_name: profile.full_name,
        email: profile.email,
      }}
      employees={employees}
      goals={formattedGoals}
      feedbacks={feedbacks || []}
      isDirector={isDirector}
    />
  )
}
