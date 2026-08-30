import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StaffAssignmentManager, { StaffProfile, ManagerProfile } from '@/components/StaffAssignmentManager'

export const dynamic = 'force-dynamic'

export default async function StaffAssignPage() {
  const supabase = await createClient()

  // 1. Verify authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Verify Managing Director (Super Admin) role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'managing_director') {
    redirect('/dashboard')
  }

  // 3. Fetch all profiles across the organization with resilient fallback
  let profilesList: Array<{
    id: string
    full_name: string | null
    email: string
    role: 'employee' | 'manager' | 'managing_director'
    manager_id: string | null
    department?: string | null
    job_title?: string | null
    avatar_url?: string | null
  }> = []
  let migrationNeeded = false

  // Attempt 1: Full query with department & job_title
  const { data: fullProfiles, error: fullError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, manager_id, department, job_title, avatar_url')
    .order('full_name', { ascending: true })

  if (!fullError && fullProfiles && fullProfiles.length > 0) {
    profilesList = fullProfiles as typeof profilesList
  } else {
    // Attempt 2: Fallback query without department/job_title (in case columns are not yet added in Supabase)
    const { data: basicProfiles, error: basicError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, manager_id, avatar_url')
      .order('full_name', { ascending: true })

    if (basicProfiles && basicProfiles.length > 0) {
      migrationNeeded = true
      profilesList = basicProfiles.map(p => ({
        ...p,
        department: 'General',
        job_title: null,
      })) as typeof profilesList
    } else {
      if (basicError) console.error('Basic profiles fetch error:', basicError)
      if (fullError) console.error('Full profiles fetch error:', fullError)
    }
  }

  // Eligible managers who can receive staff assignments (Managers & Managing Director)
  const managersList = profilesList.filter(p => p.role === 'manager' || p.role === 'managing_director')

  // Staff roster eligible for assignment (Employees and Managers)
  const staffList: StaffProfile[] = profilesList
    .filter(p => p.role !== 'managing_director')
    .map(p => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      role: p.role,
      manager_id: p.manager_id,
      department: p.department || 'General',
      job_title: p.job_title || null,
      avatar_url: p.avatar_url || null,
    }))

  const managers: ManagerProfile[] = managersList.map(m => {
    const reportsCount = staffList.filter(s => s.manager_id === m.id).length
    return {
      id: m.id,
      full_name: m.full_name,
      email: m.email,
      role: m.role,
      department: m.department || 'General',
      employeeCount: reportsCount,
    }
  })

  return (
    <StaffAssignmentManager
      staffList={staffList}
      managers={managers}
      migrationNeeded={migrationNeeded}
    />
  )
}
