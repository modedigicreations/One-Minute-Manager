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
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#f8fafc] bg-radial-subtle text-slate-900">
      {/* Sidebar / Mobile Navigations */}
      <Sidebar profile={{
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role as 'manager' | 'employee'
      }} />

      {/* Main content viewport */}
      <main className="flex-1 px-3.5 py-4 sm:px-6 sm:py-8 lg:p-10 max-w-7xl mx-auto w-full pb-28 lg:pb-10 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
