'use client'

import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, GoalStatusBadge } from '@/components/ui/Badge'
import { 
  Award, 
  Compass, 
  MessageSquare, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  CheckCircle,
  Check,
  Send,
  FileText,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Lightbulb
} from 'lucide-react'
import { updateGoalProgressAction, completeGoalAction, submitGoalStrategyAction } from '@/app/dashboard/goals/actions'
import { formatStaticDate, ClientFeedbackTime } from '@/lib/utils'

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
}

interface Feedback {
  id: string
  type: 'praising' | 'correction'
  message: string
  created_at: string
}

interface EmployeeDashboardProps {
  employeeProfile?: {
    full_name: string | null
    email: string
  }
  managerInfo?: {
    full_name: string | null
    email: string
  } | null
  goals: Goal[]
  feedbacks: Feedback[]
}

export default function EmployeeDashboard({ 
  employeeProfile, 
  managerInfo, 
  goals, 
  feedbacks 
}: EmployeeDashboardProps) {
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null)
  
  // Strategy Modal state
  const [strategyModalOpen, setStrategyModalOpen] = useState(false)
  const [activeGoalForStrategy, setActiveGoalForStrategy] = useState<Goal | null>(null)
  const [strategyDraft, setStrategyDraft] = useState('')
  const [submittingStrategy, setSubmittingStrategy] = useState(false)
  const [strategyError, setStrategyError] = useState<string | null>(null)
  const [expandedStrategies, setExpandedStrategies] = useState<Record<string, boolean>>({})

  // Track slider changes locally before submitting
  const [sliderVals, setSliderVals] = useState<Record<string, number>>(
    goals.reduce((acc, g) => ({ ...acc, [g.id]: g.progress }), {})
  )

  const employeeFirstName = useMemo(() => {
    if (!employeeProfile?.full_name) return 'Team Member'
    return employeeProfile.full_name.trim().split(' ')[0]
  }, [employeeProfile])

  // Handler to open strategy modal
  function handleOpenStrategyModal(goal: Goal) {
    setActiveGoalForStrategy(goal)
    setStrategyDraft(goal.strategy_text || '')
    setStrategyError(null)
    setStrategyModalOpen(true)
  }

  // Handler to submit strategy
  async function handleSubmitStrategy(e: React.FormEvent) {
    e.preventDefault()
    if (!activeGoalForStrategy || !strategyDraft.trim()) {
      setStrategyError('Please enter your 60-second action strategy.')
      return
    }

    setSubmittingStrategy(true)
    setStrategyError(null)

    const res = await submitGoalStrategyAction(activeGoalForStrategy.id, strategyDraft.trim())
    if (res.success) {
      setStrategyModalOpen(false)
      window.location.reload()
    } else {
      setSubmittingStrategy(false)
      setStrategyError(res.error || 'Failed to submit strategy.')
    }
  }

  async function handleSliderRelease(goalId: string, deadline: string) {
    const val = sliderVals[goalId]
    setUpdatingGoalId(goalId)
    
    const res = await updateGoalProgressAction(goalId, val, deadline)
    if (res.success) {
      window.location.reload()
    } else {
      alert(res.error || 'Failed to update progress.')
      setUpdatingGoalId(null)
    }
  }

  const activeGoals = goals.filter(g => g.status !== 'completed')
  const completedGoals = goals.filter(g => g.status === 'completed')
  const praiseCount = feedbacks.filter(f => f.type === 'praising').length
  const totalCompletionRate = goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0

  const currentHour = new Date().getHours()
  const timeGreeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* ============================================================ */}
      {/* 1. WELCOME & FOCUS HERO BANNER */}
      {/* ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 bg-gradient-to-r from-[#0038B8] via-[#0544D0] to-[#0A2680] text-white p-6 sm:p-8 rounded-[28px] border border-blue-900/30 shadow-xl shadow-blue-950/20 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-white/95 backdrop-blur-md border border-white/20">
              <Sparkles size={13} className="text-amber-300" />
              Member Focus Suite
            </span>
            <span className="text-xs font-mono text-blue-200/80">Two-Way Alignment</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white mt-1">
            {timeGreeting}, {employeeFirstName} 🎯
          </h1>
          <p className="text-white/85 text-xs sm:text-sm max-w-xl leading-relaxed">
            Agree on one-minute goals, propose your 60-second action strategies for approval, and track your self-progress.
          </p>
        </div>

        {managerInfo && (
          <div className="z-10 flex items-center gap-3 p-3 px-4 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-md shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#1D68FE] text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0 border border-white/30">
              {managerInfo.full_name ? managerInfo.full_name[0].toUpperCase() : 'M'}
            </div>
            <div className="text-left min-w-0">
              <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider block">Assigned Manager</span>
              <span className="text-xs sm:text-sm font-bold text-white truncate block">{managerInfo.full_name || 'Manager'}</span>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. STATS ROW (3 Cards) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        <Card hover className="relative overflow-hidden border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white rounded-2xl">
          <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div className="space-y-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">Active</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{activeGoals.length}</div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">In flight targets</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 shrink-0">
              <Clock size={20} />
            </div>
          </CardContent>
        </Card>

        <Card hover className="relative overflow-hidden border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white rounded-2xl">
          <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div className="space-y-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">Done</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{completedGoals.length}</span>
                {goals.length > 0 && (
                  <span className="text-xs font-bold text-emerald-600 hidden sm:inline">({totalCompletionRate}%)</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">Delivered goals</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 size={20} />
            </div>
          </CardContent>
        </Card>

        <Card hover className="relative overflow-hidden border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white rounded-2xl">
          <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div className="space-y-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">Praise</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{praiseCount}</div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">Recognition events</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-purple-50 border border-purple-100/80 flex items-center justify-center text-purple-600 shrink-0">
              <Award size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* 3. ACTIVE GOALS & FEEDBACK SECTION */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column: Active Goals (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <BookOpen size={18} className="text-slate-500" />
                  <span>My One-Minute Goals &amp; Strategies</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Propose execution strategies for manager approval, then track your progress.
                </CardDescription>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full shrink-0">
                {activeGoals.length} Active
              </span>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 p-0">
              {activeGoals.length === 0 ? (
                <div className="p-6 sm:p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">All Goals Complete!</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      You have no pending active goals. Check in with your manager to align on next targets.
                    </p>
                  </div>
                </div>
              ) : (
                activeGoals.map((goal) => {
                  const stratStatus = goal.strategy_status || 'pending_submission'
                  return (
                    <div key={goal.id} className="p-4 sm:p-6 space-y-3.5 hover:bg-slate-50/50 transition">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1 min-w-0 flex-1">
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
                                <Clock size={11} /> Under Review
                              </span>
                            )}
                            {stratStatus === 'revision_requested' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 animate-pulse">
                                <AlertCircle size={11} /> Revision Requested
                              </span>
                            )}
                            {stratStatus === 'pending_submission' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                                <Lightbulb size={11} /> Strategy Pending
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 font-medium block">
                            Deadline: {formatStaticDate(goal.deadline)}
                          </span>
                        </div>
                        <GoalStatusBadge status={goal.status} />
                      </div>

                      {/* Expected Result standard */}
                      <div className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed">
                        <strong className="text-slate-700">Expected Result:</strong> {goal.expected_result}
                      </div>

                      {/* TWO-WAY STRATEGY BANNER */}
                      {stratStatus === 'revision_requested' && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                              <AlertCircle size={14} className="text-rose-600 shrink-0" />
                              Manager Query &amp; Feedback:
                            </span>
                            <Button 
                              size="sm" 
                              onClick={() => handleOpenStrategyModal(goal)}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-1 rounded-lg border-0 shadow-xs cursor-pointer"
                            >
                              Revise Strategy
                            </Button>
                          </div>
                          <p className="text-xs text-rose-950 italic bg-white/90 p-2.5 rounded-lg border border-rose-100 leading-relaxed">
                            &ldquo;{goal.strategy_feedback}&rdquo;
                          </p>
                        </div>
                      )}

                      {stratStatus === 'pending_submission' && (
                        <div className="p-3.5 bg-amber-50/90 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                              <Lightbulb size={14} className="text-amber-600 shrink-0" />
                              One-Minute Strategy Agreement Required
                            </span>
                            <p className="text-[11px] text-amber-800 leading-relaxed">
                              Propose your 60-second execution plan for manager review and sign-off.
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleOpenStrategyModal(goal)} 
                            className="bg-[#1D68FE] hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shrink-0 cursor-pointer shadow-xs border-0"
                          >
                            Propose Strategy
                          </Button>
                        </div>
                      )}

                      {stratStatus === 'submitted' && (
                        <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-blue-900 font-semibold">
                            <Clock size={14} className="text-blue-600 shrink-0" />
                            <span>Strategy submitted • Pending manager sign-off</span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleOpenStrategyModal(goal)} 
                            className="text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-100/60 px-2.5 py-1 cursor-pointer font-bold"
                          >
                            View / Edit
                          </Button>
                        </div>
                      )}

                      {stratStatus === 'approved' && goal.strategy_text && (
                        <div className="bg-slate-50 border border-slate-200/70 rounded-xl overflow-hidden text-xs">
                          <button
                            type="button"
                            onClick={() => setExpandedStrategies(prev => ({ ...prev, [goal.id]: !prev[goal.id] }))}
                            className="w-full p-2.5 px-3.5 flex items-center justify-between text-slate-700 hover:bg-slate-100/60 font-semibold cursor-pointer transition"
                          >
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              <span>Agreed 60-Second Strategy Plan</span>
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

                      {/* Interactive Progress Slider */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                          <span>Self-Report Progress:</span>
                          <span className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold ${
                            (sliderVals[goal.id] ?? goal.progress) === 100
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-800'
                          } ${updatingGoalId === goal.id ? 'animate-pulse' : ''}`}>
                            {sliderVals[goal.id] ?? goal.progress}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            disabled={updatingGoalId === goal.id}
                            value={sliderVals[goal.id] ?? goal.progress}
                            onChange={(e) => setSliderVals({ ...sliderVals, [goal.id]: parseInt(e.target.value, 10) })}
                            className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          />
                          {(sliderVals[goal.id] ?? goal.progress) !== goal.progress ? (
                            <Button
                              size="sm"
                              loading={updatingGoalId === goal.id}
                              onClick={() => handleSliderRelease(goal.id, goal.deadline)}
                              className="text-xs shrink-0 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                            >
                              Save
                            </Button>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                setUpdatingGoalId(goal.id)
                                const res = await completeGoalAction(goal.id)
                                if (res.success) window.location.reload()
                                else {
                                  alert(res.error || 'Failed to complete goal')
                                  setUpdatingGoalId(null)
                                }
                              }}
                              disabled={updatingGoalId === goal.id || goal.status === 'completed'}
                              title="Mark 100% Complete"
                              className="text-slate-300 hover:text-emerald-600 transition p-1 cursor-pointer shrink-0 disabled:opacity-50"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Completed Goals History */}
          {completedGoals.length > 0 && (
            <Card>
              <CardHeader className="p-4 pb-2.5">
                <CardTitle className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>Delivered Goals ({completedGoals.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 p-0 max-h-48 overflow-y-auto">
                {completedGoals.map((g) => (
                  <div key={g.id} className="p-3 px-4 flex items-center justify-between text-xs text-slate-500">
                    <span className="truncate pr-2 font-medium line-through text-slate-400">{g.objective}</span>
                    <span className="text-emerald-600 font-bold shrink-0 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                      100% Done
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Feedback Loop Timeline */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="p-4 pb-2.5">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <MessageSquare size={17} className="text-slate-500" />
                  <span>My Praises &amp; Adjustments</span>
                </CardTitle>
                <CardDescription className="text-xs">Timely updates shared by your manager.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3.5 p-4 pt-1">
              {feedbacks.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-6 space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                    <Award size={18} />
                  </div>
                  <p>No feedback logged yet. Work closely with your manager to align on goals!</p>
                </div>
              ) : (
                feedbacks.map((fb) => (
                  <div key={fb.id} className="flex gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
                      fb.type === 'praising' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                        : 'bg-rose-50 text-rose-600 border-rose-200'
                    }`}>
                      {fb.type === 'praising' ? <Award size={14} /> : <Compass size={14} />}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className={`inline-flex px-1.5 py-0.2 rounded-full text-[9px] font-bold border tracking-wide uppercase ${
                        fb.type === 'praising' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {fb.type === 'praising' ? 'Praise' : 'Adjustment'}
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
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
      {/* MODAL: PROPOSE / REVISE 60-SECOND STRATEGY (Two-Way Alignment) */}
      {/* ============================================================ */}
      {strategyModalOpen && activeGoalForStrategy && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#0B111E] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1D68FE] flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
                  <Send size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    {activeGoalForStrategy.strategy_status === 'revision_requested' 
                      ? 'Revise 60-Second Strategy' 
                      : 'Propose Execution Strategy'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-normal">Two-Way Goal Alignment &amp; Action Agreement</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setStrategyModalOpen(false)} 
                className="text-slate-400 hover:text-white transition cursor-pointer p-1.5 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitStrategy} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                {strategyError && (
                  <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-xs font-bold border border-rose-200 flex items-center justify-between">
                    <span>{strategyError}</span>
                    <button type="button" onClick={() => setStrategyError(null)} className="text-rose-400 hover:text-rose-700">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Target Objective & Standard Summary */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Goal Objective</span>
                    <p className="font-bold text-slate-900 mt-0.5">{activeGoalForStrategy.objective}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Expected Standard</span>
                    <p className="text-slate-600 mt-0.5">{activeGoalForStrategy.expected_result}</p>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium pt-1">
                    Target Deadline: <strong>{formatStaticDate(activeGoalForStrategy.deadline)}</strong>
                  </div>
                </div>

                {/* Manager Query Alert (if revision requested) */}
                {activeGoalForStrategy.strategy_feedback && activeGoalForStrategy.strategy_status === 'revision_requested' && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs">
                    <span className="font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-rose-600" />
                      Manager Revision Guidance:
                    </span>
                    <p className="text-rose-950 italic bg-white/80 p-2 rounded-lg border border-rose-100">
                      &ldquo;{activeGoalForStrategy.strategy_feedback}&rdquo;
                    </p>
                  </div>
                )}

                {/* Strategy Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="strategy" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      My 60-Second Execution Strategy <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {strategyDraft.trim().split(/\s+/).filter(Boolean).length} / ~250 words
                    </span>
                  </div>
                  <textarea
                    id="strategy"
                    required
                    rows={5}
                    value={strategyDraft}
                    onChange={(e) => setStrategyDraft(e.target.value)}
                    placeholder="Outline your specific milestones, approach, and key steps to achieve the expected standard within the deadline..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-400 leading-normal">
                    💡 <em>One-Minute Rule:</em> Keep it focused, clear, and reviewable in 60 seconds so you and your manager stay mutually aligned.
                  </p>
                </div>
              </div>

              {/* Sticky Modal Footer */}
              <div className="p-4 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 gap-3">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setStrategyModalOpen(false)}
                  disabled={submittingStrategy}
                  className="cursor-pointer text-slate-600 hover:text-slate-900 text-xs sm:text-sm font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={!strategyDraft.trim() || submittingStrategy} 
                  loading={submittingStrategy}
                  className="bg-[#1D68FE] hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 border-0 cursor-pointer"
                >
                  {submittingStrategy ? 'Submitting...' : 'Submit Strategy for Approval'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
