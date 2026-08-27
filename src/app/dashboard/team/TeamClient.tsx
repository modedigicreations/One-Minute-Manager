'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, GoalStatusBadge } from '@/components/ui/Badge'
import { 
  Award, 
  Compass, 
  User, 
  ArrowLeft, 
  TrendingUp, 
  MessageSquare,
  AlertCircle
} from 'lucide-react'
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
}

interface Feedback {
  id: string
  type: 'praising' | 'correction'
  message: string
  created_at: string
  employee_id: string
}

interface TeamClientProps {
  employees: Employee[]
  goals: Goal[]
  feedbacks: Feedback[]
}

export default function TeamClient({ employees, goals, feedbacks }: TeamClientProps) {
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'praising' | 'correction'>('praising')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedEmp = employees.find(e => e.id === selectedEmpId)
  const selectedGoals = goals.filter(g => g.employee_id === selectedEmpId)
  const selectedFeedbacks = feedbacks.filter(f => f.employee_id === selectedEmpId)

  async function handleCreateFeedback(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedEmpId) return

    setSubmittingFeedback(true)
    setError(null)

    const formData = new FormData()
    formData.append('employee_id', selectedEmpId)
    formData.append('type', feedbackType)
    formData.append('message', feedbackMessage)

    const res = await createFeedbackAction(formData)

    if (res.success) {
      setFeedbackModalOpen(false)
      setFeedbackMessage('')
      window.location.reload()
    } else {
      setError(res.error || 'Failed to submit feedback')
      setSubmittingFeedback(false)
    }
  }

  // If a team member is selected, show their specific drill-down details
  if (selectedEmp) {
    const behindGoalsCount = selectedGoals.filter(g => g.status === 'behind').length

    return (
      <div className="space-y-6">
        {/* Header navigation */}
        <button 
          onClick={() => setSelectedEmpId(null)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider transition cursor-pointer"
        >
          <ArrowLeft size={14} />
          Back to Team List
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-2xl">
              {selectedEmp.full_name ? selectedEmp.full_name[0].toUpperCase() : 'E'}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                {selectedEmp.full_name || 'Team Member'}
              </h1>
              <p className="text-slate-500 text-sm">{selectedEmp.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="success"
              onClick={() => {
                setFeedbackType('praising')
                setFeedbackModalOpen(true)
              }}
              className="flex items-center gap-1.5"
            >
              <Award size={16} />
              Log Praise
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setFeedbackType('correction')
                setFeedbackModalOpen(true)
              }}
              className="flex items-center gap-1.5"
            >
              <Compass size={16} />
              Log Correction
            </Button>
          </div>
        </div>

        {/* Drill down Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Goals list (Span 2) */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-slate-400" />
                    Performance Goals
                  </CardTitle>
                  <CardDescription>Expectations and current completion progress.</CardDescription>
                </div>
                {behindGoalsCount > 0 && (
                  <Badge variant="danger">{behindGoalsCount} Behind</Badge>
                )}
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 p-0">
                {selectedGoals.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    No goals assigned to this employee. Set a new performance goal from the Dashboard.
                  </div>
                ) : (
                  selectedGoals.map((goal) => (
                    <div key={goal.id} className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="font-bold text-slate-800">{goal.objective}</h4>
                        <GoalStatusBadge status={goal.status} />
                      </div>

                      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <strong>Expected Result:</strong> {goal.expected_result}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs font-semibold text-slate-400">
                        <span>Deadline: {new Date(goal.deadline).toLocaleDateString()}</span>
                        
                        <div className="flex items-center gap-2 w-full sm:w-1/2">
                          <span>{goal.progress}%</span>
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

          {/* Feedback loop timeline history */}
          <div>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-slate-400" />
                    Feedback History
                  </CardTitle>
                  <CardDescription>Praisings and corrections logged for this member.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {selectedFeedbacks.length === 0 ? (
                  <div className="text-center text-slate-400 text-sm py-4">
                    No feedback history.
                  </div>
                ) : (
                  selectedFeedbacks.map((fb) => (
                    <div key={fb.id} className="flex gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
                        fb.type === 'praising' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : 'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        {fb.type === 'praising' ? <Award size={16} /> : <Compass size={16} />}
                      </div>
                      <div className="space-y-1">
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold border tracking-wide uppercase ${
                          fb.type === 'praising' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {fb.type === 'praising' ? 'Praise' : 'Correction'}
                        </span>
                        <p className="text-xs text-slate-500 leading-relaxed italic">
                          &ldquo;{fb.message}&rdquo;
                        </p>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          {new Date(fb.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FEEDBACK MODAL */}
        {feedbackModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <h3 className="font-bold text-lg">Log One-Minute Feedback</h3>
                <button onClick={() => setFeedbackModalOpen(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
              </div>
              <form onSubmit={handleCreateFeedback} className="p-5 space-y-4">
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100">{error}</div>}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Feedback Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFeedbackType('praising')}
                      className={`flex items-center justify-center gap-2 p-2.5 border rounded-xl cursor-pointer text-sm font-semibold transition ${feedbackType === 'praising' ? 'border-emerald-500 bg-emerald-50/35 text-emerald-600' : 'border-slate-200 bg-white text-slate-500'}`}
                    >
                      <Award size={14} />
                      Praising
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackType('correction')}
                      className={`flex items-center justify-center gap-2 p-2.5 border rounded-xl cursor-pointer text-sm font-semibold transition ${feedbackType === 'correction' ? 'border-rose-500 bg-rose-50/35 text-rose-600' : 'border-slate-200 bg-white text-slate-500'}`}
                    >
                      <Compass size={14} />
                      Correction
                    </button>
                  </div>
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
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder={
                      feedbackType === 'praising'
                        ? 'e.g. John, excellent work exceeding support targets today. Love the customer care!'
                        : 'e.g. John, response times rose today. Let\'s align on what\'s blocking us so we can fix it early. You\'ve got this.'
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

  // Otherwise, render list of team members
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">My Team</h1>
        <p className="text-slate-500 text-sm">Detailed overview of active team goals and feedback loops.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((emp) => {
          const empGoals = goals.filter(g => g.employee_id === emp.id)
          const behindCount = empGoals.filter(g => g.status === 'behind').length
          const completedCount = empGoals.filter(g => g.status === 'completed').length

          return (
            <Card 
              key={emp.id} 
              className="hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
              onClick={() => setSelectedEmpId(emp.id)}
            >
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-lg">
                    {emp.full_name ? emp.full_name[0].toUpperCase() : 'E'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{emp.full_name || 'Anonymous Employee'}</h3>
                    <p className="text-xs text-slate-400 truncate">{emp.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 text-center">
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Goals</span>
                    <span className="text-lg font-extrabold text-slate-700">{empGoals.length}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Completed</span>
                    <span className="text-lg font-extrabold text-emerald-600">{completedCount}</span>
                  </div>
                </div>

                {behindCount > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-100/50 p-2.5 rounded-xl font-bold">
                    <AlertCircle size={14} />
                    {behindCount} goal(s) falling behind!
                  </div>
                )}
              </CardContent>
              <CardHeader className="bg-slate-50 border-t border-slate-100 py-3 rounded-b-2xl">
                <span className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition">
                  View Profile & Feedback
                </span>
              </CardHeader>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
