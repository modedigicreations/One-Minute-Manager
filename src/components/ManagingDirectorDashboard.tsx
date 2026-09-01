'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Send, 
  CheckCircle2, 
  Briefcase, 
  Search, 
  X, 
  Flag,
  Check,
  UserCheck,
  Sparkles,
  Clock,
  ChevronRight,
  Users,
  Award,
  Plus
} from 'lucide-react'
import { flagLagAction, updateLagStatusAction } from '@/app/dashboard/director/actions'
import { createGoalAction } from '@/app/dashboard/goals/actions'
import { formatStaticDate, ClientFeedbackTime } from '@/lib/utils'

export interface StaffMember {
  id: string
  full_name: string | null
  email: string
  role: string
  department?: string | null
  job_title?: string | null
  manager_id?: string | null
}

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
    allStaff?: StaffMember[]
  }

  export default function ManagingDirectorDashboard({
    directorProfile,
    managers,
    allGoals,
    lagFlags,
    totalEmployees,
    totalPraises,
    totalCorrections,
    allStaff = [],
  }: ManagingDirectorDashboardProps) {
    // Modal state
    const [directiveModalOpen, setDirectiveModalOpen] = useState(false)
    const [selectedManagerId, setSelectedManagerId] = useState('')
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
    const [selectedGoalId, setSelectedGoalId] = useState('')
    const [flagType, setFlagType] = useState('behind_goal')
    const [directiveText, setDirectiveText] = useState('')
    
    // Goal Creation Modal state (Super Admin Goal Setting)
    const [goalModalOpen, setGoalModalOpen] = useState(false)
    const [targetRoleFilter, setTargetRoleFilter] = useState<'all' | 'employee' | 'manager'>('all')
    const [selectedAssigneeId, setSelectedAssigneeId] = useState('')
    const [selectedSupervisorId, setSelectedSupervisorId] = useState('self')
    const [goalObjective, setGoalObjective] = useState('')
    const [goalExpectedResult, setGoalExpectedResult] = useState('')
    const [goalDeadline, setGoalDeadline] = useState('')
    const [goalProgress, setGoalProgress] = useState(0)
    const [submittingGoal, setSubmittingGoal] = useState(false)
    const [goalError, setGoalError] = useState<string | null>(null)

    // Search state
    const [managerSearch, setManagerSearch] = useState('')

    // Submitting state
    const [submitting, setSubmitting] = useState(false)
    const [actionInProgress, setActionInProgress] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Filter staff based on role pill
    const eligibleStaff = useMemo(() => {
      if (!allStaff) return []
      if (targetRoleFilter === 'employee') {
        return allStaff.filter(s => s.role === 'employee')
      }
      if (targetRoleFilter === 'manager') {
        return allStaff.filter(s => s.role === 'manager')
      }
      return allStaff
    }, [allStaff, targetRoleFilter])

    // Find currently selected assignee for contextual preview
    const selectedAssignee = useMemo(() => {
      return allStaff.find(s => s.id === selectedAssigneeId) || null
    }, [allStaff, selectedAssigneeId])

    // Handler: Super Admin creates a goal assigned to an employee or a manager
    async function handleCreateGoal(e: React.FormEvent) {
      e.preventDefault()
      if (!selectedAssigneeId || !goalObjective.trim() || !goalExpectedResult.trim() || !goalDeadline) {
        setGoalError('Please fill out all required fields (Assignee, Objective, Expected Result, and Deadline).')
        return
      }

      setSubmittingGoal(true)
      setGoalError(null)

      try {
        const form = new FormData()
        form.append('employee_id', selectedAssigneeId)
        form.append('objective', goalObjective.trim())
        form.append('expected_result', goalExpectedResult.trim())
        form.append('deadline', goalDeadline)
        form.append('progress', String(goalProgress || 0))
        if (selectedSupervisorId && selectedSupervisorId !== 'self') {
          form.append('manager_id', selectedSupervisorId)
        }

        const res = await createGoalAction(form)

        if (res.success) {
          setGoalModalOpen(false)
          setSelectedAssigneeId('')
          setGoalObjective('')
          setGoalExpectedResult('')
          setGoalDeadline('')
          setGoalProgress(0)
          window.location.reload()
        } else {
          setSubmittingGoal(false)
          setGoalError(res.error || 'Failed to create goal. Please check database permissions.')
        }
      } catch (err) {
        console.error('Create goal exception:', err)
        setSubmittingGoal(false)
        setGoalError(err instanceof Error ? err.message : 'An unexpected error occurred while saving the goal.')
      }
    }

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
    return allGoals.filter(g => g.status === 'behind')
  }, [allGoals])

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

  const currentHour = new Date().getHours()
  const timeGreeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ============================================================ */}
      {/* 1. EXECUTIVE SUPER ADMIN COCKPIT HERO BANNER */}
      {/* ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 bg-gradient-to-r from-[#0038B8] via-[#0544D0] to-[#0A2680] text-white p-6 sm:p-8 rounded-[28px] border border-blue-900/30 shadow-xl shadow-blue-950/20 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-white/95 backdrop-blur-md border border-white/20">
              <Sparkles size={13} className="text-amber-300" />
              AI Executive Suite
            </span>
            <span className="text-xs font-mono text-blue-200/80">Organization Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white mt-1">
            {timeGreeting}, {directorFirstName} 👋
          </h1>
          <p className="text-white/85 text-xs sm:text-sm max-w-xl leading-relaxed">
            Monitor manager accountability, track company-wide performance health, and issue lag directives for rapid operational follow-up.
          </p>
        </div>

        <div className="z-10 shrink-0 flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
          <Link
            href="/dashboard/assign"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-xl border border-white/25 backdrop-blur-sm transition cursor-pointer"
          >
            <UserCheck size={15} />
            <span>Staff Allocations</span>
          </Link>
          <Button
            onClick={() => {
              setSelectedManagerId(managers[0]?.id || '')
              setSelectedEmployeeId('')
              setSelectedGoalId('')
              setDirectiveModalOpen(true)
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-xl border border-white/25 backdrop-blur-sm transition cursor-pointer"
          >
            <Flag size={15} />
            <span>Issue Directive</span>
          </Button>
          <Button
            onClick={() => {
              setSelectedAssigneeId('')
              setGoalObjective('')
              setGoalExpectedResult('')
              setGoalDeadline('')
              setGoalProgress(0)
              setGoalError(null)
              setGoalModalOpen(true)
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#EA2B42] hover:bg-[#D91B3A] text-white font-bold text-xs sm:text-sm py-3 px-5 rounded-xl shadow-lg shadow-red-500/25 border-0 transition active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>Set Executive Goal</span>
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. COMPANY-WIDE EXECUTIVE KPI METRICS */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Card 1: Active Managers */}
        <Card hover className="relative overflow-hidden border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white rounded-2xl">
          <CardContent className="p-4 sm:p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Active Managers
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{managers.length}</span>
                <span className="text-xs font-semibold text-slate-400">leaders</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {totalEmployees} direct reports
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 shrink-0">
              <Users size={22} />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Org Completion Rate */}
        <Card hover className="relative overflow-hidden border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white rounded-2xl">
          <CardContent className="p-4 sm:p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Target Rate
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{companyCompletionRate}%</span>
                <span className="text-xs font-bold text-purple-600">({completedGoalsCount}/{totalGoalsCount})</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {inProgressGoalsCount} in progress
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100/80 flex items-center justify-center text-purple-600 shrink-0">
              <Award size={22} />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Identified Lags */}
        <Card hover className="relative overflow-hidden border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white rounded-2xl">
          <CardContent className="p-4 sm:p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Operational Lags
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl sm:text-3xl font-black ${behindGoalsCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {behindGoalsCount}
                </span>
                {behindGoalsCount > 0 && (
                  <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase">
                    Needs Action
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                Overdue performance targets
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600 shrink-0">
              <Clock size={22} />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Feedback Shared */}
        <Card hover className="relative overflow-hidden border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white rounded-2xl">
          <CardContent className="p-4 sm:p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Feedback Shared
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {totalPraises + totalCorrections}
                </span>
                <span className="text-xs font-semibold text-slate-400">events</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {totalPraises} Praises • {totalCorrections} Adjustments
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 size={22} />
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
                    <div className="w-10 h-10 rounded-full bg-[#1D68FE] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
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
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-3 py-1.5 rounded-xl transition cursor-pointer h-8"
                    >
                      <UserCheck size={13} />
                      <span>Assign Staff</span>
                    </Link>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openQuickFlagModal(mgr.id, undefined, undefined, `Hi ${mgr.full_name || 'Manager'}, please review your team's overdue goals and follow up.`)}
                      className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 h-8 cursor-pointer"
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
      {/* 4. LOWER TWO-COLUMN SECTION (RECENT GOALS & NEEDS REVIEW) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
        {/* Left: Recent Goals & Activity */}
        <Card className="border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white rounded-2xl">
          <CardHeader className="p-4 sm:p-5 border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                Recent Goals & Activity
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Company goals across all active reporting lines.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                size="sm"
                onClick={() => {
                  setSelectedAssigneeId('')
                  setGoalObjective('')
                  setGoalExpectedResult('')
                  setGoalDeadline('')
                  setGoalProgress(0)
                  setGoalError(null)
                  setGoalModalOpen(true)
                }}
                className="bg-[#EA2B42] hover:bg-[#D91B3A] text-white font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-xs border-0 cursor-pointer"
              >
                <Plus size={13} />
                <span>Set Goal</span>
              </Button>
              <Link 
                href="/dashboard/team" 
                className="text-[#1D68FE] font-bold text-xs hover:underline flex items-center gap-0.5"
              >
                <span>View all</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-100/80 max-h-96 overflow-y-auto">
            {allGoals.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No goals registered in the company yet.
              </div>
            ) : (
              allGoals.slice(0, 5).map((goal) => (
                <div key={goal.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h5 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{goal.objective}</h5>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                      <span>{goal.employee_name}</span>
                      <span>•</span>
                      <span>Mgr: {goal.manager_name}</span>
                      <span>•</span>
                      <span>Due: {formatStaticDate(goal.deadline)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      goal.status === 'completed' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : goal.status === 'behind'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-[#0066FF] text-white'
                    }`}>
                      {goal.status === 'completed' ? 'Completed' : goal.status === 'behind' ? 'Behind' : 'In Progress'}
                    </span>
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right: Needs Review (Directives & Lags) */}
        <Card className="border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white rounded-2xl">
          <CardHeader className="p-4 sm:p-5 border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                Needs Review
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Action items and open directives requiring attention.
              </CardDescription>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {behindGoals.length + openDirectivesCount} items
            </span>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {behindGoals.length === 0 && openDirectivesCount === 0 ? (
              <div className="py-12 text-center space-y-2.5">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-500 mx-auto shadow-xs">
                  <Check size={22} strokeWidth={2.5} />
                </div>
                <p className="text-slate-400 text-sm font-medium">Nothing to review — all clear!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {behindGoals.slice(0, 3).map((goal) => (
                  <div key={goal.id} className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/20 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{goal.objective}</p>
                      <p className="text-[11px] text-slate-400">{goal.employee_name} • Overdue</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => openQuickFlagModal(goal.manager_id, goal.employee_id, goal.id, `Operational Lag: Goal "${goal.objective}" is overdue.`)}
                      className="text-[10px] font-bold bg-[#EA2B42] hover:bg-[#D91B3A] text-white h-7 px-2.5 rounded-lg border-0 cursor-pointer"
                    >
                      <Flag size={11} className="mr-1" />
                      Flag
                    </Button>
                  </div>
                ))}

                {lagFlags.filter(f => f.status === 'open').map((flag) => (
                  <div key={flag.id} className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/20 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">Directive to {flag.manager_name}</p>
                      <p className="text-[11px] text-amber-700 italic truncate">&ldquo;{flag.directive}&rdquo;</p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        <ClientFeedbackTime isoString={flag.created_at} />
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdateFlagStatus(flag.id, 'resolved')}
                      disabled={actionInProgress === flag.id}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200 cursor-pointer shrink-0"
                    >
                      Resolve
                    </button>
                  </div>
                ))}
              </div>
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

      {/* ============================================================ */}
      {/* MODAL: SET EXECUTIVE GOAL (Assign to Employee or Manager) */}
      {/* ============================================================ */}
      {goalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
            <div className="sm:hidden w-12 h-1 bg-slate-300 rounded-full mx-auto my-2 shrink-0" />

            {/* Modal Header */}
            <div className="bg-[#0B111E] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EA2B42] flex items-center justify-center text-white font-bold shadow-md shadow-red-500/20">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">Set Executive One-Minute Goal</h3>
                  <p className="text-[11px] text-slate-400 font-normal">Assign a high-impact target to any employee or manager.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setGoalModalOpen(false)} 
                className="text-slate-400 hover:text-white transition cursor-pointer p-1.5 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form with Scrollable Body and Sticky Footer */}
            <form onSubmit={handleCreateGoal} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                {goalError && (
                  <div className="bg-rose-50 text-rose-700 p-3.5 rounded-xl text-xs font-bold border border-rose-200 flex items-center justify-between">
                    <span>{goalError}</span>
                    <button type="button" onClick={() => setGoalError(null)} className="text-rose-400 hover:text-rose-700">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Role filter pills */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select Assignee Type
                  </label>
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTargetRoleFilter('all')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                        targetRoleFilter === 'all' 
                          ? 'bg-white text-slate-900 shadow-xs' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      All Staff ({allStaff.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetRoleFilter('employee')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                        targetRoleFilter === 'employee' 
                          ? 'bg-white text-slate-900 shadow-xs' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Employees ({allStaff.filter(s => s.role === 'employee').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetRoleFilter('manager')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                        targetRoleFilter === 'manager' 
                          ? 'bg-white text-slate-900 shadow-xs' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Managers ({allStaff.filter(s => s.role === 'manager').length})
                    </button>
                  </div>
                </div>

                {/* Assignee dropdown */}
                <div className="space-y-1.5">
                  <label htmlFor="assignee_id" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Assignee (Staff Member or Leader) <span className="text-rose-500">*</span>
                  </label>
                  {eligibleStaff.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                      No staff members found matching this category.
                    </div>
                  ) : (
                    <select
                      id="assignee_id"
                      value={selectedAssigneeId}
                      onChange={(e) => setSelectedAssigneeId(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                    >
                      <option value="">-- Choose employee or manager --</option>
                      {eligibleStaff.map(staff => (
                        <option key={staff.id} value={staff.id}>
                          {staff.role === 'manager' ? '👑 [Manager]' : '👤 [Employee]'} {staff.full_name || staff.email} ({staff.department || 'General'})
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedAssignee && (
                    <div className="flex items-center gap-2 p-2 px-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600">
                      <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase ${
                        selectedAssignee.role === 'manager' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedAssignee.role === 'manager' ? 'Manager' : 'Employee'}
                      </span>
                      <span className="font-semibold text-slate-900">{selectedAssignee.full_name || 'Anonymous'}</span>
                      <span>•</span>
                      <span>{selectedAssignee.email}</span>
                    </div>
                  )}
                </div>

                {/* Supervising Manager delegation (if assigning to employee) */}
                {selectedAssignee?.role === 'employee' && managers.length > 0 && (
                  <div className="space-y-1.5">
                    <label htmlFor="supervisor_id" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Supervising Manager
                    </label>
                    <select
                      id="supervisor_id"
                      value={selectedSupervisorId}
                      onChange={(e) => setSelectedSupervisorId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                    >
                      <option value="self">Super Admin Direct Oversight (You)</option>
                      {managers.map(m => (
                        <option key={m.id} value={m.id}>
                          Delegate to: {m.full_name || m.email}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400">
                      Choose whether you oversee this target directly or delegate supervisory follow-up to a manager.
                    </p>
                  </div>
                )}

                {/* Goal Objective */}
                <div className="space-y-1.5">
                  <label htmlFor="objective" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Goal Objective (Clear &amp; Specific) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="objective"
                    type="text"
                    required
                    value={goalObjective}
                    onChange={(e) => setGoalObjective(e.target.value)}
                    placeholder="e.g. Deliver Q3 cross-department performance roadmap"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  />
                </div>

                {/* Expected Result */}
                <div className="space-y-1.5">
                  <label htmlFor="expected_result" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Expected Result / Performance Standard <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="expected_result"
                    required
                    rows={3}
                    value={goalExpectedResult}
                    onChange={(e) => setGoalExpectedResult(e.target.value)}
                    placeholder="Describe quantifiable standards under 250 words that can be reviewed in 60 seconds."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white leading-relaxed"
                  />
                </div>

                {/* Target Deadline */}
                <div className="space-y-1.5">
                  <label htmlFor="deadline" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Target Deadline <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="deadline"
                    type="date"
                    required
                    value={goalDeadline}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  />
                </div>

                {/* Progress Slider (Optional) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="progress" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Initial Progress
                    </label>
                    <span className="text-xs font-bold text-slate-700">{goalProgress}%</span>
                  </div>
                  <input
                    id="progress"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={goalProgress}
                    onChange={(e) => setGoalProgress(Number(e.target.value))}
                    className="w-full accent-[#EA2B42]"
                  />
                </div>
              </div>

              {/* Error Banner right above footer if error exists */}
              {goalError && (
                <div className="px-5 py-2.5 bg-rose-50 border-t border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between shrink-0">
                  <span className="truncate">⚠️ {goalError}</span>
                  <button type="button" onClick={() => setGoalError(null)} className="text-rose-400 hover:text-rose-700 ml-2">
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Sticky Fixed Footer */}
              <div className="p-4 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 gap-3">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setGoalModalOpen(false)}
                  disabled={submittingGoal}
                  className="cursor-pointer text-slate-600 hover:text-slate-900 text-xs sm:text-sm font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={!selectedAssigneeId || submittingGoal} 
                  loading={submittingGoal}
                  className="bg-[#EA2B42] hover:bg-[#D91B3A] text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-red-500/25 border-0 cursor-pointer"
                >
                  {submittingGoal ? 'Assigning Goal...' : 'Assign One-Minute Goal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
