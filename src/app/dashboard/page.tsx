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
      .limit(15)

    // Calculate manager statistics
    const stats = {
      completed: goals?.filter(g => g.status === 'completed').length || 0,
      inProgress: goals?.filter(g => g.status === 'in_progress' || g.status === 'not_started').length || 0,
      behind: goals?.filter(g => g.status === 'behind').length || 0,
    }

    // Format goals data to include employee names correctly
    const formattedGoals = (goals || []).map(g => {
      const profile = g.profiles as unknown as { full_name: string | null } | null
      return {
        ...g,
        profiles: {
          full_name: profile?.full_name || 'Anonymous'
        }
      }
    })

    const formattedFeedbacks = (feedbacks || []).map(f => {
      const profile = f.profiles as unknown as { full_name: string | null; email: string } | null
      return {
        ...f,
        profiles: {
          full_name: profile?.full_name || 'Anonymous',
          email: profile?.email || ''
        }
      }
    })

    return (
      <ManagerDashboard
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

    // Fetch feedbacks received by this employee
    const { data: feedbacks } = await supabase
      .from('feedbacks')
      .select('id, type, message, created_at')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    return (
      <EmployeeDashboard
        goals={goals || []}
        feedbacks={feedbacks || []}
      />
    )
  }
}
