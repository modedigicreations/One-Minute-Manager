'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, GoalStatusBadge } from '@/components/ui/Badge'
import { Award, Compass, MessageSquare, BookOpen } from 'lucide-react'
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
  goals: Goal[]
  feedbacks: Feedback[]
}

export default function EmployeeDashboard({ goals, feedbacks }: EmployeeDashboardProps) {
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null)
  
  // Track slider changes locally before submitting
  const [sliderVals, setSliderVals] = useState<Record<string, number>>(
    goals.reduce((acc, g) => ({ ...acc, [g.id]: g.progress }), {})
  )

  async function handleSliderRelease(goalId: string, deadline: string) {
    const val = sliderVals[goalId]
    setUpdatingGoalId(goalId)
    
    const res = await updateGoalProgressAction(goalId, val, deadline)
    if (res.success) {
      // Reload page to reflect updated statistics
      window.location.reload()
    } else {
      alert(res.error || 'Failed to update progress.')
      setUpdatingGoalId(null)
    }
  }

  const activeGoals = goals.filter(g => g.status !== 'completed')
  const completedGoals = goals.filter(g => g.status === 'completed')

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">My Focus</h1>
        <p className="text-slate-500 text-sm">Review expectations, track progress, and view feedback loops.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Active Goals (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen size={18} className="text-slate-400" />
                  What Am I Expected to Achieve?
                </CardTitle>
                <CardDescription>Active performance expectations and progress logs.</CardDescription>
              </div>
              <Badge variant="primary">{activeGoals.length} active</Badge>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 p-0">
              {activeGoals.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  You have no active goals. Enjoy the clean slate or check in with your manager!
                </div>
              ) : (
                activeGoals.map((goal) => (
                  <div key={goal.id} className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg">{goal.objective}</h4>
                        <span className="text-xs text-slate-400 font-semibold block mt-0.5">
                          Deadline: {formatStaticDate(goal.deadline)}
                        </span>
                      </div>
                      <GoalStatusBadge status={goal.status} />
                    </div>

                    <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-3.5 leading-relaxed">
                      <strong>Expected Result:</strong> {goal.expected_result}
                    </div>

                    {/* Interactive Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>Track My Progress:</span>
                        <span className={`px-2 py-0.5 rounded bg-slate-100 ${updatingGoalId === goal.id ? 'animate-pulse' : ''}`}>
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
                          className="w-full accent-slate-800 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                        />
                        {(sliderVals[goal.id] ?? goal.progress) !== goal.progress && (
                          <Button
                            size="sm"
                            loading={updatingGoalId === goal.id}
                            onClick={() => handleSliderRelease(goal.id, goal.deadline)}
                            className="text-xs shrink-0 py-1"
                          >
                            Save
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
            <Card className="opacity-75">
              <CardHeader>
                <div>
                  <CardTitle className="text-slate-600">Completed Achievements</CardTitle>
                  <CardDescription>Archive of successfully met goals.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 p-0">
                {completedGoals.map((goal) => (
                  <div key={goal.id} className="p-5 flex items-center justify-between gap-4">
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
                  <MessageSquare size={18} className="text-slate-400" />
                  My Praises & Adjustments
                </CardTitle>
                <CardDescription>Timely updates shared by your manager.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {feedbacks.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-4">
                  No feedback logged yet. Work closely with your manager to align on goals!
                </div>
              ) : (
                feedbacks.map((fb) => (
                  <div key={fb.id} className="flex gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
                      fb.type === 'praising' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {fb.type === 'praising' ? <Award size={16} /> : <Compass size={16} />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold border tracking-wide uppercase ${
                          fb.type === 'praising' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {fb.type === 'praising' ? 'Praise' : 'Correction'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed italic">
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
