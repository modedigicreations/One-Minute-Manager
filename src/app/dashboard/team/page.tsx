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
      goals={goals || []}
      feedbacks={feedbacks || []}
    />
  )
}
