'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LogOut, 
  Users, 
  LayoutDashboard,
  CheckSquare,
  Menu,
  X,
  Sparkles,
  User,
  ShieldCheck,
  UserCheck,
  Briefcase
} from 'lucide-react'
import { logoutAction, switchUserRoleAction } from '@/app/auth/actions'
import NotificationBell from '@/components/NotificationBell'

interface SidebarProps {
  profile: {
    full_name: string | null
    email: string
    role: 'manager' | 'employee' | 'managing_director'
  }
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const directorLinks = [
    { href: '/dashboard', label: 'Executive Cockpit', icon: LayoutDashboard },
    { href: '/dashboard/assign', label: 'Staff Allocation', icon: UserCheck },
    { href: '/dashboard/team', label: 'All Teams', icon: Users },
  ]

  const managerLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/team', label: 'My Team', icon: Users },
  ]

  const employeeLinks = [
    { href: '/dashboard', label: 'My Focus', icon: CheckSquare },
  ]

  const links = profile.role === 'managing_director'
    ? directorLinks
    : profile.role === 'manager'
    ? managerLinks
    : employeeLinks

  const [switchingRole, setSwitchingRole] = useState(false)

  async function handleToggleRole() {
    setSwitchingRole(true)
    const targetRole = profile.role === 'managing_director' ? 'manager' : 'managing_director'
    const res = await switchUserRoleAction(targetRole)
    if (res.success) {
      window.location.replace('/dashboard')
    } else {
      alert(res.error || 'Failed to switch role.')
      setSwitchingRole(false)
    }
  }

  async function handleSignOut() {
    await logoutAction()
    window.location.replace('/login')
  }

  const userInitial = profile.full_name ? profile.full_name[0].toUpperCase() : 'U'

  return (
    <>
      {/* ============================================================ */}
      {/* 1. MOBILE STICKY TOP HEADER */}
      {/* ============================================================ */}
      <header className="lg:hidden h-14 bg-[#0B111E]/95 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between px-4 text-white sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF2E4D] to-[#EA2B42] flex items-center justify-center text-white font-black text-sm shadow-md shadow-red-500/25">
            M
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-tight text-white">One-Minute</span>
            <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 uppercase">
              Live
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell align="header" />
          <button 
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 p-1.5 pl-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            aria-label="Open navigation menu"
          >
            <div className="w-6 h-6 rounded-lg bg-[#1D68FE] text-white flex items-center justify-center text-xs font-bold">
              {userInitial}
            </div>
            <Menu size={16} className="text-slate-400" />
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. MOBILE SLIDE-OVER DRAWER & BACKDROP */}
      {/* ============================================================ */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-xs z-50 transition-opacity animate-in fade-in duration-200"
        />
      )}

      <div
        className={`lg:hidden fixed inset-y-0 left-0 w-[85vw] max-w-xs bg-[#0B111E] z-50 transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col border-r border-slate-800/80 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header with Close Button */}
        <div className="p-5 pb-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF2E4D] to-[#EA2B42] flex items-center justify-center text-white font-black text-sm shadow-md shadow-red-500/25">
              M
            </div>
            <div>
              <span className="font-extrabold text-sm text-white block">One-Minute</span>
              <span className="text-[10px] text-slate-400 font-medium block -mt-1">Manager Platform</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Close menu"
          >
            <X size={17} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* User Profile Card */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1D68FE] text-white flex items-center justify-center font-extrabold text-sm shadow-sm">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{profile.full_name || 'User'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {profile.role === 'managing_director' ? (
                  <span className="inline-flex px-1.5 py-0.2 rounded-full text-[9px] font-extrabold tracking-wider uppercase border border-amber-400/40 bg-amber-950/40 text-amber-300">
                    SUPER ADMIN
                  </span>
                ) : profile.role === 'manager' ? (
                  <span className="inline-flex px-1.5 py-0.2 rounded-full text-[9px] font-extrabold tracking-wider uppercase border border-indigo-500/30 bg-indigo-950/40 text-indigo-400">
                    Manager
                  </span>
                ) : (
                  <span className="inline-flex px-1.5 py-0.2 rounded-full text-[9px] font-extrabold tracking-wider uppercase border border-emerald-500/30 bg-emerald-950/40 text-emerald-400">
                    Employee
                  </span>
                )}
                <span className="text-[10px] text-slate-400 truncate max-w-[110px]">{profile.email}</span>
              </div>
            </div>
          </div>

          {profile.role !== 'employee' && (
            <button
              type="button"
              onClick={handleToggleRole}
              disabled={switchingRole}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition cursor-pointer"
            >
              <ShieldCheck size={13} />
              <span>
                {switchingRole
                  ? 'Updating role...'
                  : profile.role === 'managing_director'
                  ? 'Switch to Manager View'
                  : '⚡ Upgrade to Managing Director'}
              </span>
            </button>
          )}

          {/* Navigation Links */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 flex items-center gap-1.5">
              <Briefcase size={12} className="text-slate-500" />
              <span>Workspace</span>
            </div>
            {links.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-[#EA2B42] text-white shadow-md shadow-red-500/25 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </div>

          {/* One-Minute Principle Pill */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
              <Sparkles size={13} />
              <span>One-Minute Rule</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400 italic">
              &ldquo;Catch people doing something right.&rdquo;
            </p>
          </div>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-950/25 border border-transparent hover:border-rose-900/30 transition cursor-pointer"
          >
            <LogOut size={15} />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. MOBILE NATIVE BOTTOM NAVIGATION TAB BAR */}
      {/* ============================================================ */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0B111E]/95 backdrop-blur-xl border-t border-slate-800 pb-safe">
        <nav className="flex items-center justify-around h-16 px-2">
          {links.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
                  isActive ? 'text-[#EA2B42]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-1 rounded-lg ${isActive ? 'bg-red-500/15' : ''}`}>
                  <Icon size={20} />
                </div>
                <span className="text-[10px] font-semibold mt-0.5">{link.label}</span>
              </Link>
            )
          })}

          {/* Account / More tab */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <div className="p-1">
              <User size={20} />
            </div>
            <span className="text-[10px] font-semibold mt-0.5">Account</span>
          </button>
        </nav>
      </div>

      {/* ============================================================ */}
      {/* 4. PERMANENT DESKTOP SIDEBAR */}
      {/* ============================================================ */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0 z-30">
        <div className="flex flex-col h-full bg-[#0B111E] text-white p-5 border-r border-slate-800/80 select-none">
          {/* Branding */}
          <div className="flex items-center justify-between mb-8 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF2E4D] to-[#EA2B42] flex items-center justify-center text-white font-black text-base shadow-md shadow-red-500/25 tracking-tighter">
                M
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight text-white">One-Minute</span>
                </div>
                <span className="text-xs text-slate-400 font-medium block -mt-0.5">Manager Platform</span>
              </div>
            </div>
            <NotificationBell align="sidebar" />
          </div>

          {/* Navigation Section */}
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 flex items-center gap-1.5">
            <Briefcase size={12} className="text-slate-500" />
            <span>Workspace</span>
          </div>
          <nav className="flex-1 space-y-1.5">
            {links.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-[#EA2B42] text-white shadow-md shadow-red-500/25 font-bold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 font-medium'
                  }`}
                >
                  <Icon 
                    size={18} 
                    className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'} 
                  />
                  <span className="flex-1">{link.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* One-Minute Principle Pill */}
          <div className="my-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
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
              <div className="w-9 h-9 rounded-full bg-[#1D68FE] text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-100 truncate leading-tight">{profile.full_name || 'User'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {profile.role === 'managing_director' ? (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-extrabold tracking-wider uppercase border border-amber-400/40 bg-amber-950/40 text-amber-300">
                      SUPER ADMIN
                    </span>
                  ) : profile.role === 'manager' ? (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-extrabold tracking-wider uppercase border border-indigo-500/30 bg-indigo-950/40 text-indigo-400">
                      Manager
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-extrabold tracking-wider uppercase border border-emerald-500/30 bg-emerald-950/40 text-emerald-400">
                      Employee
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 truncate max-w-[90px]">{profile.email}</span>
                </div>
              </div>
            </div>

            {profile.role !== 'employee' && (
              <button
                type="button"
                onClick={handleToggleRole}
                disabled={switchingRole}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-bold transition cursor-pointer"
              >
                <ShieldCheck size={12} />
                <span>
                  {switchingRole
                    ? 'Updating role...'
                    : profile.role === 'managing_director'
                    ? 'Switch to Manager View'
                    : '⚡ Upgrade to Managing Director'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-950/25 border border-transparent hover:border-rose-900/30 transition cursor-pointer"
            >
              <LogOut size={15} />
              <span>Sign out</span>
            </button>

            <div className="pt-2 text-[9px] font-mono font-bold tracking-widest text-slate-600 uppercase text-center">
              INTERNAL USE ONLY
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
