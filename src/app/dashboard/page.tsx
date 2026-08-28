import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ManagerDashboard from '@/components/ManagerDashboard'
import EmployeeDashboard from '@/components/EmployeeDashboard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Get user session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login?error=Profile not found')
  }

  const isManager = profile.role === 'manager'

  // Standard current date string (YYYY-MM-DD) for timezone-neutral overdue comparison
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  if (isManager) {
    // MANAGER DATA FETCHING
    
    // Fetch profiles managed by this manager
    const { data: employees } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('manager_id', user.id)

    // Fetch goals where manager_id = user.id
    const { data: goals } = await supabase
      .from('goals')
      .select('id, objective, expected_result, deadline, progress, status, employee_id, profiles!goals_employee_id_fkey(full_name)')
      .eq('manager_id', user.id)
      .order('created_at', { ascending: false })

    // Fetch feedbacks where manager_id = user.id
    const { data: feedbacks } = await supabase
      .from('feedbacks')
      .select('id, type, message, created_at, profiles!feedbacks_employee_id_fkey(full_name, email)')
      .eq('manager_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Format goals with real-time overdue detection
    const formattedGoals = (goals || []).map(g => {
      const p = g.profiles as unknown as { full_name: string | null } | null
      let effectiveStatus = g.status
      if (effectiveStatus !== 'completed' && g.deadline < todayStr) {
        effectiveStatus = 'behind'
      }
      return {
        ...g,
        status: effectiveStatus as 'not_started' | 'in_progress' | 'completed' | 'behind',
        profiles: {
          full_name: p?.full_name || 'Anonymous'
        }
      }
    })

    // Calculate manager statistics using real-time effective status
    const stats = {
      completed: formattedGoals.filter(g => g.status === 'completed').length,
      inProgress: formattedGoals.filter(g => g.status === 'in_progress' || g.status === 'not_started').length,
      behind: formattedGoals.filter(g => g.status === 'behind').length,
      totalPraises: feedbacks?.filter(f => f.type === 'praising').length || 0,
      totalCorrections: feedbacks?.filter(f => f.type === 'correction').length || 0,
    }

    const formattedFeedbacks = (feedbacks || []).map(f => {
      const p = f.profiles as unknown as { full_name: string | null; email: string } | null
      return {
        ...f,
        profiles: {
          full_name: p?.full_name || 'Anonymous',
          email: p?.email || ''
        }
      }
    })

    return (
      <ManagerDashboard
        managerProfile={{
          full_name: profile.full_name,
          email: profile.email,
        }}
        employees={employees || []}
        goals={formattedGoals}
        feedbacks={formattedFeedbacks}
        stats={stats}
      />
    )
  } else {
    // EMPLOYEE DATA FETCHING

    // Fetch goals assigned to this employee
    const { data: goals } = await supabase
      .from('goals')
      .select('id, objective, expected_result, deadline, progress, status')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false })

    // Real-time overdue detection for employee
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

    // Fetch feedbacks received by this employee
    const { data: feedbacks } = await supabase
      .from('feedbacks')
      .select('id, type, message, created_at')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Fetch employee's manager info if linked
    let managerInfo: { full_name: string | null; email: string } | null = null
    if (profile.manager_id) {
      const { data: mgr } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', profile.manager_id)
        .single()
      if (mgr) {
        managerInfo = mgr
      }
    }

    return (
      <EmployeeDashboard
        employeeProfile={{
          full_name: profile.full_name,
          email: profile.email,
        }}
        managerInfo={managerInfo}
        goals={formattedGoals}
        feedbacks={feedbacks || []}
      />
    )
  }
}
