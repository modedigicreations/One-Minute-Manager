'use client'

import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { GoalStatusBadge } from '@/components/ui/Badge'
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Award, 
  Compass, 
  Users, 
  TrendingUp, 
  MessageSquare,
  ArrowRight,
  Search,
  Copy,
  Check,
  Sparkles,
  Zap,
  UserCheck,
  Send,
  X
} from 'lucide-react'
import { createGoalAction } from '@/app/dashboard/goals/actions'
import { createFeedbackAction } from '@/app/dashboard/feedback/actions'
import { formatStaticDate, ClientFeedbackTime } from '@/lib/utils'

interface Employee {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
}

interface Goal {
  id: string
  objective: string
  expected_result: string
  deadline: string
  progress: number
  status: 'not_started' | 'in_progress' | 'completed' | 'behind'
  employee_id: string
  profiles: {
    full_name: string | null
  }
}

interface Feedback {
  id: string
  type: 'praising' | 'correction'
  message: string
  created_at: string
  profiles: {
    full_name: string | null
    email: string
  }
}

interface ManagerDashboardProps {
  managerProfile?: {
    full_name: string | null
    email: string
  }
  employees: Employee[]
  goals: Goal[]
  feedbacks: Feedback[]
  stats: {
    completed: number
    inProgress: number
    behind: number
    totalPraises?: number
    totalCorrections?: number
  }
}

export default function ManagerDashboard({ 
  managerProfile, 
  employees, 
  goals, 
  feedbacks, 
  stats 
}: ManagerDashboardProps) {
  // Modal states
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  
  // Feedback specific states
  const [feedbackType, setFeedbackType] = useState<'praising' | 'correction'>('praising')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [selectedGoalId, setSelectedGoalId] = useState('')

  // Search and Filter states for goals
  const [goalSearch, setGoalSearch] = useState('')
  const [goalFilter, setGoalFilter] = useState<'all' | 'in_progress' | 'completed' | 'behind'>('all')

  // Copy email state
  const [copiedEmail, setCopiedEmail] = useState(false)

  // Loading states
  const [submittingGoal, setSubmittingGoal] = useState(false)
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extract manager first name
  const managerFirstName = useMemo(() => {
    if (!managerProfile?.full_name) return 'Manager'
    return managerProfile.full_name.trim().split(' ')[0]
  }, [managerProfile])

  // Filtered goals
  const filteredGoals = useMemo(() => {
    return goals.filter(g => {
      // Status filter
      if (goalFilter === 'in_progress' && g.status !== 'in_progress' && g.status !== 'not_started') return false
      if (goalFilter === 'completed' && g.status !== 'completed') return false
      if (goalFilter === 'behind' && g.status !== 'behind') return false

      // Search query
      if (goalSearch.trim()) {
        const query = goalSearch.toLowerCase()
        const objMatch = g.objective.toLowerCase().includes(query)
        const expMatch = g.expected_result.toLowerCase().includes(query)
        const empMatch = (g.profiles?.full_name || '').toLowerCase().includes(query)
        return objMatch || expMatch || empMatch
      }

      return true
    })
  }, [goals, goalFilter, goalSearch])

  // Handlers
  async function handleCreateGoal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmittingGoal(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const res = await createGoalAction(form)

    if (res.success) {
      setGoalModalOpen(false)
      window.location.reload()
    } else {
      setError(res.error || 'Failed to create goal')
      setSubmittingGoal(false)
    }
  }

  async function handleCreateFeedback(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmittingFeedback(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    form.append('type', feedbackType)
    const res = await createFeedbackAction(form)

    if (res.success) {
      setFeedbackModalOpen(false)
      window.location.reload()
    } else {
      setError(res.error || 'Failed to submit feedback')
      setSubmittingFeedback(false)
    }
  }

  function handleCopyEmail() {
    if (!managerProfile?.email) return
    navigator.clipboard.writeText(managerProfile.email)
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  // Find employees requiring attention
  const attentionEmployees = employees.filter(emp => {
    const hasBehindGoal = goals.some(g => g.employee_id === emp.id && g.status === 'behind')
    const hasNoRecentFeedback = !feedbacks.some(f => f.profiles.email === emp.email)
    return hasBehindGoal || hasNoRecentFeedback
  })

  const totalPraises = stats.totalPraises ?? feedbacks.filter(f => f.type === 'praising').length
  const totalCorrections = stats.totalCorrections ?? feedbacks.filter(f => f.type === 'correction').length
  const completionRate = goals.length > 0 ? Math.round((stats.completed / goals.length) * 100) : 0

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ============================================================ */}
      {/* 1. WELCOME & COMMAND HEADER */}
      {/* ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/90 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.03)]">
        <div>
          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome, {managerFirstName} 👋
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Focus on clear expectations, immediate praising, and early adjustments.
          </p>
        </div>

        {/* Action Buttons (Mobile Grid, Desktop Row) */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto pt-1 md:pt-0">
          <Button 
            variant="secondary"
            onClick={() => setInviteModalOpen(true)}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold py-2 h-10 sm:h-9"
          >
            <Users size={14} className="text-slate-500" />
            <span>Invite Team</span>
          </Button>

          <Button 
            variant="secondary"
            onClick={() => {
              setSelectedEmployeeId(employees[0]?.id || '')
              setFeedbackType('praising')
              setFeedbackModalOpen(true)
            }}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 border border-emerald-200/70 py-2 h-10 sm:h-9"
          >
            <Award size={14} className="text-emerald-600" />
            <span>Log Feedback</span>
          </Button>

          <Button 
            onClick={() => setGoalModalOpen(true)} 
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white py-2 h-10 sm:h-9 shadow-sm"
          >
            <Plus size={14} />
            <span>Set One-Minute Goal</span>
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. EXECUTIVE METRICS ROW (2x2 on Mobile, 4-col on Desktop) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        {/* Card 1: Goals Completed */}
        <Card hover className="relative overflow-hidden border-slate-200/80">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Completed
              </span>
              <div className="flex items-baseline gap-1 sm:gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.completed}</span>
                {goals.length > 0 && (
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-600">({completionRate}%)</span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">Achieved targets</p>
            </div>
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50/80 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 size={18} className="sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: In Progress */}
        <Card hover className="relative overflow-hidden border-slate-200/80">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-indigo-500" />
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                In Progress
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.inProgress}</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">Active focus</p>
            </div>
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-sky-50/80 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
              <Clock size={18} className="sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Falling Behind */}
        <Card hover className="relative overflow-hidden border-slate-200/80">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400 to-amber-500" />
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Behind
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl sm:text-3xl font-extrabold ${stats.behind > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {stats.behind}
                </span>
                {stats.behind > 0 && (
                  <span className="text-[8px] sm:text-[10px] font-bold text-rose-600 uppercase bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                    Alert
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">Re-Directs needed</p>
            </div>
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-50/80 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle size={18} className="sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Feedback Velocity */}
        <Card hover className="relative overflow-hidden border-slate-200/80">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-400 to-fuchsia-500" />
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Feedback
              </span>
              <div className="flex items-baseline gap-1 sm:gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{feedbacks.length}</span>
                <span className="text-[9px] sm:text-[10px] font-bold text-violet-700 bg-violet-50 px-1 py-0.2 rounded border border-violet-200">
                  {totalPraises}P/{totalCorrections}C
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">4:1 Target ratio</p>
            </div>
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-violet-50/80 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
              <Award size={18} className="sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* 3. ONBOARDING WIDGET (Shown when team has 0 members) */}
      {/* ============================================================ */}
      {employees.length === 0 && (
        <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-lg shadow-slate-900/10 border border-slate-700/60 relative overflow-hidden">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] sm:text-xs font-bold font-mono tracking-wider text-emerald-400 uppercase">
                  Quick Start: Connect Your Employees
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight">
                Your Management Workspace is Ready!
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Have your team members register on this app and select you as their manager to start setting 60-second goals.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-3.5 sm:p-4 rounded-xl border border-white/15 shrink-0 space-y-2.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                Your Manager Identification:
              </span>
              <div className="flex items-center justify-between gap-2 bg-slate-950/60 px-3 py-2 rounded-lg border border-white/10">
                <span className="text-xs font-mono text-emerald-300 truncate font-semibold">
                  {managerProfile?.email || 'Your Registered Email'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="text-slate-400 hover:text-white transition cursor-pointer p-1 shrink-0"
                  title="Copy email"
                >
                  {copiedEmail ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setInviteModalOpen(true)}
                className="w-full text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <span>View Onboarding Steps</span>
                <ArrowRight size={13} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. MAIN DASHBOARD CONTENT (2 COLUMNS) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column (Span 2): Team & Performance Goals */}
        <div className="xl:col-span-2 space-y-6 sm:space-y-8">
          
          {/* Card: Team Members */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users size={18} className="text-slate-500" />
                  <span>My Team Members</span>
                </CardTitle>
                <CardDescription className="text-xs">Direct reports and rapid feedback loops.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 rounded-full">
                  {employees.length} {employees.length === 1 ? 'member' : 'members'}
                </span>
                {employees.length === 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setInviteModalOpen(true)}
                    className="text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-1 p-1 sm:px-2"
                  >
                    <Plus size={13} />
                    <span>How to add</span>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {employees.length === 0 ? (
                <div className="p-6 sm:p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400 mx-auto">
                    <UserCheck size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">No employees connected yet</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Employees connect to your dashboard by selecting <strong>{managerProfile?.full_name || 'your name'}</strong> upon registration.
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => setInviteModalOpen(true)}
                    className="text-xs inline-flex items-center gap-1.5"
                  >
                    <Copy size={13} />
                    <span>Copy Instructions for Team</span>
                  </Button>
                </div>
              ) : (
                employees.map((emp) => {
                  const empGoals = goals.filter(g => g.employee_id === emp.id)
                  const behindCount = empGoals.filter(g => g.status === 'behind').length
                  const completedCount = empGoals.filter(g => g.status === 'completed').length

                  return (
                    <div key={emp.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 hover:bg-slate-50/50 transition">
                      {/* Left: Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-base shadow-sm shrink-0">
                          {emp.full_name ? emp.full_name[0].toUpperCase() : 'E'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{emp.full_name || 'Anonymous Employee'}</h4>
                          <p className="text-xs text-slate-400 truncate">{emp.email}</p>
                        </div>
                      </div>

                      {/* Middle: Active Goals Summary */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 pl-13 sm:pl-0">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700 text-[11px]">
                          {empGoals.length} {empGoals.length === 1 ? 'goal' : 'goals'}
                        </span>
                        {completedCount > 0 && (
                          <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded text-[11px]">
                            {completedCount} met
                          </span>
                        )}
                        {behindCount > 0 && (
                          <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200/60 px-1.5 py-0.5 rounded text-[11px]">
                            {behindCount} behind
                          </span>
                        )}
                      </div>

                      {/* Right: Quick actions */}
                      <div className="flex items-center gap-2 pl-13 sm:pl-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployeeId(emp.id)
                            setFeedbackType('praising')
                            setFeedbackModalOpen(true)
                          }}
                          className="flex-1 sm:flex-none text-emerald-700 hover:bg-emerald-50 border border-emerald-200/50 flex items-center justify-center gap-1 text-xs py-1.5 h-8"
                        >
                          <Award size={13} />
                          Praise
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployeeId(emp.id)
                            setFeedbackType('correction')
                            setFeedbackModalOpen(true)
                          }}
                          className="flex-1 sm:flex-none text-rose-700 hover:bg-rose-50 border border-rose-200/50 flex items-center justify-center gap-1 text-xs py-1.5 h-8"
                        >
                          <Compass size={13} />
                          Re-Direct
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Card: Active Performance Goals */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <TrendingUp size={18} className="text-slate-500" />
                  <span>One-Minute Performance Goals</span>
                </CardTitle>
                <CardDescription className="text-xs">Concise targets agreed upon with team members.</CardDescription>
              </div>
              <Button 
                size="sm" 
                onClick={() => setGoalModalOpen(true)}
                className="flex items-center gap-1 text-xs bg-slate-900 hover:bg-slate-800 text-white shrink-0"
              >
                <Plus size={13} />
                <span>New Goal</span>
              </Button>
            </CardHeader>

            {/* Filter & Search Bar with horizontal touch scroll */}
            {goals.length > 0 && (
              <div className="px-4 sm:px-6 py-2.5 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Search */}
                <div className="relative w-full sm:max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={goalSearch}
                    onChange={(e) => setGoalSearch(e.target.value)}
                    placeholder="Search goals or team..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  {goalSearch && (
                    <button 
                      onClick={() => setGoalSearch('')} 
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Filter Tabs (Horizontal Scroll on Mobile) */}
                <div className="flex items-center gap-1 text-xs overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                  <button
                    onClick={() => setGoalFilter('all')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 ${
                      goalFilter === 'all' 
                        ? 'bg-slate-900 text-white shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    All ({goals.length})
                  </button>
                  <button
                    onClick={() => setGoalFilter('in_progress')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 ${
                      goalFilter === 'in_progress' 
                        ? 'bg-slate-900 text-white shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Active ({stats.inProgress})
                  </button>
                  <button
                    onClick={() => setGoalFilter('completed')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 ${
                      goalFilter === 'completed' 
                        ? 'bg-slate-900 text-white shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Done ({stats.completed})
                  </button>
                  {stats.behind > 0 && (
                    <button
                      onClick={() => setGoalFilter('behind')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 ${
                        goalFilter === 'behind' 
                          ? 'bg-rose-600 text-white shadow-xs' 
                          : 'text-rose-600 hover:bg-rose-50'
                      }`}
                    >
                      Behind ({stats.behind})
                    </button>
                  )}
                </div>
              </div>
            )}

            <CardContent className="p-0 divide-y divide-slate-100">
              {goals.length === 0 ? (
                /* One-Minute Goal Blueprint Empty State */
                <div className="p-6 sm:p-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
                    <Sparkles size={22} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-base">The One-Minute Goal Blueprint</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Agree on goals in under 250 words each so both you and your employee can review progress in less than a minute.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-xl mx-auto pt-2 text-left">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                      <div className="text-[10px] font-bold text-indigo-600 uppercase">Step 1</div>
                      <div className="font-bold text-xs text-slate-800">Clear Agreement</div>
                      <p className="text-[11px] text-slate-500 leading-snug">Align on what good looks like.</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                      <div className="text-[10px] font-bold text-emerald-600 uppercase">Step 2</div>
                      <div className="font-bold text-xs text-slate-800">Expected Result</div>
                      <p className="text-[11px] text-slate-500 leading-snug">Quantifiable standards.</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                      <div className="text-[10px] font-bold text-sky-600 uppercase">Step 3</div>
                      <div className="font-bold text-xs text-slate-800">60-Sec Check-in</div>
                      <p className="text-[11px] text-slate-500 leading-snug">Fast progress verification.</p>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setGoalModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white mt-2"
                  >
                    <Plus size={14} />
                    <span>Create First Goal in 60 Seconds</span>
                  </Button>
                </div>
              ) : filteredGoals.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No goals match the filter query.
                </div>
              ) : (
                filteredGoals.map((goal) => (
                  <div key={goal.id} className="p-4 sm:p-5 space-y-2.5 hover:bg-slate-50/50 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">{goal.objective}</h4>
                        <p className="text-xs text-slate-400 truncate">
                          Assigned to: <strong className="text-slate-700 font-semibold">{goal.profiles?.full_name || 'Anonymous'}</strong>
                        </p>
                      </div>
                      <GoalStatusBadge status={goal.status} />
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed">
                      <strong className="text-slate-700">Expected Result:</strong> {goal.expected_result}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-semibold text-slate-400 pt-1">
                      <span className="text-slate-500 text-[11px]">Deadline: {formatStaticDate(goal.deadline)}</span>
                      
                      <div className="flex items-center gap-2.5 w-full sm:w-1/2">
                        <span className="text-xs font-bold text-slate-700 shrink-0 w-8">{goal.progress}%</span>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              goal.status === 'completed' 
                                ? 'bg-emerald-500' 
                                : goal.status === 'behind' 
                                ? 'bg-rose-500' 
                                : 'bg-gradient-to-r from-slate-800 to-indigo-700'
                            }`}
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Attention Alerts & Feedback Feed */}
        <div className="space-y-6">
          
          {/* Attention Alerts Box */}
          {attentionEmployees.length > 0 && (
            <Card className="border-rose-200/80 bg-rose-50/25">
              <CardHeader className="p-4 border-rose-100 pb-2.5">
                <div>
                  <CardTitle className="flex items-center gap-2 text-rose-800 text-sm">
                    <AlertTriangle size={16} />
                    <span>Requires Attention</span>
                  </CardTitle>
                  <CardDescription className="text-rose-700/80 text-[11px]">
                    Goals falling behind or missing recent feedback.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-1">
                {attentionEmployees.map((emp) => {
                  const isBehind = goals.some(g => g.employee_id === emp.id && g.status === 'behind')
                  return (
                    <div 
                      key={emp.id} 
                      className="flex items-center justify-between gap-2 p-2.5 bg-white border border-rose-200/60 rounded-xl shadow-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-xs text-slate-900 truncate">{emp.full_name}</h5>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase mt-0.5 inline-block ${
                          isBehind 
                            ? 'text-rose-700 bg-rose-50 border border-rose-200' 
                            : 'text-amber-700 bg-amber-50 border border-amber-200'
                        }`}>
                          {isBehind ? 'Behind Schedule' : 'No Feedback'}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedEmployeeId(emp.id)
                          setFeedbackType(isBehind ? 'correction' : 'praising')
                          setFeedbackModalOpen(true)
                        }}
                        className="text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg shrink-0 h-8"
                      >
                        <ArrowRight size={14} />
                      </Button>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Recent Feedbacks Timeline */}
          <Card>
            <CardHeader className="p-4 pb-2.5">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <MessageSquare size={17} className="text-slate-500" />
                  <span>Recent Feedbacks</span>
                </CardTitle>
                <CardDescription className="text-xs">Praisings & adjustments timeline.</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedEmployeeId(employees[0]?.id || '')
                  setFeedbackType('praising')
                  setFeedbackModalOpen(true)
                }}
                className="text-xs text-emerald-700 hover:bg-emerald-50 p-1"
              >
                <Plus size={14} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3.5 p-4 pt-1">
              {feedbacks.length === 0 ? (
                <div className="text-center space-y-2.5 py-5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">No feedbacks logged yet</h5>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                      Catch your employees doing something right! Share immediate praise today.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSelectedEmployeeId(employees[0]?.id || '')
                      setFeedbackType('praising')
                      setFeedbackModalOpen(true)
                    }}
                    className="text-xs text-emerald-700 font-bold"
                  >
                    <Award size={13} className="mr-1" />
                    Log First Praise
                  </Button>
                </div>
              ) : (
                feedbacks.map((fb) => (
                  <div key={fb.id} className="flex gap-2.5 text-left">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 shadow-xs ${
                      fb.type === 'praising' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200/80' 
                        : 'bg-rose-50 text-rose-600 border-rose-200/80'
                    }`}>
                      {fb.type === 'praising' ? <Award size={14} /> : <Compass size={14} />}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {fb.profiles.full_name}
                        </span>
                        <span className={`inline-flex px-1.5 py-0.2 rounded-full text-[9px] font-bold border tracking-wide uppercase ${
                          fb.type === 'praising' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {fb.type === 'praising' ? 'Praise' : 'Adjustment'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                        &ldquo;{fb.message}&rdquo;
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        <ClientFeedbackTime isoString={fb.created_at} />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: CREATE GOAL (Mobile Bottom-Sheet, Desktop Modal) */}
      {/* ============================================================ */}
      {goalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
            {/* Mobile Sheet Handle */}
            <div className="sm:hidden w-12 h-1 bg-slate-300 rounded-full mx-auto my-2 shrink-0" />

            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
                  <Plus size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Set One-Minute Goal</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-normal">Keep it under 250 words with quantifiable results.</p>
                </div>
              </div>
              <button 
                onClick={() => setGoalModalOpen(false)} 
                className="text-slate-400 hover:text-white transition cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {error && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-xs font-bold border border-rose-200">
                  {error}
                </div>
              )}

              {/* Employee Selection */}
              <div>
                <label htmlFor="employee_id" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assign to Employee
                </label>
                {employees.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-2">
                    <p>
                      <strong>No employees registered under you yet.</strong> Team members must sign up and select <strong>{managerProfile?.full_name || 'your account'}</strong> as their manager.
                    </p>
                    <Button 
                      type="button" 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => {
                        setGoalModalOpen(false)
                        setInviteModalOpen(true)
                      }}
                      className="text-xs"
                    >
                      Invite Employees
                    </Button>
                  </div>
                ) : (
                  <select
                    id="employee_id"
                    name="employee_id"
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    <option value="">-- Choose employee --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.email})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Objective */}
              <div>
                <label htmlFor="objective" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Goal Objective (Concise & Specific)
                </label>
                <input
                  id="objective"
                  name="objective"
                  type="text"
                  required
                  placeholder="e.g. Ship customer checkout optimization"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              {/* Expected Result */}
              <div>
                <label htmlFor="expected_result" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Expected Result / Standards
                </label>
                <textarea
                  id="expected_result"
                  name="expected_result"
                  required
                  rows={3}
                  placeholder="e.g. Reduce checkout drop-off by 15% and verify zero payment gateway exceptions."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              {/* Target Deadline */}
              <div>
                <label htmlFor="deadline" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Deadline
                </label>
                <input
                  id="deadline"
                  name="deadline"
                  type="date"
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 pb-safe">
                <Button type="button" variant="ghost" onClick={() => setGoalModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={employees.length === 0} 
                  loading={submittingGoal}
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                  Set One-Minute Goal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: LOG PRAISING / CORRECTION (Bottom-Sheet) */}
      {/* ============================================================ */}
      {feedbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
            {/* Mobile Handle */}
            <div className="sm:hidden w-12 h-1 bg-slate-300 rounded-full mx-auto my-2 shrink-0" />

            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                  feedbackType === 'praising' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                }`}>
                  {feedbackType === 'praising' ? <Award size={16} /> : <Compass size={16} />}
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">One-Minute Feedback</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-normal">Immediate feedback given within 60 seconds.</p>
                </div>
              </div>
              <button 
                onClick={() => setFeedbackModalOpen(false)} 
                className="text-slate-400 hover:text-white transition cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFeedback} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {error && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-xs font-bold border border-rose-200">
                  {error}
                </div>
              )}

              {/* Feedback Type Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Feedback Type
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFeedbackType('praising')}
                    className={`flex items-center justify-center gap-1.5 p-2.5 sm:p-3 border rounded-xl cursor-pointer text-xs sm:text-sm font-semibold transition ${
                      feedbackType === 'praising' 
                        ? 'border-emerald-500 bg-emerald-50/60 text-emerald-700 ring-2 ring-emerald-500/20' 
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Award size={15} />
                    <span>Praising (Recognition)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackType('correction')}
                    className={`flex items-center justify-center gap-1.5 p-2.5 sm:p-3 border rounded-xl cursor-pointer text-xs sm:text-sm font-semibold transition ${
                      feedbackType === 'correction' 
                        ? 'border-rose-500 bg-rose-50/60 text-rose-700 ring-2 ring-rose-500/20' 
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Compass size={15} />
                    <span>Re-Direct (Adjust)</span>
                  </button>
                </div>
              </div>

              {/* Team Member */}
              <div>
                <label htmlFor="employee_id_fb" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Team Member
                </label>
                {employees.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    No employees registered yet. Invite your team so they appear here!
                  </div>
                ) : (
                  <select
                    id="employee_id_fb"
                    name="employee_id"
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    <option value="">-- Choose team member --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.email})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Optional Goal binding */}
              <div>
                <label htmlFor="goal_id" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Associated Goal (Optional)
                </label>
                <select
                  id="goal_id"
                  name="goal_id"
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  <option value="">-- General Feedback (Not linked to specific goal) --</option>
                  {goals.filter(g => g.employee_id === selectedEmployeeId).map(g => (
                    <option key={g.id} value={g.id}>{g.objective}</option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {feedbackType === 'praising' 
                    ? 'Praise (Be immediate, specific, and state feelings)' 
                    : 'Re-Direct (Address the specific behavior, reaffirm the person)'}
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  placeholder={
                    feedbackType === 'praising'
                      ? 'e.g. John, you resolved that critical bug in 20 minutes today. It saved the deal. Outstanding work!'
                      : 'e.g. John, the client report was submitted without the updated numbers today. Let us make sure numbers are double-checked. You do great work.'
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 pb-safe">
                <Button type="button" variant="ghost" onClick={() => setFeedbackModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={employees.length === 0} 
                  loading={submittingFeedback}
                  variant={feedbackType === 'praising' ? 'success' : 'danger'}
                  className="flex items-center gap-1.5"
                >
                  <Send size={14} />
                  <span>Deliver {feedbackType === 'praising' ? 'Praise' : 'Adjustment'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: INVITE TEAM MEMBERS INSTRUCTIONS (Bottom-Sheet) */}
      {/* ============================================================ */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
            {/* Mobile Handle */}
            <div className="sm:hidden w-12 h-1 bg-slate-300 rounded-full mx-auto my-2 shrink-0" />

            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold">
                  <Users size={16} />
                </div>
                <h3 className="font-bold text-sm sm:text-base">Invite Team Members</h3>
              </div>
              <button 
                onClick={() => setInviteModalOpen(false)} 
                className="text-slate-400 hover:text-white transition cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <p className="text-xs text-slate-600 leading-relaxed">
                Employees can join your team immediately during registration. Share your manager email with them:
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Your Manager Email:
                </span>
                <div className="flex items-center justify-between bg-white border border-slate-200 px-3 py-2 rounded-lg gap-2">
                  <span className="text-xs font-mono font-bold text-slate-800 truncate">
                    {managerProfile?.email || 'davids@...'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="text-slate-500 hover:text-slate-900 transition flex items-center gap-1 text-xs font-semibold shrink-0 cursor-pointer ml-2"
                  >
                    {copiedEmail ? (
                      <>
                        <Check size={14} className="text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Instructions for Employees:
                </span>
                <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <li>Go to the sign-up page.</li>
                  <li>Select the <strong>Employee</strong> role.</li>
                  <li>Choose <strong>{managerProfile?.full_name || 'your name'}</strong> from the manager dropdown.</li>
                  <li>Start setting 60-second goals!</li>
                </ol>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end pb-safe">
                <Button 
                  onClick={() => setInviteModalOpen(false)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs w-full sm:w-auto"
                >
                  Got It
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
