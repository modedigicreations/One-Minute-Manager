import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

export const metadata = {
  title: 'Dashboard | One-Minute Manager',
  description: 'Manage goals, track achievements, and give timely feedback.',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 1. Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Get user profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    // If profile check fails, sign out and go to login
    await supabase.auth.signOut()
    redirect('/login?error=Could not retrieve user profile.')
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
      {/* Sidebar navigation */}
      <Sidebar profile={{
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role as 'manager' | 'employee'
      }} />

      {/* Main content viewport */}
      <main className="flex-1 p-5 sm:p-8 lg:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
