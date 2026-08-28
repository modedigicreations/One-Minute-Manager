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
  CheckCircle
} from 'lucide-react'
import { updateGoalProgressAction, completeGoalAction } from '@/app/dashboard/goals/actions'
import { formatStaticDate, ClientFeedbackTime } from '@/lib/utils'

interface Goal {
  id: string
  objective: string
  expected_result: string
  deadline: string
  progress: number
  status: 'not_started' | 'in_progress' | 'completed' | 'behind'
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
  
  // Track slider changes locally before submitting
  const [sliderVals, setSliderVals] = useState<Record<string, number>>(
    goals.reduce((acc, g) => ({ ...acc, [g.id]: g.progress }), {})
  )

  const employeeFirstName = useMemo(() => {
    if (!employeeProfile?.full_name) return 'Team Member'
    return employeeProfile.full_name.trim().split(' ')[0]
  }, [employeeProfile])

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

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* ============================================================ */}
      {/* 1. WELCOME & FOCUS HEADER */}
      {/* ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/90 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.03)]">
        <div>
          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              My Focus, {employeeFirstName} 🎯
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active Member
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Review your 60-second performance targets, track self-progress, and view continuous manager praise.
          </p>
        </div>

        {managerInfo && (
          <div className="flex items-center gap-2.5 p-2 px-3 rounded-xl bg-slate-50 border border-slate-200/80 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {managerInfo.full_name ? managerInfo.full_name[0].toUpperCase() : 'M'}
            </div>
            <div className="text-left min-w-0">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Manager</span>
              <span className="text-xs font-bold text-slate-800 truncate block">{managerInfo.full_name || 'Manager'}</span>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. STATS ROW (3 Cards) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 lg:gap-5">
        <Card hover className="relative overflow-hidden border-slate-200/80">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-indigo-500" />
          <CardContent className="p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">Active</span>
              <div className="text-xl sm:text-3xl font-extrabold text-slate-900">{activeGoals.length}</div>
              <p className="text-[9px] sm:text-[11px] text-slate-400 font-medium hidden sm:block">In flight</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
              <Clock size={16} className="sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>

        <Card hover className="relative overflow-hidden border-slate-200/80">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <CardContent className="p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">Done</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-3xl font-extrabold text-slate-900">{completedGoals.length}</span>
                {goals.length > 0 && (
                  <span className="text-[9px] sm:text-xs font-bold text-emerald-600 hidden sm:inline">({totalCompletionRate}%)</span>
                )}
              </div>
              <p className="text-[9px] sm:text-[11px] text-slate-400 font-medium hidden sm:block">Delivered</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 size={16} className="sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>

        <Card hover className="relative overflow-hidden border-slate-200/80">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-400 to-fuchsia-500" />
          <CardContent className="p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">Praise</span>
              <div className="text-xl sm:text-3xl font-extrabold text-slate-900">{praiseCount}</div>
              <p className="text-[9px] sm:text-[11px] text-slate-400 font-medium hidden sm:block">Recognition</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
              <Award size={16} className="sm:w-6 sm:h-6" />
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
                  <span>My Performance Goals</span>
                </CardTitle>
                <CardDescription className="text-xs">Drag the slider to update your progress.</CardDescription>
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
                activeGoals.map((goal) => (
                  <div key={goal.id} className="p-4 sm:p-6 space-y-3.5 hover:bg-slate-50/50 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">{goal.objective}</h4>
                        <span className="text-xs text-slate-400 font-medium block mt-0.5">
                          Deadline: {formatStaticDate(goal.deadline)}
                        </span>
                      </div>
                      <GoalStatusBadge status={goal.status} />
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed">
                      <strong className="text-slate-700">Expected Result:</strong> {goal.expected_result}
                    </div>

                    {/* Interactive Slider */}
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
                            className="text-xs shrink-0 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
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
                            disabled={updatingGoalId === goal.id}
                            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg hover:bg-emerald-50 transition border border-emerald-200/60 cursor-pointer"
                            title="Mark as 100% Completed"
                          >
                            <CheckCircle size={13} />
                            <span>Done</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <Card className="opacity-80">
              <CardHeader className="p-4 sm:p-6 pb-2.5">
                <div>
                  <CardTitle className="text-slate-700 text-sm sm:text-base">Completed Achievements</CardTitle>
                  <CardDescription className="text-xs">Archive of delivered goals.</CardDescription>
                </div>
                <Badge variant="success">{completedGoals.length} Done</Badge>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 p-0">
                {completedGoals.map((goal) => (
                  <div key={goal.id} className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-700 line-through leading-snug">{goal.objective}</h4>
                      <span className="text-[10px] text-slate-400 font-medium">Met target on {formatStaticDate(goal.deadline)}</span>
                    </div>
                    <GoalStatusBadge status="completed" />
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
                  <span>My Praises & Adjustments</span>
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
    </div>
  )
}
