'use client'

import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Users, 
  UserCheck, 
  UserX, 
  Building2, 
  Briefcase, 
  Search, 
  Filter, 
  ArrowRight, 
  X, 
  ShieldCheck, 
  Sparkles, 
  Edit2, 
  CheckSquare, 
  Square,
  AlertCircle
} from 'lucide-react'
import { 
  assignStaffAction, 
  assignStaffByCriteriaAction, 
  updateStaffAssignmentDetailsAction 
} from '@/app/dashboard/director/actions'

export interface StaffProfile {
  id: string
  full_name: string | null
  email: string
  role: 'employee' | 'manager' | 'managing_director'
  manager_id: string | null
  department: string | null
  job_title: string | null
  avatar_url: string | null
}

export interface ManagerProfile {
  id: string
  full_name: string | null
  email: string
  role: string
  department: string | null
  employeeCount: number
}

interface StaffAssignmentManagerProps {
  staffList: StaffProfile[]
  managers: ManagerProfile[]
}

const PRESET_DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Operations',
  'Finance',
  'Human Resources',
  'Customer Support',
  'General',
]

export default function StaffAssignmentManager({ staffList, managers }: StaffAssignmentManagerProps) {
  // View mode: 'table' | 'by-manager' | 'by-dept'
  const [viewMode, setViewMode] = useState<'table' | 'by-manager' | 'by-dept'>('table')

  // Search & Filter state
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all')
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all')

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modals state
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [editModalStaff, setEditModalStaff] = useState<StaffProfile | null>(null)

  // Bulk modal state
  const [criteriaDept, setCriteriaDept] = useState<string>('all')
  const [criteriaRole, setCriteriaRole] = useState<string>('all')
  const [criteriaManagerId, setCriteriaManagerId] = useState<string>('')
  const [criteriaNewDept, setCriteriaNewDept] = useState<string>('')

  // Floating bulk assign bar state
  const [floatingManagerId, setFloatingManagerId] = useState<string>('')

  // Operation loading & status state
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Manager lookup map
  const managerMap = useMemo(() => {
    return new Map(managers.map(m => [m.id, m]))
  }, [managers])

  // Distinct departments in current dataset
  const allDepartments = useMemo(() => {
    const set = new Set<string>()
    staffList.forEach(s => {
      if (s.department && s.department.trim()) {
        set.add(s.department.trim())
      }
    })
    PRESET_DEPARTMENTS.forEach(d => set.add(d))
    return Array.from(set).sort()
  }, [staffList])

  // Metrics
  const totalCount = staffList.length
  const assignedCount = staffList.filter(s => !!s.manager_id).length
  const unassignedCount = staffList.filter(s => !s.manager_id).length

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter(staff => {
      // 1. Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = (staff.full_name || '').toLowerCase().includes(q)
        const matchEmail = staff.email.toLowerCase().includes(q)
        const matchDept = (staff.department || '').toLowerCase().includes(q)
        const matchJob = (staff.job_title || '').toLowerCase().includes(q)
        const mgr = staff.manager_id ? managerMap.get(staff.manager_id) : null
        const matchMgr = (mgr?.full_name || mgr?.email || '').toLowerCase().includes(q)
        if (!matchName && !matchEmail && !matchDept && !matchJob && !matchMgr) {
          return false
        }
      }

      // 2. Department filter
      if (selectedDept !== 'all') {
        const dept = staff.department || 'General'
        if (dept.toLowerCase() !== selectedDept.toLowerCase()) return false
      }

      // 3. Role filter
      if (selectedRoleFilter !== 'all') {
        if (staff.role !== selectedRoleFilter) return false
      }

      // 4. Assignment status filter
      if (assignmentFilter === 'assigned' && !staff.manager_id) return false
      if (assignmentFilter === 'unassigned' && !!staff.manager_id) return false

      return true
    })
  }, [staffList, search, selectedDept, selectedRoleFilter, assignmentFilter, managerMap])

  // Bulk matching preview
  const bulkPreviewMatches = useMemo(() => {
    if (!bulkModalOpen) return []
    return staffList.filter(s => {
      // Exclude target manager from being assigned to themselves
      if (criteriaManagerId && s.id === criteriaManagerId) return false

      if (criteriaDept !== 'all') {
        const dept = s.department || 'General'
        if (dept.toLowerCase() !== criteriaDept.toLowerCase()) return false
      }

      if (criteriaRole !== 'all') {
        if (s.role !== criteriaRole) return false
      }

      return true
    })
  }, [staffList, bulkModalOpen, criteriaDept, criteriaRole, criteriaManagerId])

  // Select all / Deselect all handlers
  function handleSelectAll() {
    if (selectedIds.length === filteredStaff.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredStaff.map(s => s.id))
    }
  }

  function handleToggleSelect(id: string) {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  // Quick single reassignment handler
  async function handleQuickReassign(staffId: string, newManagerId: string) {
    if (!newManagerId) return
    setSubmitting(true)
    setStatusMessage(null)

    const res = await assignStaffAction([staffId], newManagerId)
    setSubmitting(false)

    if (res.success) {
      setStatusMessage({ 
        type: 'success', 
        text: `Successfully assigned staff member to ${res.managerName || 'manager'}.` 
      })
      window.location.reload()
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to reassign staff member.' })
    }
  }

  // Floating multi-select assignment execution
  async function handleExecuteFloatingAssign() {
    if (!floatingManagerId || selectedIds.length === 0) return
    setSubmitting(true)
    setStatusMessage(null)

    const res = await assignStaffAction(selectedIds, floatingManagerId)
    setSubmitting(false)

    if (res.success) {
      setStatusMessage({ 
        type: 'success', 
        text: `Assigned ${res.count} staff member(s) to ${res.managerName || 'manager'}.` 
      })
      setSelectedIds([])
      setFloatingManagerId('')
      window.location.reload()
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to execute assignment.' })
    }
  }

  // Bulk Criteria modal submission
  async function handleExecuteBulkCriteria(e: React.FormEvent) {
    e.preventDefault()
    if (!criteriaManagerId) {
      setStatusMessage({ type: 'error', text: 'Please select a target manager.' })
      return
    }

    if (criteriaDept === 'all' && criteriaRole === 'all') {
      setStatusMessage({ type: 'error', text: 'Please select at least one criteria (Department or Role).' })
      return
    }

    setSubmitting(true)
    setStatusMessage(null)

    const res = await assignStaffByCriteriaAction({
      department: criteriaDept === 'all' ? undefined : criteriaDept,
      role: criteriaRole === 'all' ? undefined : criteriaRole,
      targetManagerId: criteriaManagerId,
      newDepartment: criteriaNewDept ? criteriaNewDept : undefined,
    })

    setSubmitting(false)

    if (res.success) {
      setBulkModalOpen(false)
      setStatusMessage({ 
        type: 'success', 
        text: `Successfully assigned ${res.count} staff members to ${res.managerName || 'manager'}.` 
      })
      window.location.reload()
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to assign staff by criteria.' })
    }
  }

  // Edit single staff member details
  async function handleSaveEditDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editModalStaff) return

    setSubmitting(true)
    setStatusMessage(null)

    const form = new FormData(e.currentTarget)
    const managerId = (form.get('manager_id') as string) || null
    const department = (form.get('department') as string)?.trim() || 'General'
    const jobTitle = (form.get('job_title') as string)?.trim() || ''
    const role = (form.get('role') as 'employee' | 'manager') || 'employee'

    const res = await updateStaffAssignmentDetailsAction(editModalStaff.id, {
      managerId,
      department,
      jobTitle,
      role,
    })

    setSubmitting(false)

    if (res.success) {
      setEditModalStaff(null)
      setStatusMessage({ type: 'success', text: 'Staff profile and manager assignment updated.' })
      window.location.reload()
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to update staff profile.' })
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* ============================================================ */}
      {/* 1. EXECUTIVE COCKPIT HEADER */}
      {/* ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-7 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <ShieldCheck size={13} className="text-amber-400" />
              Super Admin Feature
            </span>
            <span className="text-xs font-mono text-slate-400">Organization Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Staff Allocation & Assignments 👥
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Assign or reassign any staff member to any manager based on their department or role. Execute individual assignments, filter by department, or allocate teams in bulk.
          </p>
        </div>

        <div className="z-10 shrink-0 flex items-center gap-2.5">
          <Button
            onClick={() => {
              setCriteriaDept('all')
              setCriteriaRole('all')
              setCriteriaManagerId(managers[0]?.id || '')
              setCriteriaNewDept('')
              setBulkModalOpen(true)
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs py-2.5 px-4 shadow-lg shadow-amber-500/20 border border-amber-400/40 cursor-pointer"
          >
            <Sparkles size={14} className="fill-slate-950" />
            <span>Assign by Dept / Role</span>
          </Button>
        </div>
      </div>

      {/* Status alerts */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span>{statusMessage.text}</span>
          <button 
            type="button" 
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. STATS & DISTRIBUTION CARDS */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Card 1: Total Staff */}
        <Card hover className="relative overflow-hidden border-slate-200/80">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-700 to-slate-900" />
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Total Staff Members
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{totalCount}</span>
                <span className="text-xs font-semibold text-slate-500">members</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                {staffList.filter(s => s.role === 'employee').length} employees, {staffList.filter(s => s.role === 'manager').length} managers
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <Users size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Assigned Staff */}
        <Card 
          hover 
          onClick={() => setAssignmentFilter(assignmentFilter === 'assigned' ? 'all' : 'assigned')}
          className={`relative overflow-hidden border-slate-200/80 cursor-pointer transition ${
            assignmentFilter === 'assigned' ? 'ring-2 ring-emerald-500 shadow-md' : ''
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Assigned to Managers
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{assignedCount}</span>
                <span className="text-xs font-bold text-slate-400">({totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 0}%)</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                Active reporting lines established
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <UserCheck size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Unassigned Staff */}
        <Card 
          hover 
          onClick={() => setAssignmentFilter(assignmentFilter === 'unassigned' ? 'all' : 'unassigned')}
          className={`relative overflow-hidden border-slate-200/80 cursor-pointer transition ${
            assignmentFilter === 'unassigned' ? 'ring-2 ring-amber-500 shadow-md' : ''
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Unassigned Staff
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl sm:text-3xl font-extrabold ${unassignedCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {unassignedCount}
                </span>
                {unassignedCount > 0 && (
                  <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded border border-amber-200 uppercase">
                    Needs Manager
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                {unassignedCount === 0 ? 'All staff assigned' : 'Click to filter unassigned'}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <UserX size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Available Managers */}
        <Card hover className="relative overflow-hidden border-slate-200/80">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Available Managers
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{managers.length}</span>
                <span className="text-xs font-semibold text-slate-500">leaders</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                Across {allDepartments.length} active departments
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Briefcase size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* 3. FILTERS, SEARCH & VIEW SWITCHER */}
      {/* ============================================================ */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Row 1: Search & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by staff name, email, department, role, or manager..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Controls: Role Filter & View Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Role Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Filter size={13} className="text-slate-400 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role:</span>
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="text-xs font-semibold bg-transparent text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="employee">Employees Only</option>
                <option value="manager">Managers Only</option>
              </select>
            </div>

            {/* Assignment Status Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status:</span>
              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value as 'all' | 'assigned' | 'unassigned')}
                className="text-xs font-semibold bg-transparent text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned ({unassignedCount})</option>
              </select>
            </div>

            {/* View Mode Buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Roster Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('by-manager')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'by-manager' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Manager Teams
              </button>
              <button
                type="button"
                onClick={() => setViewMode('by-dept')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'by-dept' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                By Department
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Department Filter Chips */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mr-1 shrink-0 flex items-center gap-1">
              <Building2 size={13} />
              Department:
            </span>

            <button
              type="button"
              onClick={() => setSelectedDept('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedDept === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
              }`}
            >
              All ({totalCount})
            </button>

            {allDepartments.map(dept => {
              const countInDept = staffList.filter(s => (s.department || 'General').toLowerCase() === dept.toLowerCase()).length
              if (countInDept === 0 && selectedDept !== dept) return null

              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                    selectedDept.toLowerCase() === dept.toLowerCase()
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                  }`}
                >
                  {dept} ({countInDept})
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. MULTI-SELECT FLOATING ACTION BAR */}
      {/* ============================================================ */}
      {selectedIds.length > 0 && (
        <div className="sticky top-16 z-30 bg-slate-950 text-white p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center">
              {selectedIds.length}
            </span>
            <div>
              <p className="text-xs sm:text-sm font-bold text-white">
                {selectedIds.length} staff member{selectedIds.length > 1 ? 's' : ''} selected
              </p>
              <p className="text-[10px] text-slate-400">Choose a manager to allocate all selected staff in one click.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={floatingManagerId}
              onChange={(e) => setFloatingManagerId(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <option value="">-- Assign to Manager --</option>
              {managers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.full_name || m.email} ({m.employeeCount} reports)
                </option>
              ))}
            </select>

            <Button
              size="sm"
              variant="primary"
              disabled={!floatingManagerId || submitting}
              loading={submitting}
              onClick={handleExecuteFloatingAssign}
              className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 h-8"
            >
              <UserCheck size={13} className="mr-1" />
              Assign Selected
            </Button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 cursor-pointer font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. MAIN CONTENT DISPLAY (3 VIEW MODES) */}
      {/* ============================================================ */}

      {/* --- MODE A: ROSTER TABLE --- */}
      {viewMode === 'table' && (
        <Card className="overflow-hidden border-slate-200/80 shadow-xs">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-slate-400 hover:text-slate-800 transition cursor-pointer p-0.5"
                title={selectedIds.length === filteredStaff.length ? 'Deselect all' : 'Select all'}
              >
                {selectedIds.length > 0 && selectedIds.length === filteredStaff.length ? (
                  <CheckSquare size={18} className="text-slate-900" />
                ) : (
                  <Square size={18} />
                )}
              </button>
              <div>
                <CardTitle className="text-sm sm:text-base font-extrabold text-slate-900">
                  Staff Directory ({filteredStaff.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Showing active staff matching selected department and role filters.
                </CardDescription>
              </div>
            </div>

            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {filteredStaff.length} / {totalCount}
            </span>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            {filteredStaff.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                  <Users size={24} />
                </div>
                <h4 className="font-bold text-sm text-slate-800">No Staff Members Found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No staff match the current search or filter combination. Try resetting your department or role filters.
                </p>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => {
                    setSearch('')
                    setSelectedDept('all')
                    setSelectedRoleFilter('all')
                    setAssignmentFilter('all')
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-400 uppercase tracking-wider font-extrabold border-b border-slate-100 text-[10px]">
                    <th className="py-3 px-4 w-10 text-center">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Assigned Manager</th>
                    <th className="py-3 px-4 text-right">Quick Assign / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.map((staff) => {
                    const isSelected = selectedIds.includes(staff.id)
                    const assignedMgr = staff.manager_id ? managerMap.get(staff.manager_id) : null
                    const userInitial = staff.full_name ? staff.full_name[0].toUpperCase() : 'U'

                    return (
                      <tr 
                        key={staff.id} 
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isSelected ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(staff.id)}
                            className="text-slate-400 hover:text-slate-800 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare size={16} className="text-slate-900" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </td>

                        {/* Staff Member Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center font-extrabold text-slate-700 text-xs shadow-2xs shrink-0">
                              {userInitial}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                {staff.full_name || 'Staff Member'}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">{staff.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role / Job Title */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                              staff.role === 'manager'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {staff.role}
                            </span>
                            {staff.job_title && (
                              <p className="text-[11px] font-medium text-slate-500 truncate max-w-[140px]">
                                {staff.job_title}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-lg">
                            <Building2 size={11} className="text-slate-400" />
                            <span>{staff.department || 'General'}</span>
                          </span>
                        </td>

                        {/* Current Manager */}
                        <td className="py-3.5 px-4">
                          {assignedMgr ? (
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="truncate max-w-[150px]">{assignedMgr.full_name || assignedMgr.email}</span>
                              </p>
                              <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{assignedMgr.email}</p>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              <AlertCircle size={11} />
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Inline Manager Dropdown for Instant Reassignment */}
                            <select
                              value={staff.manager_id || ''}
                              onChange={(e) => handleQuickReassign(staff.id, e.target.value)}
                              disabled={submitting}
                              className="text-[11px] font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer max-w-[140px]"
                            >
                              <option value="" disabled>-- Reassign --</option>
                              {managers.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.full_name || m.email.split('@')[0]}
                                </option>
                              ))}
                            </select>

                            {/* Detailed Edit button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditModalStaff(staff)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-900"
                              title="Edit department, role, or manager"
                            >
                              <Edit2 size={13} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* --- MODE B: MANAGER TEAMS VIEW --- */}
      {viewMode === 'by-manager' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
              Manager Rosters & Direct Reports ({managers.length} Managers)
            </h3>
            <span className="text-xs text-slate-400">Direct reports grouped by supervising manager</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {managers.map((mgr) => {
              const teamReports = staffList.filter(s => s.manager_id === mgr.id)
              const deptReports = new Set(teamReports.map(s => s.department || 'General'))

              return (
                <Card key={mgr.id} hover className="flex flex-col justify-between border-slate-200/80">
                  <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0">
                          {mgr.full_name ? mgr.full_name[0].toUpperCase() : 'M'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{mgr.full_name || 'Manager'}</h4>
                          <p className="text-xs text-slate-400 truncate">{mgr.email}</p>
                        </div>
                      </div>
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase shrink-0">
                        {teamReports.length} reports
                      </span>
                    </div>

                    {/* Department chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-2">
                      {Array.from(deptReports).map(d => (
                        <span key={d} className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {d}
                        </span>
                      ))}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-2 flex-1 max-h-60 overflow-y-auto">
                    {teamReports.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4 italic">
                        No staff members currently assigned to this manager.
                      </p>
                    ) : (
                      teamReports.map(emp => (
                        <div 
                          key={emp.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50/80 hover:bg-slate-100/70 transition text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-slate-800 block truncate">{emp.full_name || emp.email}</span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {emp.department || 'General'} • {emp.job_title || emp.role}
                            </span>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditModalStaff(emp)}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-800"
                            title="Reassign or edit"
                          >
                            <Edit2 size={12} />
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>

                  <div className="p-3 bg-slate-50/70 border-t border-slate-100 rounded-b-2xl flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">Quick Allocate</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setCriteriaDept('all')
                        setCriteriaRole('all')
                        setCriteriaManagerId(mgr.id)
                        setCriteriaNewDept('')
                        setBulkModalOpen(true)
                      }}
                      className="text-[11px] font-bold h-7 px-2.5 flex items-center gap-1"
                    >
                      <span>Assign Staff to {mgr.full_name?.split(' ')[0] || 'Manager'}</span>
                      <ArrowRight size={11} />
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* --- MODE C: BY DEPARTMENT VIEW --- */}
      {viewMode === 'by-dept' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
              Department Cohorts ({allDepartments.length} Departments)
            </h3>
            <span className="text-xs text-slate-400">Allocate entire departmental teams to designated leaders</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {allDepartments.map((dept) => {
              const deptStaff = staffList.filter(s => (s.department || 'General').toLowerCase() === dept.toLowerCase())
              const unassignedInDept = deptStaff.filter(s => !s.manager_id).length

              return (
                <Card key={dept} hover className="flex flex-col justify-between border-slate-200/80">
                  <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                          <Building2 size={15} />
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">{dept}</h4>
                      </div>
                      <span className="text-xs font-extrabold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                        {deptStaff.length} staff
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 text-[11px]">
                      {unassignedInDept > 0 ? (
                        <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70">
                          {unassignedInDept} unassigned
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70">
                          100% assigned
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-2 flex-1 max-h-56 overflow-y-auto">
                    {deptStaff.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4 italic">No staff currently in {dept}.</p>
                    ) : (
                      deptStaff.map(emp => {
                        const mgr = emp.manager_id ? managerMap.get(emp.manager_id) : null
                        return (
                          <div 
                            key={emp.id}
                            className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50/80 hover:bg-slate-100/70 transition text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-slate-800 block truncate">{emp.full_name || emp.email}</span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                Mgr: {mgr?.full_name || 'None'} • {emp.job_title || emp.role}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditModalStaff(emp)}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-800"
                            >
                              <Edit2 size={12} />
                            </Button>
                          </div>
                        )
                      })
                    )}
                  </CardContent>

                  <div className="p-3 bg-slate-50/70 border-t border-slate-100 rounded-b-2xl">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setCriteriaDept(dept)
                        setCriteriaRole('all')
                        setCriteriaManagerId(managers[0]?.id || '')
                        setCriteriaNewDept('')
                        setBulkModalOpen(true)
                      }}
                      className="w-full text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Sparkles size={12} />
                      <span>Reallocate All {dept} Staff</span>
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. MODAL: ASSIGN BY DEPARTMENT OR ROLE (CRITERIA BULK) */}
      {/* ============================================================ */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Assign Staff by Dept or Role</h3>
                  <p className="text-xs text-slate-400">Bulk reallocate matching staff members to a manager</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setBulkModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteBulkCriteria} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
              {/* Step 1: Department Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Filter by Department
                </label>
                <select
                  value={criteriaDept}
                  onChange={(e) => setCriteriaDept(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="all">Any Department (All)</option>
                  {allDepartments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Role Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Filter by Role
                </label>
                <select
                  value={criteriaRole}
                  onChange={(e) => setCriteriaRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="all">Any Role (All)</option>
                  <option value="employee">Employees Only</option>
                  <option value="manager">Managers Only</option>
                </select>
              </div>

              {/* Step 3: Target Manager */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. Assign to Target Manager *
                </label>
                <select
                  required
                  value={criteriaManagerId}
                  onChange={(e) => setCriteriaManagerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">-- Choose Manager --</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || m.email} ({m.employeeCount} reports) — {m.department || 'Management'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional: Update Department */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Optional: Update Assigned Staff Department to:
                </label>
                <input
                  type="text"
                  value={criteriaNewDept}
                  onChange={(e) => setCriteriaNewDept(e.target.value)}
                  placeholder="e.g. Engineering (leave blank to keep existing)"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Live Preview Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Matching Staff Preview:
                  </span>
                  <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    {bulkPreviewMatches.length} staff member{bulkPreviewMatches.length === 1 ? '' : 's'}
                  </span>
                </div>

                {bulkPreviewMatches.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No staff members match the selected criteria.</p>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto pt-1">
                    {bulkPreviewMatches.slice(0, 10).map(s => (
                      <span key={s.id} className="text-[10px] font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-700">
                        {s.full_name || s.email}
                      </span>
                    ))}
                    {bulkPreviewMatches.length > 10 && (
                      <span className="text-[10px] font-bold text-slate-400">
                        +{bulkPreviewMatches.length - 10} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setBulkModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting || bulkPreviewMatches.length === 0 || !criteriaManagerId}
                  loading={submitting}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                >
                  <UserCheck size={14} className="mr-1.5" />
                  <span>Assign {bulkPreviewMatches.length} Staff</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. MODAL: EDIT INDIVIDUAL STAFF PROFILE & ASSIGNMENT */}
      {/* ============================================================ */}
      {editModalStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 text-emerald-400 flex items-center justify-center font-extrabold text-sm">
                  {editModalStaff.full_name ? editModalStaff.full_name[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">{editModalStaff.full_name || 'Staff Member'}</h3>
                  <p className="text-xs text-slate-400">{editModalStaff.email}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setEditModalStaff(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditDetails} className="p-6 space-y-4 text-xs sm:text-sm">
              {/* Department */}
              <div>
                <label htmlFor="department" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Department
                </label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  defaultValue={editModalStaff.department || 'General'}
                  list="departments-list"
                  placeholder="e.g. Engineering, Sales, Marketing"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <datalist id="departments-list">
                  {allDepartments.map(d => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>

              {/* Job Title */}
              <div>
                <label htmlFor="job_title" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Job Title / Designation
                </label>
                <input
                  id="job_title"
                  name="job_title"
                  type="text"
                  defaultValue={editModalStaff.job_title || ''}
                  placeholder="e.g. Senior Frontend Engineer, Designer"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* System Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  System Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center justify-center gap-2 p-2.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 text-xs font-semibold">
                    <input
                      type="radio"
                      name="role"
                      value="employee"
                      defaultChecked={editModalStaff.role === 'employee'}
                    />
                    <span>Employee</span>
                  </label>
                  <label className="flex items-center justify-center gap-2 p-2.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 text-xs font-semibold">
                    <input
                      type="radio"
                      name="role"
                      value="manager"
                      defaultChecked={editModalStaff.role === 'manager'}
                    />
                    <span>Manager</span>
                  </label>
                </div>
              </div>

              {/* Assigned Manager */}
              <div>
                <label htmlFor="manager_id" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assigned Manager
                </label>
                <select
                  id="manager_id"
                  name="manager_id"
                  defaultValue={editModalStaff.manager_id || ''}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">-- No Manager (Unassigned) --</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || m.email} ({m.department || 'Management'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setEditModalStaff(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={submitting}
                  className="font-bold"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
