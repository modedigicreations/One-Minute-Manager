'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  ShieldCheck, 
  AlertTriangle, 
  Send, 
  CheckCircle2, 
  Briefcase, 
  Search, 
  X, 
  Flag,
  Check,
  UserCheck
} from 'lucide-react'
import { flagLagAction, updateLagStatusAction } from '@/app/dashboard/director/actions'
import { formatStaticDate, ClientFeedbackTime } from '@/lib/utils'

export interface DirectorManager {
  id: string
  full_name: string | null
  email: string
  employeeCount: number
  goalsCompleted: number
  goalsInProgress: number
  goalsBehind: number
  praisesCount: number
  correctionsCount: number
}

export interface DirectorGoal {
  id: string
  objective: string
  expected_result: string
  deadline: string
  progress: number
  status: 'not_started' | 'in_progress' | 'completed' | 'behind'
  manager_id: string
  employee_id: string
  manager_name: string
  employee_name: string
}

export interface DirectorLagFlag {
  id: string
  manager_id: string
  employee_id: string | null
  goal_id: string | null
  flag_type: string
  directive: string
  status: 'open' | 'acknowledged' | 'resolved'
  created_at: string
  resolved_at: string | null
  manager_name: string
  employee_name: string | null
}

interface ManagingDirectorDashboardProps {
  directorProfile: {
    full_name: string | null
    email: string
  }
  managers: DirectorManager[]
  allGoals: DirectorGoal[]
  lagFlags: DirectorLagFlag[]
  totalEmployees: number
  totalPraises: number
  totalCorrections: number
}

export default function ManagingDirectorDashboard({
  directorProfile,
  managers,
  allGoals,
  lagFlags,
  totalEmployees,
  totalPraises,
  totalCorrections,
}: ManagingDirectorDashboardProps) {
  // Modal state
  const [directiveModalOpen, setDirectiveModalOpen] = useState(false)
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [selectedGoalId, setSelectedGoalId] = useState('')
  const [flagType, setFlagType] = useState('behind_goal')
  const [directiveText, setDirectiveText] = useState('')
  
  // Search state
  const [managerSearch, setManagerSearch] = useState('')
  const [lagSearch, setLagSearch] = useState('')

  // Submitting state
  const [submitting, setSubmitting] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Managing Director First Name
  const directorFirstName = useMemo(() => {
    if (!directorProfile.full_name) return 'Director'
    return directorProfile.full_name.trim().split(' ')[0]
  }, [directorProfile])

  // Company-wide stats
  const totalGoalsCount = allGoals.length
  const completedGoalsCount = allGoals.filter(g => g.status === 'completed').length
  const inProgressGoalsCount = allGoals.filter(g => g.status === 'in_progress' || g.status === 'not_started').length
  const behindGoalsCount = allGoals.filter(g => g.status === 'behind').length
  const companyCompletionRate = totalGoalsCount > 0 ? Math.round((completedGoalsCount / totalGoalsCount) * 100) : 0
  const openDirectivesCount = lagFlags.filter(f => f.status === 'open').length

  // Filtered behind goals (Lag Radar)
  const behindGoals = useMemo(() => {
    return allGoals.filter(g => {
      if (g.status !== 'behind') return false
      if (lagSearch.trim()) {
        const query = lagSearch.toLowerCase()
        return (
          g.objective.toLowerCase().includes(query) ||
          g.manager_name.toLowerCase().includes(query) ||
          g.employee_name.toLowerCase().includes(query)
        )
      }
      return true
    })
  }, [allGoals, lagSearch])

  // Filtered managers
  const filteredManagers = useMemo(() => {
    if (!managerSearch.trim()) return managers
    const query = managerSearch.toLowerCase()
    return managers.filter(
      m => (m.full_name || '').toLowerCase().includes(query) || m.email.toLowerCase().includes(query)
    )
  }, [managers, managerSearch])

  // Handlers
  async function handleFlagLag(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const res = await flagLagAction(form)

    if (res.success) {
      setDirectiveModalOpen(false)
      setDirectiveText('')
      setSelectedGoalId('')
      window.location.reload()
    } else {
      setError(res.error || 'Failed to dispatch directive.')
      setSubmitting(false)
    }
  }

  function openQuickFlagModal(managerId: string, employeeId?: string, goalId?: string, defaultMsg?: string) {
    setSelectedManagerId(managerId)
    setSelectedEmployeeId(employeeId || '')
    setSelectedGoalId(goalId || '')
    setFlagType(goalId ? 'behind_goal' : 'performance_lag')
    if (defaultMsg) {
      setDirectiveText(defaultMsg)
    }
    setDirectiveModalOpen(true)
  }

  async function handleUpdateFlagStatus(flagId: string, newStatus: 'acknowledged' | 'resolved') {
    setActionInProgress(flagId)
    const res = await updateLagStatusAction(flagId, newStatus)
    if (res.success) {
      window.location.reload()
    } else {
      alert(res.error || 'Failed to update directive status.')
      setActionInProgress(null)
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ============================================================ */}
      {/* 1. EXECUTIVE SUPER ADMIN COCKPIT HEADER */}
      {/* ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-7 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <ShieldCheck size={13} className="text-amber-400" />
              Managing Director Oversight
            </span>
            <span className="text-xs font-mono text-slate-400">Executive Cockpit</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Welcome, {directorFirstName} 🏛️
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Monitor manager accountability, track company-wide performance health, and issue lag directives for rapid operational follow-up.
          </p>
        </div>

        <div className="z-10 shrink-0 flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <Link
            href="/dashboard/assign"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs py-2.5 px-3.5 rounded-xl border border-white/20 transition cursor-pointer"
          >
            <UserCheck size={14} className="text-emerald-400" />
            <span>Staff Allocations</span>
          </Link>
          <Button
            onClick={() => {
              setSelectedManagerId(managers[0]?.id || '')
              setSelectedEmployeeId('')
              setSelectedGoalId('')
              setDirectiveModalOpen(true)
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs py-2.5 px-4 shadow-lg shadow-amber-500/20 border border-amber-400/40"
          >
            <Flag size={14} className="fill-slate-950" />
            <span>Issue Lag Directive</span>
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. COMPANY-WIDE EXECUTIVE KPI METRICS */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Card 1: Active Managers */}
        <Card hover className="relative overflow-hidden border-slate-200/80">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Active Managers
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{managers.length}</span>
                <span className="text-xs font-semibold text-slate-500">leaders</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                {totalEmployees} direct reports
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Briefcase size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Org Completion Rate */}
        <Card hover className="relative overflow-hidden border-slate-200/80">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Company Target Rate
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{companyCompletionRate}%</span>
                <span className="text-xs font-bold text-emerald-600">({completedGoalsCount}/{totalGoalsCount})</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                {inProgressGoalsCount} in progress
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Identified Lags */}
        <Card hover className="relative overflow-hidden border-slate-200/80">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Operational Lags
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl sm:text-3xl font-extrabold ${behindGoalsCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {behindGoalsCount}
                </span>
                {behindGoalsCount > 0 && (
                  <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1 py-0.2 rounded border border-rose-200 uppercase">
                    Needs Action
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                Overdue performance targets
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Open Directives */}
        <Card hover className="relative overflow-hidden border-slate-200/80">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Active Directives
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl sm:text-3xl font-extrabold ${openDirectivesCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {openDirectivesCount}
                </span>
                <span className="text-xs font-bold text-slate-500">open</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                {totalPraises} Praises / {totalCorrections} Adjustments
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Flag size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* 3. MANAGER ACCOUNTABILITY & ACTIVITY MATRIX */}
      {/* ============================================================ */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Briefcase size={18} className="text-indigo-600" />
              <span>Manager Accountability Matrix</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Performance breakdown and team feedback frequency for each manager.
            </CardDescription>
          </div>
          {/* Manager Search */}
          <div className="relative w-full sm:w-64 mt-2 sm:mt-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={managerSearch}
              onChange={(e) => setManagerSearch(e.target.value)}
              placeholder="Search manager..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-slate-100">
          {filteredManagers.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No managers found in the organization.
            </div>
          ) : (
            filteredManagers.map((mgr) => {
              const totalMgrGoals = mgr.goalsCompleted + mgr.goalsInProgress + mgr.goalsBehind
              const completionRate = totalMgrGoals > 0 ? Math.round((mgr.goalsCompleted / totalMgrGoals) * 100) : 0

              return (
                <div key={mgr.id} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 hover:bg-slate-50/60 transition">
                  {/* Left: Manager Identity */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                      {mgr.full_name ? mgr.full_name[0].toUpperCase() : 'M'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{mgr.full_name || 'Anonymous Manager'}</h4>
                      <p className="text-xs text-slate-400 truncate">{mgr.email}</p>
                    </div>
                  </div>

                  {/* Middle: Team & Goal Stats */}
                  <div className="grid grid-cols-3 sm:flex sm:items-center gap-3 sm:gap-6 text-xs pl-13 lg:pl-0">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Team</span>
                      <span className="font-extrabold text-slate-800">{mgr.employeeCount} reports</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Completion</span>
                      <span className="font-extrabold text-slate-800">{completionRate}% ({mgr.goalsCompleted}/{totalMgrGoals})</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Praise Ratio</span>
                      <span className="font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                        {mgr.praisesCount}P / {mgr.correctionsCount}C
                      </span>
                    </div>

                    {mgr.goalsBehind > 0 && (
                      <div className="col-span-3 sm:col-span-1">
                        <span className="text-[10px] uppercase font-bold text-rose-500 block">Lags</span>
                        <span className="font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          {mgr.goalsBehind} behind
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Directive & Assign Staff Actions */}
                  <div className="flex items-center gap-2 pl-13 lg:pl-0">
                    <Link
                      href={`/dashboard/assign`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-2.5 py-1.5 rounded-lg transition cursor-pointer h-8"
                    >
                      <UserCheck size={13} />
                      <span>Assign Staff</span>
                    </Link>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openQuickFlagModal(mgr.id, undefined, undefined, `Hi ${mgr.full_name || 'Manager'}, please review your team's overdue goals and follow up.`)}
                      className="text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 h-8"
                    >
                      <Flag size={12} className="text-amber-600" />
                      <span>Issue Directive</span>
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* 4. COMPANY-WIDE OPERATIONAL LAG RADAR */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
        {/* Left: Operational Lag Radar */}
        <Card className="border-rose-200/80 bg-rose-50/15">
          <CardHeader className="p-4 sm:p-5 border-rose-100 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-rose-800 text-sm sm:text-base">
                <AlertTriangle size={17} />
                <span>Operational Lag Radar</span>
              </CardTitle>
              <CardDescription className="text-rose-700/80 text-xs">
                Goals across the organization that are past their deadline.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-48 mt-2 sm:mt-0">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-400" />
              <input
                type="text"
                value={lagSearch}
                onChange={(e) => setLagSearch(e.target.value)}
                placeholder="Filter lag..."
                className="w-full pl-7 pr-2 py-1 text-xs bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-rose-100/70 max-h-96 overflow-y-auto">
            {behindGoals.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
                  <CheckCircle2 size={20} />
                </div>
                <h5 className="font-bold text-xs text-slate-800">Zero Operational Lags</h5>
                <p className="text-[11px] text-slate-400">All company goals are currently on schedule!</p>
              </div>
            ) : (
              behindGoals.map((goal) => (
                <div key={goal.id} className="p-4 space-y-2 bg-white/70 hover:bg-white transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <h5 className="font-bold text-slate-900 text-xs sm:text-sm">{goal.objective}</h5>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                        <span>Employee: <strong className="text-slate-700">{goal.employee_name}</strong></span>
                        <span>•</span>
                        <span>Manager: <strong className="text-slate-700">{goal.manager_name}</strong></span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 shrink-0 uppercase">
                      Behind
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs pt-1">
                    <span className="text-[11px] text-slate-400 font-semibold">
                      Due: {formatStaticDate(goal.deadline)} ({goal.progress}% done)
                    </span>
                    <Button
                      size="sm"
                      onClick={() => openQuickFlagModal(
                        goal.manager_id, 
                        goal.employee_id, 
                        goal.id, 
                        `Operational Lag: Goal "${goal.objective}" assigned to ${goal.employee_name} is overdue. Please perform an immediate One-Minute Re-Direct.`
                      )}
                      className="text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white h-7 px-2.5 flex items-center gap-1 shadow-xs"
                    >
                      <Flag size={11} />
                      <span>Flag to Manager</span>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right: Dispatched Directives Feed */}
        <Card>
          <CardHeader className="p-4 sm:p-5 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Flag size={17} className="text-amber-600" />
                <span>Executive Directives Feed</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Track manager acknowledgements and resolutions.
              </CardDescription>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {lagFlags.length} issued
            </span>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {lagFlags.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No directives have been issued yet. Use &ldquo;Issue Lag Directive&rdquo; above to nudge a manager.
              </div>
            ) : (
              lagFlags.map((flag) => (
                <div key={flag.id} className="p-4 space-y-2 hover:bg-slate-50/50 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">
                          To: {flag.manager_name}
                        </span>
                        {flag.employee_name && (
                          <span className="text-[11px] text-slate-400">
                            (re: {flag.employee_name})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        <ClientFeedbackTime isoString={flag.created_at} />
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border shrink-0 ${
                      flag.status === 'open' 
                        ? 'bg-rose-50 text-rose-700 border-rose-200' 
                        : flag.status === 'acknowledged'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {flag.status === 'open' && 'Open'}
                      {flag.status === 'acknowledged' && 'Acknowledged'}
                      {flag.status === 'resolved' && 'Resolved'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic leading-relaxed">
                    &ldquo;{flag.directive}&rdquo;
                  </p>

                  {/* Actions for Director */}
                  {flag.status !== 'resolved' && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateFlagStatus(flag.id, 'resolved')}
                        disabled={actionInProgress === flag.id}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                      >
                        <Check size={13} />
                        <span>Mark as Resolved</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* MODAL: ISSUE LAG DIRECTIVE (Bottom-Sheet on Mobile) */}
      {/* ============================================================ */}
      {directiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
            <div className="sm:hidden w-12 h-1 bg-slate-300 rounded-full mx-auto my-2 shrink-0" />

            <div className="bg-slate-950 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold">
                  <Flag size={15} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Issue Lag Directive to Manager</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-normal">Flag an operational delay for immediate leadership follow-up.</p>
                </div>
              </div>
              <button 
                onClick={() => setDirectiveModalOpen(false)} 
                className="text-slate-400 hover:text-white transition cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFlagLag} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {error && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-xs font-bold border border-rose-200">
                  {error}
                </div>
              )}

              {/* Target Manager */}
              <div>
                <label htmlFor="manager_id" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Manager
                </label>
                <select
                  id="manager_id"
                  name="manager_id"
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  <option value="">-- Select Manager --</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lag Type */}
              <div>
                <label htmlFor="flag_type" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Lag Classification
                </label>
                <select
                  id="flag_type"
                  name="flag_type"
                  value={flagType}
                  onChange={(e) => setFlagType(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  <option value="behind_goal">Overdue Goal (Project Deadline Missed)</option>
                  <option value="stale_feedback">Stale Feedback (No Praise/Correction in &gt;7 Days)</option>
                  <option value="performance_lag">Employee Performance Lag</option>
                  <option value="custom">General Executive Directive</option>
                </select>
              </div>

              {/* Directive Message */}
              <div>
                <label htmlFor="directive" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Directive Instructions for Manager
                </label>
                <textarea
                  id="directive"
                  name="directive"
                  required
                  rows={4}
                  value={directiveText}
                  onChange={(e) => setDirectiveText(e.target.value)}
                  placeholder="e.g. John, the client report is 3 days behind schedule. Please conduct a One-Minute Re-Direct with Jane today and confirm completion by tomorrow."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              <input type="hidden" name="employee_id" value={selectedEmployeeId} />
              <input type="hidden" name="goal_id" value={selectedGoalId} />

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 pb-safe">
                <Button type="button" variant="ghost" onClick={() => setDirectiveModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={managers.length === 0} 
                  loading={submitting}
                  className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5"
                >
                  <Send size={14} />
                  <span>Dispatch Directive</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
