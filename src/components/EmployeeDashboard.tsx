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
  Sparkles
} from 'lucide-react'
import { updateGoalProgressAction } from '@/app/dashboard/goals/actions'
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
    <div className="space-y-8 pb-12">
      {/* ============================================================ */}
      {/* 1. WELCOME & FOCUS HEADER */}
      {/* ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.03)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              My Focus, {employeeFirstName} 🎯
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active Member
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm max-w-2xl">
            Review your 60-second performance targets, track self-progress, and receive continuous manager praise.
          </p>
        </div>

        {managerInfo && (
          <div className="flex items-center gap-3 p-2.5 px-3.5 rounded-xl bg-slate-50 border border-slate-200/80 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
              {managerInfo.full_name ? managerInfo.full_name[0].toUpperCase() : 'M'}
            </div>
            <div className="text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Manager</span>
              <span className="text-xs font-bold text-slate-800">{managerInfo.full_name || 'Manager'}</span>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. STATS ROW */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <Card hover className="relative overflow-hidden border-slate-200/80">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-indigo-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Goals</span>
              <div className="text-3xl font-extrabold text-slate-900">{activeGoals.length}</div>
              <p className="text-[11px] text-slate-400 font-medium">In flight expectations</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
              <Clock size={24} />
            </div>
          </CardContent>
        </Card>

        <Card hover className="relative overflow-hidden border-slate-200/80">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completed Targets</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">{completedGoals.length}</span>
                {goals.length > 0 && (
                  <span className="text-xs font-bold text-emerald-600">({totalCompletionRate}%)</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Delivered results</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 size={24} />
            </div>
          </CardContent>
        </Card>

        <Card hover className="relative overflow-hidden border-slate-200/80">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-400 to-fuchsia-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Praise Received</span>
              <div className="text-3xl font-extrabold text-slate-900">{praiseCount}</div>
              <p className="text-[11px] text-slate-400 font-medium">Praisings & recognition</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
              <Award size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* 3. ACTIVE GOALS & FEEDBACK SECTION */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Active Goals (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen size={18} className="text-slate-500" />
                  <span>My Agreed Performance Goals</span>
                </CardTitle>
                <CardDescription>Drag the slider anytime to update your completion progress.</CardDescription>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                {activeGoals.length} Active
              </span>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 p-0">
              {activeGoals.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">All Goals Complete!</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      You have no pending active goals. Reach out to your manager to set your next 60-second milestones!
                    </p>
                  </div>
                </div>
              ) : (
                activeGoals.map((goal) => (
                  <div key={goal.id} className="p-6 space-y-4 hover:bg-slate-50/50 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{goal.objective}</h4>
                        <span className="text-xs text-slate-400 font-medium block mt-0.5">
                          Deadline: {formatStaticDate(goal.deadline)}
                        </span>
                      </div>
                      <GoalStatusBadge status={goal.status} />
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3.5 leading-relaxed">
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
                        {(sliderVals[goal.id] ?? goal.progress) !== goal.progress && (
                          <Button
                            size="sm"
                            loading={updatingGoalId === goal.id}
                            onClick={() => handleSliderRelease(goal.id, goal.deadline)}
                            className="text-xs shrink-0 py-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                          >
                            Save Progress
                          </Button>
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
              <CardHeader>
                <div>
                  <CardTitle className="text-slate-700 text-base">Completed Achievements</CardTitle>
                  <CardDescription>Archive of goals met and delivered.</CardDescription>
                </div>
                <Badge variant="success">{completedGoals.length} Done</Badge>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 p-0">
                {completedGoals.map((goal) => (
                  <div key={goal.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-700 line-through">{goal.objective}</h4>
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
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare size={17} className="text-slate-500" />
                  <span>My Praises & Adjustments</span>
                </CardTitle>
                <CardDescription>Timely updates shared by your manager.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {feedbacks.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-8 space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                    <Award size={18} />
                  </div>
                  <p>No feedback logged yet. Work closely with your manager to align on goals!</p>
                </div>
              ) : (
                feedbacks.map((fb) => (
                  <div key={fb.id} className="flex gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
                      fb.type === 'praising' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                        : 'bg-rose-50 text-rose-600 border-rose-200'
                    }`}>
                      {fb.type === 'praising' ? <Award size={15} /> : <Compass size={15} />}
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
