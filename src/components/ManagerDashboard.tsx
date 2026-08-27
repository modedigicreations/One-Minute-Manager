'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, GoalStatusBadge } from '@/components/ui/Badge'
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Plus, 
  Award, 
  Compass, 
  Users, 
  TrendingUp, 
  MessageSquare,
  ArrowRight
} from 'lucide-react'
import { createGoalAction } from '@/app/dashboard/goals/actions'
import { createFeedbackAction } from '@/app/dashboard/feedback/actions'

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
  employees: Employee[]
  goals: Goal[]
  feedbacks: Feedback[]
  stats: {
    completed: number
    inProgress: number
    behind: number
  }
}

export default function ManagerDashboard({ employees, goals, feedbacks, stats }: ManagerDashboardProps) {
  // Modal states
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  
  // Feedback specific states
  const [feedbackType, setFeedbackType] = useState<'praising' | 'correction'>('praising')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [selectedGoalId, setSelectedGoalId] = useState('')

  // Loading states
  const [submittingGoal, setSubmittingGoal] = useState(false)
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handlers
  async function handleCreateGoal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmittingGoal(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const res = await createGoalAction(form)

    if (res.success) {
      setGoalModalOpen(false)
      // Hard reload page to refresh server components
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

  // Find employees requiring attention:
  // - Have a goal status of 'behind'
  // - Or have no feedbacks at all
  const attentionEmployees = employees.filter(emp => {
    const hasBehindGoal = goals.some(g => g.employee_id === emp.id && g.status === 'behind')
    const hasNoRecentFeedback = !feedbacks.some(f => f.profiles.email === emp.email)
    return hasBehindGoal || hasNoRecentFeedback
  })

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Manager Dashboard</h1>
          <p className="text-slate-500 text-sm">Focus on clear expectations, immediate praising, and early adjustments.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setGoalModalOpen(true)} className="flex items-center gap-2">
            <Plus size={16} />
            Set One-Minute Goal
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:scale-[1.01] transition-transform">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <CheckCircle size={24} />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Goals Completed</span>
              <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{stats.completed}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:scale-[1.01] transition-transform">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 border border-slate-100">
              <Clock size={24} />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">In Progress</span>
              <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{stats.inProgress}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:scale-[1.01] transition-transform">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <AlertCircle size={24} />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Falling Behind</span>
              <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{stats.behind}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid split: Team & Feedbacks */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Team Profiles & Active Goals */}
        <div className="xl:col-span-2 space-y-6">
          {/* Team Members List */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users size={18} className="text-slate-400" />
                  My Team Members
                </CardTitle>
                <CardDescription>Track status and log instant feedback triggers.</CardDescription>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase">
                {employees.length} members
              </span>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 p-0">
              {employees.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No employees assigned to you yet. Ask your team members to select you as their manager when registering!
                </div>
              ) : (
                employees.map((emp) => {
                  const empGoals = goals.filter(g => g.employee_id === emp.id)
                  const behindCount = empGoals.filter(g => g.status === 'behind').length
                  
                  return (
                    <div key={emp.id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      {/* Left: Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-lg">
                          {emp.full_name ? emp.full_name[0].toUpperCase() : 'E'}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{emp.full_name || 'Anonymous Employee'}</h4>
                          <p className="text-xs text-slate-400 font-medium">{emp.email}</p>
                        </div>
                      </div>

                      {/* Middle: Active Goals Summary */}
                      <div className="flex items-center gap-4">
                        <div className="text-xs font-medium text-slate-500">
                          <strong>{empGoals.length}</strong> active goals
                          {behindCount > 0 && (
                            <span className="text-rose-500 font-bold ml-1">({behindCount} behind)</span>
                          )}
                        </div>
                      </div>

                      {/* Right: Quick actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployeeId(emp.id)
                            setFeedbackType('praising')
                            setFeedbackModalOpen(true)
                          }}
                          className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-1"
                        >
                          <Award size={14} />
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
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-1"
                        >
                          <Compass size={14} />
                          Correct
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Goals List */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-slate-400" />
                  Active Performance Goals
                </CardTitle>
                <CardDescription>Continuous progress logs and target timelines.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 p-0">
              {goals.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No active goals set. Start by creating a One-Minute Goal for your team!
                </div>
              ) : (
                goals.map((goal) => (
                  <div key={goal.id} className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-slate-800">{goal.objective}</h4>
                        <p className="text-xs text-slate-400 mt-1 font-medium">
                          Assigned to: <strong className="text-slate-600">{goal.profiles.full_name || 'Anonymous'}</strong>
                        </p>
                      </div>
                      <GoalStatusBadge status={goal.status} />
                    </div>

                    <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <strong>Expected Result:</strong> {goal.expected_result}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs font-semibold text-slate-400">
                      <span>Deadline: {new Date(goal.deadline).toLocaleDateString()}</span>
                      
                      <div className="flex items-center gap-2 w-full sm:w-1/2">
                        <span className="shrink-0">{goal.progress}%</span>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              goal.status === 'completed' 
                                ? 'bg-emerald-500' 
                                : goal.status === 'behind' 
                                ? 'bg-rose-500' 
                                : 'bg-slate-800'
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

        {/* Right Column: Attention Areas & Activity Feed */}
        <div className="space-y-6">
          {/* Attention Box */}
          {attentionEmployees.length > 0 && (
            <Card className="border-rose-100 bg-rose-50/20">
              <CardHeader className="border-rose-50">
                <div>
                  <CardTitle className="flex items-center gap-2 text-rose-700">
                    <AlertCircle size={18} />
                    Requires Attention
                  </CardTitle>
                  <CardDescription className="text-rose-600/70">
                    Team members with goals falling behind or missing recent feedback loops.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {attentionEmployees.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between gap-2 p-3 bg-white border border-rose-100/50 rounded-xl shadow-sm">
                    <div>
                      <h5 className="font-bold text-sm text-slate-800">{emp.full_name}</h5>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full uppercase mt-1 inline-block">
                        {goals.some(g => g.employee_id === emp.id && g.status === 'behind') ? 'Behind Goal' : 'No Feedback Loop'}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedEmployeeId(emp.id)
                        setFeedbackType('praising')
                        setFeedbackModalOpen(true)
                      }}
                      className="text-rose-700 hover:bg-rose-100/40 p-1 rounded-lg"
                    >
                      <ArrowRight size={16} />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recent Feedback Feed */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare size={18} className="text-slate-400" />
                  Recent Feedbacks
                </CardTitle>
                <CardDescription>Praisings and corrections timeline logs.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {feedbacks.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-4">
                  No feedback logged yet. Be sure to catch your employees doing something right today!
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
                        <span className="font-bold text-sm text-slate-800">
                          {fb.profiles.full_name}
                        </span>
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
                        {new Date(fb.created_at).toLocaleDateString()} at {new Date(fb.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
      {/* CREATE GOAL MODAL */}
      {/* ============================================================ */}
      {goalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-lg">Set One-Minute Goal</h3>
              <button onClick={() => setGoalModalOpen(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateGoal} className="p-5 space-y-4">
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100">{error}</div>}
              
              <div>
                <label htmlFor="employee_id" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Assign Employee
                </label>
                <select
                  id="employee_id"
                  name="employee_id"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-omm-primary bg-white"
                >
                  <option value="">-- Select employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="objective" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Objective
                </label>
                <input
                  id="objective"
                  name="objective"
                  type="text"
                  required
                  placeholder="e.g. Resolve 20 customer support complaints"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-omm-primary bg-white"
                />
              </div>

              <div>
                <label htmlFor="expected_result" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Expected Result / Success Metrics
                </label>
                <textarea
                  id="expected_result"
                  name="expected_result"
                  required
                  rows={3}
                  placeholder="e.g. Average response time must be kept below 10 minutes and CSAT above 90%."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-omm-primary bg-white"
                />
              </div>

              <div>
                <label htmlFor="deadline" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Target Deadline
                </label>
                <input
                  id="deadline"
                  name="deadline"
                  type="date"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-omm-primary bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setGoalModalOpen(false)}>Cancel</Button>
                <Button type="submit" loading={submittingGoal}>Set Goal</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* LOG FEEDBACK MODAL (PRAISE / CORRECTION) */}
      {/* ============================================================ */}
      {feedbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-lg">Log One-Minute Feedback</h3>
              <button onClick={() => setFeedbackModalOpen(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateFeedback} className="p-5 space-y-4">
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100">{error}</div>}

              {/* Feedback Type Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Feedback Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center justify-center gap-2 p-2.5 border rounded-xl cursor-pointer text-sm font-semibold transition ${feedbackType === 'praising' ? 'border-emerald-500 bg-emerald-50/35 text-emerald-600' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                    <input
                      type="radio"
                      name="feedbackType"
                      value="praising"
                      checked={feedbackType === 'praising'}
                      onChange={() => setFeedbackType('praising')}
                      className="sr-only"
                    />
                    <Award size={14} />
                    Praising
                  </label>
                  <label className={`flex items-center justify-center gap-2 p-2.5 border rounded-xl cursor-pointer text-sm font-semibold transition ${feedbackType === 'correction' ? 'border-rose-500 bg-rose-50/35 text-rose-600' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                    <input
                      type="radio"
                      name="feedbackType"
                      value="correction"
                      checked={feedbackType === 'correction'}
                      onChange={() => setFeedbackType('correction')}
                      className="sr-only"
                    />
                    <Compass size={14} />
                    Correction
                  </label>
                </div>
              </div>
              
              <div>
                <label htmlFor="employee_id_fb" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Team Member
                </label>
                <select
                  id="employee_id_fb"
                  name="employee_id"
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-omm-primary bg-white"
                >
                  <option value="">-- Select team member --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.email})</option>
                  ))}
                </select>
              </div>

              {/* Optional Goal binding */}
              <div>
                <label htmlFor="goal_id" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Associated Goal (Optional)
                </label>
                <select
                  id="goal_id"
                  name="goal_id"
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-omm-primary bg-white"
                >
                  <option value="">-- Generic Feedback (No goal link) --</option>
                  {goals.filter(g => g.employee_id === selectedEmployeeId).map(g => (
                    <option key={g.id} value={g.id}>{g.objective}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {feedbackType === 'praising' ? 'Praise Message (Be Immediate & Specific)' : 'Correction Message (Address the Behavior, support the Person)'}
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  placeholder={
                    feedbackType === 'praising'
                      ? 'e.g. John, you exceeded your customer-support target this week and responded with a warm CSAT score. Excellent work!'
                      : 'e.g. John, I noticed average ticket response times have risen to 18 minutes this week. Let\'s align on what\'s blocking you so we can get back on track. I know you can do it.'
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-omm-primary bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setFeedbackModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant={feedbackType === 'praising' ? 'success' : 'danger'} loading={submittingFeedback}>
                  Submit {feedbackType === 'praising' ? 'Praise' : 'Correction'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
