'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Award, 
  LogOut, 
  Users, 
  LayoutDashboard,
  CheckSquare,
  Menu,
  X
} from 'lucide-react'
import { logoutAction } from '@/app/auth/actions'

interface SidebarProps {
  profile: {
    full_name: string | null
    email: string
    role: 'manager' | 'employee'
  }
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const managerLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/team', label: 'My Team', icon: Users },
  ]

  const employeeLinks = [
    { href: '/dashboard', label: 'My Focus', icon: CheckSquare },
  ]

  const links = profile.role === 'manager' ? managerLinks : employeeLinks

  async function handleSignOut() {
    await logoutAction()
    window.location.replace('/login')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-white p-5 border-r border-slate-800">
      {/* Branding */}
      <div className="flex items-center gap-2 mb-8 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
          <Award size={16} />
        </div>
        <span className="font-extrabold text-lg tracking-tight">One-Minute Manager</span>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon size={18} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Profile Info & Sign Out */}
      <div className="border-t border-slate-800 pt-5 space-y-4 shrink-0">
        <div className="flex items-center gap-3 px-1">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
            {profile.full_name ? profile.full_name[0].toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-200 truncate">{profile.full_name || 'User'}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase border border-slate-700 bg-slate-800 text-slate-400 mt-0.5">
              {profile.role}
            </span>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition cursor-pointer"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Topbar */}
      <header className="lg:hidden h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-5 text-white sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
            <Award size={14} />
          </div>
          <span className="font-extrabold text-sm tracking-tight">One-Minute Manager</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="text-slate-400 hover:text-white">
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 w-64 z-50 transform transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-0 -left-64'
        }`}
      >
        {sidebarContent}
      </div>

      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0 z-30">
        {sidebarContent}
      </aside>
    </>
  )
}
