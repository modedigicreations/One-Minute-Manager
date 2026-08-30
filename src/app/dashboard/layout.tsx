import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { ChevronDown } from 'lucide-react'

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

  const userInitials = profile.full_name
    ? profile.full_name
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U'

  const roleTitle = profile.role === 'managing_director'
    ? 'SUPER ADMIN'
    : profile.role === 'manager'
    ? 'MANAGER'
    : 'TEAM MEMBER'

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Sidebar / Mobile Navigations */}
      <Sidebar profile={{
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role as 'manager' | 'employee' | 'managing_director'
      }} />

      {/* Main content viewport */}
      <main className="flex-1 px-3.5 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-7 max-w-7xl mx-auto w-full pb-28 lg:pb-10 overflow-x-hidden">
        {/* Top Header Bar */}
        <div className="hidden lg:flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1D68FE] text-white flex items-center justify-center font-bold text-xs shadow-xs tracking-tight">
              {userInitials}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-900 leading-none">
                  {profile.full_name || profile.email}
                </span>
                <ChevronDown size={13} className="text-slate-400" />
              </div>
              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block mt-0.5">
                {roleTitle}
              </span>
            </div>
          </div>
        </div>

        {children}
      </main>
    </div>
  )
}
