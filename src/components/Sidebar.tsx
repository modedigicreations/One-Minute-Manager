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
  X,
  Sparkles
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
    <div className="flex flex-col h-full bg-[#0b1329] text-white p-5 border-r border-slate-800/80 select-none">
      {/* Branding */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
            <Award size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">One-Minute</span>
              <span className="text-[10px] font-bold font-mono tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 uppercase">
                Live
              </span>
            </div>
            <span className="text-xs text-slate-400 font-medium block -mt-0.5">Manager Platform</span>
          </div>
        </div>
      </div>

      {/* Navigation Section */}
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
        Workspace
      </div>
      <nav className="flex-1 space-y-1.5">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent text-emerald-400 border-l-2 border-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon 
                size={18} 
                className={`transition-colors duration-200 ${
                  isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                }`} 
              />
              <span className="flex-1">{link.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Core Principle Inspiration Pill */}
      <div className="my-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
          <Sparkles size={13} />
          <span>One-Minute Rule</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400 italic">
          &ldquo;Catch people doing something right.&rdquo;
        </p>
      </div>

      {/* Bottom Profile Info & Sign Out */}
      <div className="border-t border-slate-800/80 pt-4 space-y-3 shrink-0">
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600/50 flex items-center justify-center font-extrabold text-emerald-400 text-sm shadow-inner">
            {profile.full_name ? profile.full_name[0].toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-200 truncate leading-tight">{profile.full_name || 'User'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase border border-emerald-500/30 bg-emerald-950/40 text-emerald-400">
                {profile.role}
              </span>
              <span className="text-[10px] text-slate-500 truncate max-w-[90px]">{profile.email}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-950/25 border border-transparent hover:border-rose-900/30 transition cursor-pointer"
        >
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Topbar */}
      <header className="lg:hidden h-14 bg-[#0b1329] border-b border-slate-800/80 flex items-center justify-between px-5 text-white sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold">
            <Award size={14} />
          </div>
          <span className="font-extrabold text-sm tracking-tight">One-Minute Manager</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="text-slate-400 hover:text-white p-1">
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
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
