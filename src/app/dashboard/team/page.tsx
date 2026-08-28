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

  if (!profile || profile.role !== 'manager') {
    redirect('/dashboard') // Employees shouldn't access the team page
  }

  // Fetch employees
  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('manager_id', user.id)

  // Fetch goals
  const { data: goals } = await supabase
    .from('goals')
    .select('id, objective, expected_result, deadline, progress, status, employee_id')
    .eq('manager_id', user.id)

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
  const { data: feedbacks } = await supabase
    .from('feedbacks')
    .select('id, type, message, created_at, employee_id')
    .eq('manager_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <TeamClient
      managerProfile={{
        full_name: profile.full_name,
        email: profile.email,
      }}
      employees={employees || []}
      goals={formattedGoals}
      feedbacks={feedbacks || []}
    />
  )
}
