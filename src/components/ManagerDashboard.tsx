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
  X,
  Edit2,
  Trash2,
  CheckCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { 
  createGoalAction, 
  editGoalAction, 
  deleteGoalAction, 
  completeGoalAction,
  reviewGoalStrategyAction
} from '@/app/dashboard/goals/actions'
import { createFeedbackAction, deleteFeedbackAction } from '@/app/dashboard/feedback/actions'
import { updateLagStatusAction } from '@/app/dashboard/director/actions'
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
  strategy_status?: 'pending_submission' | 'submitted' | 'approved' | 'revision_requested'
  strategy_text?: string | null
  strategy_feedback?: string | null
  strategy_submitted_at?: string | null
  strategy_approved_at?: string | null
  employee_id: string
  manager_id?: string
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
    pendingStrategies?: number
    totalPraises?: number
    totalCorrections?: number
  }
  currentUserId?: string
  lagFlags?: Array<{
    id: string
    flag_type: string
    directive: string
    status: 'open' | 'acknowledged' | 'resolved'
    created_at: string
  }>
}

export default function ManagerDashboard({ 
  managerProfile, 
  employees, 
  goals, 
  feedbacks, 
  stats,
  currentUserId,
  lagFlags = []
}: ManagerDashboardProps) {
  const openLagFlags = lagFlags.filter(f => f.status !== 'resolved')

  // Modal states
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [editGoalModalOpen, setEditGoalModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)

  // Two-Way Strategy Review Modal states
  const [strategyReviewModalOpen, setStrategyReviewModalOpen] = useState(false)
  const [reviewingGoal, setReviewingGoal] = useState<Goal | null>(null)
  const [revisionFeedback, setRevisionFeedback] = useState('')
  const [submittingStrategyReview, setSubmittingStrategyReview] = useState(false)
  const [strategyReviewError, setStrategyReviewError] = useState<string | null>(null)
  const [expandedStrategies, setExpandedStrategies] = useState<Record<string, boolean>>({})
  
  // Feedback specific states
  const [feedbackType, setFeedbackType] = useState<'praising' | 'correction'>('praising')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [selectedGoalId, setSelectedGoalId] = useState('')

  // Search and Filter states for goals
  const [goalSearch, setGoalSearch] = useState('')
  const [goalFilter, setGoalFilter] = useState<'all' | 'in_progress' | 'completed' | 'behind' | 'pending_strategy'>('all')

  // Copy email state
  const [copiedEmail, setCopiedEmail] = useState(false)

  // Loading states
  const [submittingGoal, setSubmittingGoal] = useState(false)
  const [submittingEditGoal, setSubmittingEditGoal] = useState(false)
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
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
      if (goalFilter === 'pending_strategy') {
        if (g.strategy_status !== 'submitted') return false
      } else if (goalFilter === 'in_progress' && g.status !== 'in_progress' && g.status !== 'not_started') return false
      else if (goalFilter === 'completed' && g.status !== 'completed') return false
      else if (goalFilter === 'behind' && g.status !== 'behind') return false

      // Search query
      if (goalSearch.trim()) {
        const query = goalSearch.toLowerCase()
        const objMatch = g.objective.toLowerCase().includes(query)
        const expMatch = g.expected_result.toLowerCase().includes(query)
        const empMatch = (g.profiles?.full_name || '').toLowerCase().includes(query)
        const stratMatch = (g.strategy_text || '').toLowerCase().includes(query)
        return objMatch || expMatch || empMatch || stratMatch
      }

      return true
    })
  }, [goals, goalFilter, goalSearch])

  // Handler for Strategy Review (Approve or Request Revision)
  async function handleReviewStrategy(decision: 'approve' | 'request_revision') {
    if (!reviewingGoal) return
    if (decision === 'request_revision' && !revisionFeedback.trim()) {
      setStrategyReviewError('Please provide feedback explaining what needs adjustment in the strategy.')
      return
    }

    setSubmittingStrategyReview(true)
    setStrategyReviewError(null)

    const res = await reviewGoalStrategyAction(reviewingGoal.id, decision, revisionFeedback.trim())
    if (res.success) {
      setStrategyReviewModalOpen(false)
      window.location.reload()
    } else {
      setSubmittingStrategyReview(false)
      setStrategyReviewError(res.error || 'Failed to update strategy.')
    }
  }

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

  async function handleEditGoal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmittingEditGoal(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const res = await editGoalAction(form)

    if (res.success) {
      setEditGoalModalOpen(false)
      setEditingGoal(null)
      window.location.reload()
    } else {
      setError(res.error || 'Failed to update goal')
      setSubmittingEditGoal(false)
    }
  }

  async function handleDeleteGoal(goalId: string) {
    if (!confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
      return
    }

    setActionInProgress(goalId)
    const res = await deleteGoalAction(goalId)
    if (res.success) {
      window.location.reload()
    } else {
      alert(res.error || 'Failed to delete goal')
      setActionInProgress(null)
    }
  }

  async function handleCompleteGoal(goalId: string) {
    setActionInProgress(goalId)
    const res = await completeGoalAction(goalId)
    if (res.success) {
      window.location.reload()
    } else {
      alert(res.error || 'Failed to mark goal complete')
      setActionInProgress(null)
    }
  }

  async function handleDeleteFeedback(feedbackId: string) {
    if (!confirm('Are you sure you want to retract this feedback?')) {
      return
    }

    const res = await deleteFeedbackAction(feedbackId)
    if (res.success) {
      window.location.reload()
    } else {
      alert(res.error || 'Failed to delete feedback')
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

  const currentHour = new Date().getHours()
  const timeGreeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ============================================================ */}
      {/* 1. WELCOME & COMMAND HERO BANNER */}
      {/* ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 bg-gradient-to-r from-[#0038B8] via-[#0544D0] to-[#0A2680] text-white p-6 sm:p-8 rounded-[28px] border border-blue-900/30 shadow-xl shadow-blue-950/20 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-white/95 backdrop-blur-md border border-white/20">
              <Sparkles size={13} className="text-amber-300" />
              Manager Focus Suite
            </span>
            <span className="text-xs font-mono text-blue-200/80">Team Performance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white mt-1">
            {timeGreeting}, {managerFirstName} 👋
          </h1>
          <p className="text-white/85 text-xs sm:text-sm max-w-xl leading-relaxed">
            Focus on clear expectations, immediate praising, and early adjustments to empower your team.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="z-10 shrink-0 flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
          <Button 
            variant="ghost"
            onClick={() => setInviteModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs font-bold bg-white/15 hover:bg-white/25 text-white py-3 px-4 rounded-xl border border-white/25 backdrop-blur-sm cursor-pointer"
          >
            <Users size={14} />
            <span>Invite Team</span>
          </Button>

          <Button 
            variant="ghost"
            onClick={() => {
              setSelectedEmployeeId(employees[0]?.id || '')
              setFeedbackType('praising')
              setFeedbackModalOpen(true)
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs font-bold bg-white/15 hover:bg-white/25 text-white py-3 px-4 rounded-xl border border-white/25 backdrop-blur-sm cursor-pointer"
          >
            <Award size={14} />
            <span>Log Feedback</span>
          </Button>

          <Button 
            onClick={() => setGoalModalOpen(true)} 
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#EA2B42] hover:bg-[#D91B3A] text-white font-bold text-xs sm:text-sm py-3 px-5 rounded-xl shadow-lg shadow-red-500/25 border-0 transition active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>Set One-Minute Goal</span>
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1.5. MANAGING DIRECTOR DIRECTIVE ALERTS */}
      {/* ============================================================ */}
      {openLagFlags.length > 0 && (
        <div className="space-y-3">
          {openLagFlags.map((flag) => (
            <div 
              key={flag.id} 
              className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 shadow-sm animate-in fade-in duration-300"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 mt-0.5">
                    <Zap size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                        Directive from Super Admin
                      </span>
                      <span className="text-xs text-amber-700">
                        <ClientFeedbackTime isoString={flag.created_at} />
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-amber-950 mt-1 italic leading-relaxed">
                      &ldquo;{flag.directive}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={async () => {
                      await updateLagStatusAction(flag.id, 'acknowledged')
                      window.location.reload()
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition cursor-pointer"
                  >
                    Acknowledge
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await updateLagStatusAction(flag.id, 'resolved')
                      window.location.reload()
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <Check size={13} />
                    <span>Mark Resolved</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. EXECUTIVE METRICS ROW */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        {/* Card 1: Goals Completed */}
        <Card hover className="relative overflow-hidden border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white rounded-2xl">
          <CardContent className="p-4 sm:p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Completed
              </span>
              <div className="flex items-baseline gap-1 sm:gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{stats.completed}</span>
                {goals.length > 0 && (
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-600">({completionRate}%)</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">Achieved targets</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 size={22} />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: In Progress */}
        <Card hover className="relative overflow-hidden border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white rounded-2xl">
          <CardContent className="p-4 sm:p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                In Progress
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{stats.inProgress}</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">Active focus</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 shrink-0">
              <Clock size={22} />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Falling Behind */}
        <Card hover className="relative overflow-hidden border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white rounded-2xl">
          <CardContent className="p-4 sm:p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Behind
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl sm:text-3xl font-black ${stats.behind > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {stats.behind}
                </span>
                {stats.behind > 0 && (
                  <span className="text-[8px] sm:text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase">
                    Alert
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">Re-Directs needed</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600 shrink-0">
              <AlertTriangle size={22} />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Feedback Velocity */}
        <Card hover className="relative overflow-hidden border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white rounded-2xl">
          <CardContent className="p-4 sm:p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Feedback
              </span>
              <div className="flex items-baseline gap-1 sm:gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{feedbacks.length}</span>
                <span className="text-[9px] sm:text-[10px] font-bold text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200">
                  {totalPraises}P/{totalCorrections}C
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">Total interactions</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100/80 flex items-center justify-center text-purple-600 shrink-0">
              <Award size={22} />
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

            {/* Filter & Search Bar */}
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

                {/* Filter Tabs */}
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
                  {goals.some(g => g.strategy_status === 'submitted') && (
                    <button
                      onClick={() => setGoalFilter('pending_strategy')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 ${
                        goalFilter === 'pending_strategy' 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                      }`}
                    >
                      💡 Strategy Bids ({goals.filter(g => g.strategy_status === 'submitted').length})
                    </button>
                  )}
                </div>
              </div>
            )}

            <CardContent className="p-0 divide-y divide-slate-100">
              {goals.length === 0 ? (
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
                filteredGoals.map((goal) => {
                  const stratStatus = goal.strategy_status || 'pending_submission'
                  return (
                    <div key={goal.id} className="p-4 sm:p-5 space-y-3 hover:bg-slate-50/50 transition">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">{goal.objective}</h4>
                            
                            {/* Strategy status pill */}
                            {stratStatus === 'approved' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <Check size={11} /> Strategy Agreed
                              </span>
                            )}
                            {stratStatus === 'submitted' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                <Clock size={11} /> Strategy Submitted
                              </span>
                            )}
                            {stratStatus === 'revision_requested' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                                Revision Pending
                              </span>
                            )}
                            {stratStatus === 'pending_submission' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                                Strategy Pending
                              </span>
                            )}

                            {currentUserId && goal.employee_id === currentUserId && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wide">
                                Executive Target (Assigned to You)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate">
                            {currentUserId && goal.employee_id === currentUserId ? (
                              <span>Assigned to: <strong className="text-purple-700 font-semibold">You (Direct Executive Oversight)</strong></span>
                            ) : (
                              <span>Assigned to: <strong className="text-slate-700 font-semibold">{goal.profiles?.full_name || 'Anonymous'}</strong></span>
                            )}
                          </p>
                        </div>
                        <GoalStatusBadge status={goal.status} />
                      </div>

                      <div className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed">
                        <strong className="text-slate-700">Expected Result:</strong> {goal.expected_result}
                      </div>

                      {/* TWO-WAY STRATEGY REVIEW BANNER */}
                      {stratStatus === 'submitted' && (
                        <div className="p-3.5 bg-blue-50/90 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                              <Lightbulb size={13} className="text-blue-600 shrink-0" />
                              Strategy Plan Proposed by {goal.profiles?.full_name || 'Staff Member'}
                            </span>
                            <p className="text-xs text-blue-900 line-clamp-2 italic bg-white/80 p-2 rounded-lg border border-blue-100 mt-1">
                              &ldquo;{goal.strategy_text}&rdquo;
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              setReviewingGoal(goal)
                              setRevisionFeedback(goal.strategy_feedback || '')
                              setStrategyReviewError(null)
                              setStrategyReviewModalOpen(true)
                            }}
                            className="bg-[#1D68FE] hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shrink-0 cursor-pointer shadow-xs border-0 self-end sm:self-auto"
                          >
                            Review &amp; Sign-Off
                          </Button>
                        </div>
                      )}

                      {stratStatus === 'approved' && goal.strategy_text && (
                        <div className="bg-slate-50 border border-slate-200/70 rounded-xl overflow-hidden text-xs">
                          <button
                            type="button"
                            onClick={() => setExpandedStrategies(prev => ({ ...prev, [goal.id]: !prev[goal.id] }))}
                            className="w-full p-2.5 px-3 flex items-center justify-between text-slate-700 hover:bg-slate-100/60 font-semibold cursor-pointer transition"
                          >
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              <span>Agreed 60-Second Strategy</span>
                            </div>
                            {expandedStrategies[goal.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {expandedStrategies[goal.id] && (
                            <div className="p-3 px-3.5 pt-1 text-slate-600 leading-relaxed border-t border-slate-200/50 bg-white">
                              {goal.strategy_text}
                            </div>
                          )}
                        </div>
                      )}

                      {stratStatus === 'revision_requested' && (
                        <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs space-y-1">
                          <span className="font-bold text-amber-900 flex items-center gap-1.5">
                            <Clock size={13} className="text-amber-600" />
                            Revision Guidance Sent to {goal.profiles?.full_name || 'Staff'}:
                          </span>
                          <p className="text-amber-950 italic bg-white/80 p-2 rounded-lg border border-amber-100">
                            &ldquo;{goal.strategy_feedback}&rdquo;
                          </p>
                        </div>
                      )}

                      {/* Progress bar + Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-semibold text-slate-400 pt-1">
                        <span className="text-slate-500 text-[11px]">Deadline: {formatStaticDate(goal.deadline)}</span>
                        
                        <div className="flex items-center gap-2.5 w-full sm:w-2/5">
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

                        {/* Goal Management Actions */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto pt-1 sm:pt-0">
                          {goal.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => handleCompleteGoal(goal.id)}
                              disabled={actionInProgress === goal.id}
                              className="text-emerald-700 hover:text-emerald-900 p-1.5 rounded-lg hover:bg-emerald-50 transition cursor-pointer"
                              title="Mark Completed"
                            >
                              <CheckCircle size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGoal(goal)
                              setEditGoalModalOpen(true)
                            }}
                            className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                            title="Edit Goal"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGoal(goal.id)}
                            disabled={actionInProgress === goal.id}
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Goal"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
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
                  <div key={fb.id} className="flex gap-2.5 text-left group">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 shadow-xs ${
                      fb.type === 'praising' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200/80' 
                        : 'bg-rose-50 text-rose-600 border-rose-200/80'
                    }`}>
                      {fb.type === 'praising' ? <Award size={14} /> : <Compass size={14} />}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
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
                        {/* Delete feedback button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteFeedback(fb.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-0.5 rounded transition cursor-pointer"
                          title="Delete Feedback"
                        >
                          <Trash2 size={12} />
                        </button>
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
      {/* MODAL 1: CREATE GOAL (Bottom-Sheet) */}
      {/* ============================================================ */}
      {goalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
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
      {/* MODAL 2: EDIT GOAL (Bottom-Sheet) */}
      {/* ============================================================ */}
      {editGoalModalOpen && editingGoal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
            <div className="sm:hidden w-12 h-1 bg-slate-300 rounded-full mx-auto my-2 shrink-0" />

            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold">
                  <Edit2 size={15} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Edit Performance Goal</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-normal">Adjust expectations or deadlines.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setEditGoalModalOpen(false)
                  setEditingGoal(null)
                }} 
                className="text-slate-400 hover:text-white transition cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditGoal} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <input type="hidden" name="goal_id" value={editingGoal.id} />

              {error && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-xs font-bold border border-rose-200">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="edit_objective" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Goal Objective
                </label>
                <input
                  id="edit_objective"
                  name="objective"
                  type="text"
                  required
                  defaultValue={editingGoal.objective}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              <div>
                <label htmlFor="edit_expected_result" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Expected Result / Standards
                </label>
                <textarea
                  id="edit_expected_result"
                  name="expected_result"
                  required
                  rows={3}
                  defaultValue={editingGoal.expected_result}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit_deadline" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Deadline
                  </label>
                  <input
                    id="edit_deadline"
                    name="deadline"
                    type="date"
                    required
                    defaultValue={editingGoal.deadline}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="edit_progress" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Progress (%)
                  </label>
                  <input
                    id="edit_progress"
                    name="progress"
                    type="number"
                    min="0"
                    max="100"
                    required
                    defaultValue={editingGoal.progress}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 pb-safe">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => {
                    setEditGoalModalOpen(false)
                    setEditingGoal(null)
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  loading={submittingEditGoal}
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: LOG PRAISING / CORRECTION (Bottom-Sheet) */}
      {/* ============================================================ */}
      {feedbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
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
      {/* MODAL 4: INVITE TEAM MEMBERS INSTRUCTIONS (Bottom-Sheet) */}
      {/* ============================================================ */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
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

      {/* ============================================================ */}
      {/* MODAL 5: TWO-WAY STRATEGY REVIEW & SIGN-OFF (Mutual Agreement) */}
      {/* ============================================================ */}
      {strategyReviewModalOpen && reviewingGoal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#0B111E] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1D68FE] flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
                  <Lightbulb size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">Review 60-Second Strategy</h3>
                  <p className="text-[11px] text-slate-400 font-normal">Two-Way Alignment • One-Minute Manager</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setStrategyReviewModalOpen(false)} 
                className="text-slate-400 hover:text-white transition cursor-pointer p-1.5 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {strategyReviewError && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-xs font-bold border border-rose-200 flex items-center justify-between">
                  <span>{strategyReviewError}</span>
                  <button type="button" onClick={() => setStrategyReviewError(null)} className="text-rose-400 hover:text-rose-700">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Goal Overview */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Goal Objective</span>
                    <p className="font-bold text-slate-900 mt-0.5">{reviewingGoal.objective}</p>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                    {reviewingGoal.profiles?.full_name || 'Staff Member'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Expected Standard</span>
                  <p className="text-slate-600 mt-0.5">{reviewingGoal.expected_result}</p>
                </div>
                <div className="text-[11px] text-slate-500 font-medium pt-1">
                  Target Deadline: <strong>{formatStaticDate(reviewingGoal.deadline)}</strong>
                </div>
              </div>

              {/* Submitted Strategy Content */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Proposed Execution Strategy:
                  </span>
                  <span className="text-[11px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    {(reviewingGoal.strategy_text || '').split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <div className="p-3.5 bg-blue-50/50 border border-blue-200/80 rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                  {reviewingGoal.strategy_text || 'No strategy text submitted.'}
                </div>
              </div>

              {/* Revision Feedback Section */}
              <div className="space-y-1.5 pt-1">
                <label htmlFor="revFeedback" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Revision Guidance / Feedback (if requesting changes)
                </label>
                <textarea
                  id="revFeedback"
                  rows={3}
                  value={revisionFeedback}
                  onChange={(e) => setRevisionFeedback(e.target.value)}
                  placeholder="Explain clearly what needs refinement (e.g., 'Please add intermediate milestones' or 'Consider collaborating with marketing')..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Footer with Actions */}
            <div className="p-4 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between shrink-0 gap-2.5">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setStrategyReviewModalOpen(false)}
                disabled={submittingStrategyReview}
                className="cursor-pointer text-slate-600 hover:text-slate-900 text-xs sm:text-sm font-semibold w-full sm:w-auto"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button 
                  type="button" 
                  onClick={() => handleReviewStrategy('request_revision')}
                  disabled={submittingStrategyReview}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-xs border-0 cursor-pointer flex-1 sm:flex-none"
                >
                  Request Revision
                </Button>
                <Button 
                  type="button" 
                  onClick={() => handleReviewStrategy('approve')}
                  disabled={submittingStrategyReview}
                  loading={submittingStrategyReview}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-5 py-2 rounded-xl shadow-lg shadow-emerald-600/25 border-0 cursor-pointer flex-1 sm:flex-none"
                >
                  Approve &amp; Sign-Off
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
