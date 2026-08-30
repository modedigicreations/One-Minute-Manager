'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendNotificationInternal } from '@/app/dashboard/notifications/actions'

export async function flagLagAction(formData: FormData) {
  try {
    const supabase = await createClient()

    // 1. Verify user authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // 2. Verify director role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'managing_director') {
      return { success: false, error: 'Only Managing Directors can issue lag directives.' }
    }

    const manager_id = formData.get('manager_id') as string
    const employee_id = (formData.get('employee_id') as string) || null
    const goal_id = (formData.get('goal_id') as string) || null
    const flag_type = (formData.get('flag_type') as string) || 'custom'
    const directive = (formData.get('directive') as string)?.trim()

    if (!manager_id || !directive) {
      return { success: false, error: 'Target manager and directive instructions are required.' }
    }

    const { error } = await supabase
      .from('lag_flags')
      .insert({
        director_id: user.id,
        manager_id,
        employee_id: employee_id || null,
        goal_id: goal_id || null,
        flag_type,
        directive,
        status: 'open',
      })

    if (error) {
      return { success: false, error: error.message }
    }

    // Dispatch notification to the target manager
    await sendNotificationInternal({
      userId: manager_id,
      title: '🚨 Directive from Managing Director',
      message: directive,
      link: '/dashboard',
      type: 'directive',
    })

    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    console.error('Flag lag action error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to issue lag directive.' }
  }
}

export async function updateLagStatusAction(flagId: string, status: 'acknowledged' | 'resolved') {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const updatePayload: { status: 'acknowledged' | 'resolved'; resolved_at?: string | null } = { status }
    if (status === 'resolved') {
      updatePayload.resolved_at = new Date().toISOString()
    } else {
      updatePayload.resolved_at = null
    }

    const { error } = await supabase
      .from('lag_flags')
      .update(updatePayload)
      .eq('id', flagId)

    if (error) {
      return { success: false, error: error.message }
    }

    // If resolved, notify the Managing Director
    if (status === 'resolved') {
      const { data: flag } = await supabase
        .from('lag_flags')
        .select('director_id, directive')
        .eq('id', flagId)
        .single()

      if (flag?.director_id) {
        await sendNotificationInternal({
          userId: flag.director_id,
          title: '✅ Directive Resolved by Manager',
          message: `Directive marked resolved: "${flag.directive.substring(0, 60)}..."`,
          link: '/dashboard',
          type: 'directive',
        })
      }
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    console.error('Update lag status error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update directive status.' }
  }
}

// ============================================================
// STAFF ASSIGNMENT ACTIONS (SUPER ADMIN / MANAGING DIRECTOR)
// ============================================================

export interface StaffAssignmentOptions {
  department?: string
  jobTitle?: string
}

/**
 * Assign one or more staff members to a target manager.
 * Optionally update their department or job title at the same time.
 */
export async function assignStaffAction(
  staffIds: string[],
  managerId: string,
  options?: StaffAssignmentOptions
) {
  try {
    const supabase = await createClient()

    // 1. Verify user authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // 2. Verify director role
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'managing_director') {
      return { success: false, error: 'Only Super Admins (Managing Directors) can assign staff.' }
    }

    if (!staffIds || staffIds.length === 0) {
      return { success: false, error: 'At least one staff member must be selected.' }
    }

    if (!managerId) {
      return { success: false, error: 'A target manager must be selected.' }
    }

    // 3. Verify target manager exists & is eligible
    const { data: targetManager, error: mgrErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, department')
      .eq('id', managerId)
      .single()

    if (mgrErr || !targetManager) {
      return { success: false, error: 'Selected manager does not exist.' }
    }

    if (targetManager.role !== 'manager' && targetManager.role !== 'managing_director') {
      return { success: false, error: 'Target assignee must be a Manager or Managing Director.' }
    }

    // 4. Try RPC function first (handles transactional assignment safely)
    let updateSuccess = false
    try {
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('assign_staff_by_super_admin', {
        staff_ids: staffIds,
        target_manager_id: managerId,
        new_department: options?.department?.trim() || null,
        new_job_title: options?.jobTitle?.trim() || null,
      })

      if (!rpcErr && rpcResult?.success) {
        updateSuccess = true
      }
    } catch {
      updateSuccess = false
    }

    // 5. Fallback to direct update if RPC is not yet created in Supabase instance
    if (!updateSuccess) {
      const updatePayload: Record<string, unknown> = {
        manager_id: managerId,
        updated_at: new Date().toISOString(),
      }
      if (options?.department && options.department.trim()) {
        updatePayload.department = options.department.trim()
      }
      if (options?.jobTitle && options.jobTitle.trim()) {
        updatePayload.job_title = options.jobTitle.trim()
      }

      const { error: updateErr } = await supabase
        .from('profiles')
        .update(updatePayload)
        .in('id', staffIds)

      if (updateErr) {
        return { success: false, error: `Failed to update profiles: ${updateErr.message}` }
      }
    }

    // 6. Fetch assigned staff names for personalized notification
    const { data: assignedStaff } = await supabase
      .from('profiles')
      .select('id, full_name, email, department')
      .in('id', staffIds)

    const managerDisplayName = targetManager.full_name || targetManager.email.split('@')[0]
    const assignedCount = assignedStaff?.length || staffIds.length

    // 7. Dispatch notification to the target Manager
    const staffNamesPreview = (assignedStaff || [])
      .map(s => s.full_name || s.email)
      .slice(0, 3)
      .join(', ')
    const extraCount = assignedCount > 3 ? ` and ${assignedCount - 3} more` : ''

    await sendNotificationInternal({
      userId: managerId,
      title: '👥 New Staff Assigned to Your Team',
      message: `Super Admin assigned ${assignedCount} staff member(s) (${staffNamesPreview}${extraCount}) to your team.`,
      link: '/dashboard/team',
      type: 'system',
    })

    // 8. Dispatch notification to each assigned staff member
    for (const staff of assignedStaff || []) {
      await sendNotificationInternal({
        userId: staff.id,
        title: '👔 Manager Reassignment',
        message: `You have been assigned to ${managerDisplayName} as your manager.`,
        link: '/dashboard',
        type: 'system',
      })
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/team')
    revalidatePath('/dashboard/assign')

    return { 
      success: true, 
      count: assignedCount,
      managerName: managerDisplayName
    }
  } catch (err) {
    console.error('Assign staff error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to assign staff.' }
  }
}

/**
 * Bulk assign staff members based on Department or Role criteria.
 * E.g., assign all staff in "Engineering" or with role "employee" to a manager.
 */
export async function assignStaffByCriteriaAction(criteria: {
  department?: string
  role?: string
  targetManagerId: string
  newDepartment?: string
}) {
  try {
    const supabase = await createClient()

    // 1. Verify user authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // 2. Verify director role
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'managing_director') {
      return { success: false, error: 'Only Super Admins can perform bulk staff assignment.' }
    }

    if (!criteria.targetManagerId) {
      return { success: false, error: 'Target manager is required.' }
    }

    if (!criteria.department && !criteria.role) {
      return { success: false, error: 'Please select at least one criteria (Department or Role).' }
    }

    // 3. Query matching staff members
    let query = supabase
      .from('profiles')
      .select('id, full_name, email, role, department')

    // Don't reassign the target manager to themselves
    query = query.neq('id', criteria.targetManagerId)

    if (criteria.department && criteria.department !== 'all') {
      query = query.ilike('department', criteria.department.trim())
    }

    if (criteria.role && criteria.role !== 'all') {
      // Check if filtering by system role or job title
      if (['employee', 'manager'].includes(criteria.role)) {
        query = query.eq('role', criteria.role)
      } else {
        query = query.ilike('job_title', criteria.role.trim())
      }
    }

    const { data: matchingStaff, error: queryErr } = await query

    if (queryErr) {
      return { success: false, error: queryErr.message }
    }

    if (!matchingStaff || matchingStaff.length === 0) {
      return { success: false, error: 'No staff members match the selected criteria.' }
    }

    const staffIds = matchingStaff.map(s => s.id)

    // 4. Delegate to assignStaffAction
    return await assignStaffAction(staffIds, criteria.targetManagerId, {
      department: criteria.newDepartment,
    })
  } catch (err) {
    console.error('Assign by criteria error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Bulk assignment failed.' }
  }
}

/**
 * Edit a specific staff member's department, job title, system role, and assigned manager.
 */
export async function updateStaffAssignmentDetailsAction(
  staffId: string,
  data: {
    managerId: string | null
    department?: string
    jobTitle?: string
    role?: 'employee' | 'manager'
  }
) {
  try {
    const supabase = await createClient()

    // 1. Verify user authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // 2. Verify director role
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'managing_director') {
      return { success: false, error: 'Only Super Admins can edit staff assignment details.' }
    }

    if (!staffId) {
      return { success: false, error: 'Staff ID is required.' }
    }

    // Get previous profile to detect manager change
    const { data: prevProfile } = await supabase
      .from('profiles')
      .select('manager_id, full_name, email')
      .eq('id', staffId)
      .single()

    const updatePayload: Record<string, unknown> = {
      manager_id: data.managerId || null,
      updated_at: new Date().toISOString(),
    }

    if (data.department !== undefined) {
      updatePayload.department = data.department.trim() || 'General'
    }

    if (data.jobTitle !== undefined) {
      updatePayload.job_title = data.jobTitle.trim() || null
    }

    if (data.role && ['employee', 'manager'].includes(data.role)) {
      updatePayload.role = data.role
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', staffId)

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }

    // If manager changed, notify the new manager and the staff member
    if (data.managerId && data.managerId !== prevProfile?.manager_id) {
      const { data: newMgr } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', data.managerId)
        .single()

      const mgrName = newMgr?.full_name || newMgr?.email || 'New Manager'
      const staffName = prevProfile?.full_name || prevProfile?.email || 'Staff Member'

      await sendNotificationInternal({
        userId: data.managerId,
        title: '👥 Staff Member Assigned to You',
        message: `${staffName} has been assigned to your team by the Super Admin.`,
        link: '/dashboard/team',
        type: 'system',
      })

      await sendNotificationInternal({
        userId: staffId,
        title: '👔 Manager Reassigned',
        message: `You have been reassigned to ${mgrName} as your manager.`,
        link: '/dashboard',
        type: 'system',
      })
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/team')
    revalidatePath('/dashboard/assign')

    return { success: true }
  } catch (err) {
    console.error('Update staff details error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update staff details.' }
  }
}

