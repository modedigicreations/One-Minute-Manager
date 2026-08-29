import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ManagerDashboard from '@/components/ManagerDashboard'
import EmployeeDashboard from '@/components/EmployeeDashboard'
import ManagingDirectorDashboard, { 
  DirectorManager, 
  DirectorGoal, 
  DirectorLagFlag 
} from '@/components/ManagingDirectorDashboard'

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

  // Standard current date string (YYYY-MM-DD) for timezone-neutral overdue comparison
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // ============================================================
  // CASE 1: MANAGING DIRECTOR (SUPER ADMIN)
  // ============================================================
  if (profile.role === 'managing_director') {
    // 1. Fetch all managers & employees
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, manager_id')

    const managersList = (allProfiles || []).filter(p => p.role === 'manager')
    const employeesList = (allProfiles || []).filter(p => p.role === 'employee')

    // 2. Fetch all goals across company
    const { data: allGoalsData } = await supabase
      .from('goals')
      .select('id, objective, expected_result, deadline, progress, status, manager_id, employee_id')
      .order('created_at', { ascending: false })

    // 3. Fetch all feedbacks
    const { data: allFeedbacks } = await supabase
      .from('feedbacks')
      .select('id, type, manager_id, employee_id')

    // 4. Fetch all lag flags (try/catch in case table is not yet created in remote DB)
    let lagFlagsData: Record<string, unknown>[] = []
    try {
      const { data: flags } = await supabase
        .from('lag_flags')
        .select('*')
        .order('created_at', { ascending: false })
      if (flags) lagFlagsData = flags
    } catch {
      lagFlagsData = []
    }

    // Profiles map for rapid ID lookup
    const profileMap = new Map((allProfiles || []).map(p => [p.id, p]))

    // Format all goals with real-time overdue detection
    const formattedAllGoals: DirectorGoal[] = (allGoalsData || []).map(g => {
      let effectiveStatus = g.status
      if (effectiveStatus !== 'completed' && g.deadline < todayStr) {
        effectiveStatus = 'behind'
      }

      const mgr = profileMap.get(g.manager_id)
      const emp = profileMap.get(g.employee_id)

      return {
        id: g.id,
        objective: g.objective,
        expected_result: g.expected_result,
        deadline: g.deadline,
        progress: g.progress,
        status: effectiveStatus as 'not_started' | 'in_progress' | 'completed' | 'behind',
        manager_id: g.manager_id,
        employee_id: g.employee_id,
        manager_name: mgr?.full_name || 'Manager',
        employee_name: emp?.full_name || 'Employee',
      }
    })

    // Compute metrics for each manager
    const directorManagers: DirectorManager[] = managersList.map(mgr => {
      const mgrGoals = formattedAllGoals.filter(g => g.manager_id === mgr.id)
      const mgrFeedbacks = (allFeedbacks || []).filter(f => f.manager_id === mgr.id)
      const teamEmployees = employeesList.filter(e => e.manager_id === mgr.id)

      return {
        id: mgr.id,
        full_name: mgr.full_name,
        email: mgr.email,
        employeeCount: teamEmployees.length,
        goalsCompleted: mgrGoals.filter(g => g.status === 'completed').length,
        goalsInProgress: mgrGoals.filter(g => g.status === 'in_progress' || g.status === 'not_started').length,
        goalsBehind: mgrGoals.filter(g => g.status === 'behind').length,
        praisesCount: mgrFeedbacks.filter(f => f.type === 'praising').length,
        correctionsCount: mgrFeedbacks.filter(f => f.type === 'correction').length,
      }
    })

    // Format lag flags
    const formattedFlags: DirectorLagFlag[] = lagFlagsData.map(f => {
      const mgr = profileMap.get(f.manager_id as string)
      const emp = f.employee_id ? profileMap.get(f.employee_id as string) : null

      return {
        id: f.id as string,
        manager_id: f.manager_id as string,
        employee_id: (f.employee_id as string) || null,
        goal_id: (f.goal_id as string) || null,
        flag_type: (f.flag_type as string) || 'custom',
        directive: (f.directive as string) || '',
        status: (f.status as 'open' | 'acknowledged' | 'resolved') || 'open',
        created_at: f.created_at as string,
        resolved_at: (f.resolved_at as string) || null,
        manager_name: mgr?.full_name || 'Manager',
        employee_name: emp?.full_name || null,
      }
    })

    const totalPraises = (allFeedbacks || []).filter(f => f.type === 'praising').length
    const totalCorrections = (allFeedbacks || []).filter(f => f.type === 'correction').length

    return (
      <ManagingDirectorDashboard
        directorProfile={{
          full_name: profile.full_name,
          email: profile.email,
        }}
        managers={directorManagers}
        allGoals={formattedAllGoals}
        lagFlags={formattedFlags}
        totalEmployees={employeesList.length}
        totalPraises={totalPraises}
        totalCorrections={totalCorrections}
      />
    )
  }

  // ============================================================
  // CASE 2: MANAGER
  // ============================================================
  if (profile.role === 'manager') {
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

    // Fetch lag flags directed to this manager
    let managerLagFlags: Record<string, unknown>[] = []
    try {
      const { data: flags } = await supabase
        .from('lag_flags')
        .select('*')
        .eq('manager_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      if (flags) managerLagFlags = flags
    } catch {
      managerLagFlags = []
    }

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
        lagFlags={managerLagFlags as unknown as Array<{
          id: string
          flag_type: string
          directive: string
          status: 'open' | 'acknowledged' | 'resolved'
          created_at: string
        }>}
      />
    )
  }

  // ============================================================
  // CASE 3: EMPLOYEE
  // ============================================================
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
