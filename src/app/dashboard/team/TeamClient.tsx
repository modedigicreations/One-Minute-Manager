'use client'

import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { GoalStatusBadge } from '@/components/ui/Badge'
import { 
  Award, 
  Compass, 
  ArrowLeft, 
  TrendingUp, 
  MessageSquare,
  AlertCircle,
  Copy,
  Check,
  Search,
  Users,
  ArrowRight,
  X,
  Send
} from 'lucide-react'
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
}

interface Feedback {
  id: string
  type: 'praising' | 'correction'
  message: string
  created_at: string
  employee_id: string
}

interface TeamClientProps {
  managerProfile?: {
    full_name: string | null
    email: string
  }
  employees: Employee[]
  goals: Goal[]
  feedbacks: Feedback[]
}

export default function TeamClient({ managerProfile, employees, goals, feedbacks }: TeamClientProps) {
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'praising' | 'correction'>('praising')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search filter
  const [search, setSearch] = useState('')
  const [copiedEmail, setCopiedEmail] = useState(false)

  const selectedEmp = employees.find(e => e.id === selectedEmpId)
  const selectedGoals = goals.filter(g => g.employee_id === selectedEmpId)
  const selectedFeedbacks = feedbacks.filter(f => f.employee_id === selectedEmpId)

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees
    const q = search.toLowerCase()
    return employees.filter(e => 
      (e.full_name || '').toLowerCase().includes(q) || 
      e.email.toLowerCase().includes(q)
    )
  }, [employees, search])

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

  function handleCopyEmail() {
    if (!managerProfile?.email) return
    navigator.clipboard.writeText(managerProfile.email)
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  // If a team member is selected, show their specific drill-down details
  if (selectedEmp) {
    const behindGoalsCount = selectedGoals.filter(g => g.status === 'behind').length
    const completedGoalsCount = selectedGoals.filter(g => g.status === 'completed').length

    return (
      <div className="space-y-6 pb-12">
        {/* Header navigation */}
        <button 
          onClick={() => setSelectedEmpId(null)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 uppercase tracking-wider transition cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Team Roster</span>
        </button>

        {/* Profile Card */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 text-white flex items-center justify-center font-extrabold text-xl sm:text-2xl shadow-sm shrink-0">
              {selectedEmp.full_name ? selectedEmp.full_name[0].toUpperCase() : 'E'}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight truncate">
                {selectedEmp.full_name || 'Team Member'}
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm font-medium truncate">{selectedEmp.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="success"
              onClick={() => {
                setFeedbackType('praising')
                setFeedbackModalOpen(true)
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs py-2"
            >
              <Award size={15} />
              <span>Log Praise</span>
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setFeedbackType('correction')
                setFeedbackModalOpen(true)
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs py-2"
            >
              <Compass size={15} />
              <span>Log Re-Direct</span>
            </Button>
          </div>
        </div>

        {/* Quick Stats for this member */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <div className="p-3 sm:p-4 bg-white rounded-xl border border-slate-200/80 text-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Goals</span>
            <span className="text-lg sm:text-xl font-extrabold text-slate-900">{selectedGoals.length}</span>
          </div>
          <div className="p-3 sm:p-4 bg-white rounded-xl border border-slate-200/80 text-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Done</span>
            <span className="text-lg sm:text-xl font-extrabold text-emerald-600">{completedGoalsCount}</span>
          </div>
          <div className="p-3 sm:p-4 bg-white rounded-xl border border-slate-200/80 text-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Re-Direct</span>
            <span className={`text-lg sm:text-xl font-extrabold ${behindGoalsCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {behindGoalsCount}
            </span>
          </div>
        </div>

        {/* Drill down Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Active Goals list (Span 2) */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <TrendingUp size={18} className="text-slate-500" />
                    <span>Performance Goals</span>
                  </CardTitle>
                  <CardDescription className="text-xs">Expectations and current completion progress.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 p-0">
                {selectedGoals.length === 0 ? (
                  <div className="p-6 sm:p-8 text-center text-slate-400 text-xs">
                    No goals assigned to this team member yet. Set one from the main dashboard!
                  </div>
                ) : (
                  selectedGoals.map((goal) => (
                    <div key={goal.id} className="p-4 sm:p-5 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">{goal.objective}</h4>
                        <GoalStatusBadge status={goal.status} />
                      </div>

                      <div className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <strong className="text-slate-700">Expected Result:</strong> {goal.expected_result}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-semibold text-slate-400">
                        <span className="text-slate-500 text-[11px]">Deadline: {formatStaticDate(goal.deadline)}</span>
                        
                        <div className="flex items-center gap-2 w-full sm:w-1/2">
                          <span className="text-xs font-bold text-slate-700">{goal.progress}%</span>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
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

          {/* Feedback History (Span 1) */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="p-4 pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <MessageSquare size={17} className="text-slate-500" />
                    <span>Feedback History</span>
                  </CardTitle>
                  <CardDescription className="text-xs">Praisings and corrections logged.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3.5 p-4 pt-1">
                {selectedFeedbacks.length === 0 ? (
                  <div className="text-center text-slate-400 text-xs py-5">
                    No feedback recorded yet. Use the buttons above to log immediate praise!
                  </div>
                ) : (
                  selectedFeedbacks.map((fb) => (
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
                        <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50 p-2 rounded-lg border border-slate-100">
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

        {/* FEEDBACK MODAL (Bottom Sheet) */}
        {feedbackModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
              <div className="sm:hidden w-12 h-1 bg-slate-300 rounded-full mx-auto my-2 shrink-0" />
              <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                    feedbackType === 'praising' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                  }`}>
                    {feedbackType === 'praising' ? <Award size={15} /> : <Compass size={15} />}
                  </div>
                  <h3 className="font-bold text-sm sm:text-base">Deliver One-Minute Feedback</h3>
                </div>
                <button onClick={() => setFeedbackModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer p-1">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateFeedback} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                {error && <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-xs font-bold border border-rose-200">{error}</div>}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Feedback Type
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setFeedbackType('praising')}
                      className={`flex items-center justify-center gap-1.5 p-2.5 border rounded-xl cursor-pointer text-xs sm:text-sm font-semibold transition ${
                        feedbackType === 'praising' 
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-700 ring-2 ring-emerald-500/20' 
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Award size={15} />
                      Praising
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackType('correction')}
                      className={`flex items-center justify-center gap-1.5 p-2.5 border rounded-xl cursor-pointer text-xs sm:text-sm font-semibold transition ${
                        feedbackType === 'correction' 
                          ? 'border-rose-500 bg-rose-50/70 text-rose-700 ring-2 ring-rose-500/20' 
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Compass size={15} />
                      Re-Direct
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {feedbackType === 'praising' ? 'Praise Message (Be immediate & specific)' : 'Re-Direct Message (Address behavior, reaffirm person)'}
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
                        ? `e.g. ${selectedEmp.full_name}, great work delivering on your target today!`
                        : `e.g. ${selectedEmp.full_name}, let's review what happened with the deadline and get aligned.`
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 pb-safe">
                  <Button type="button" variant="ghost" onClick={() => setFeedbackModalOpen(false)}>Cancel</Button>
                  <Button 
                    type="submit" 
                    variant={feedbackType === 'praising' ? 'success' : 'danger'} 
                    loading={submittingFeedback}
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
      </div>
    )
  }

  // Otherwise, render list of team members
  return (
    <div className="space-y-5 sm:space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">My Team</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Overview of team members, active goals, and praise tracking.</p>
        </div>

        {employees.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team member..."
              className="w-full pl-8 pr-3 py-2 sm:py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        )}
      </div>

      {/* When 0 employees exist: Onboarding Empty State */}
      {employees.length === 0 ? (
        <Card className="p-6 sm:p-8 text-center max-w-xl mx-auto space-y-4 sm:space-y-5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
            <Users size={24} />
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">No Team Members Linked Yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              Employees link to your workspace when registering. Share your manager email address so they can select you during account creation.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 max-w-md mx-auto space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-left">
              Share With Your Team:
            </span>
            <div className="flex items-center justify-between bg-white border border-slate-200 px-3 py-2 rounded-lg gap-2">
              <span className="text-xs font-mono font-bold text-slate-800 truncate">
                {managerProfile?.email || 'Your Registered Email'}
              </span>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="text-slate-600 hover:text-slate-900 transition flex items-center gap-1 text-xs font-semibold shrink-0 cursor-pointer ml-2"
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
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredEmployees.map((emp) => {
            const empGoals = goals.filter(g => g.employee_id === emp.id)
            const behindCount = empGoals.filter(g => g.status === 'behind').length
            const completedCount = empGoals.filter(g => g.status === 'completed').length

            return (
              <Card 
                key={emp.id} 
                hover
                className="cursor-pointer flex flex-col justify-between"
                onClick={() => setSelectedEmpId(emp.id)}
              >
                <CardContent className="p-4 sm:p-6 space-y-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center font-extrabold text-slate-700 text-base sm:text-lg shadow-xs shrink-0">
                      {emp.full_name ? emp.full_name[0].toUpperCase() : 'E'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{emp.full_name || 'Anonymous Employee'}</h3>
                      <p className="text-xs text-slate-400 truncate">{emp.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-0.5 text-center">
                    <div className="p-2 sm:p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Goals</span>
                      <span className="text-base sm:text-lg font-extrabold text-slate-800">{empGoals.length}</span>
                    </div>
                    <div className="p-2 sm:p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Done</span>
                      <span className="text-base sm:text-lg font-extrabold text-emerald-600">{completedCount}</span>
                    </div>
                  </div>

                  {behindCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200/80 p-2.5 rounded-xl font-bold">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{behindCount} goal(s) behind!</span>
                    </div>
                  )}
                </CardContent>
                <CardHeader className="bg-slate-50/70 border-t border-slate-100 py-2.5 sm:py-3 rounded-b-2xl">
                  <span className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition">
                    <span>View Profile & Performance</span>
                    <ArrowRight size={13} />
                  </span>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
