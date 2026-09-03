'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendNotificationInternal } from '@/app/dashboard/notifications/actions'

// Status helper using lexicographical YYYY-MM-DD date string comparison to avoid timezone offset bugs
function determineStatus(progress: number, deadlineStr: string): 'not_started' | 'in_progress' | 'completed' | 'behind' {
  if (progress >= 100) return 'completed'
  
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const todayStr = `${year}-${month}-${day}`
  
  if (deadlineStr < todayStr) {
    return 'behind'
  }
  
  if (progress > 0) return 'in_progress'
  return 'not_started'
}

export async function createGoalAction(formData: FormData) {
  try {
    const supabase = await createClient()

    // Get caller user and profile
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized. Please log in again.' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    const employee_id = formData.get('employee_id') as string
    const objective = (formData.get('objective') as string)?.trim()
    const expected_result = (formData.get('expected_result') as string)?.trim()
    const deadline = formData.get('deadline') as string
    
    const progressRaw = formData.get('progress') as string || '0'
    const progressParsed = parseInt(progressRaw, 10)
    const progress = isNaN(progressParsed) ? 0 : progressParsed

    if (!employee_id || !objective || !expected_result || !deadline) {
      return { success: false, error: 'All fields (Assignee, Objective, Expected Result, Deadline) are required.' }
    }

    // Determine supervising manager: default to current user (manager or super admin)
    // Super admin can optionally delegate supervision to another manager
    let assignedManagerId = user.id
    if (profile?.role === 'managing_director') {
      const specifiedManagerId = formData.get('manager_id') as string
      if (specifiedManagerId && specifiedManagerId !== 'self' && specifiedManagerId.trim() !== '') {
        assignedManagerId = specifiedManagerId
      }
    }

    const status = determineStatus(progress, deadline)

    const goalPayload = {
      manager_id: assignedManagerId,
      employee_id,
      objective,
      expected_result,
      deadline,
      progress,
      status,
    }

    let insertError: string | null = null
    const adminSupabase = createAdminClient()

    // If caller is managing_director and admin client is available, bypass RLS directly
    if (profile?.role === 'managing_director' && adminSupabase) {
      const { error: adminErr } = await adminSupabase
        .from('goals')
        .insert(goalPayload)
      if (adminErr) {
        console.warn('createGoalAction: Admin client insert error, falling back to authenticated client:', adminErr)
        const { error: regErr } = await supabase.from('goals').insert(goalPayload)
        if (regErr) insertError = regErr.message
      }
    } else {
      const { error: regErr } = await supabase
        .from('goals')
        .insert(goalPayload)
      if (regErr) {
        // Fallback to admin client if standard client hit an RLS policy restriction
        if (adminSupabase) {
          console.warn('createGoalAction: Standard client insert failed, attempting admin client fallback:', regErr.message)
          const { error: fallbackErr } = await adminSupabase
            .from('goals')
            .insert(goalPayload)
          if (fallbackErr) {
            insertError = fallbackErr.message
          }
        } else {
          insertError = regErr.message
        }
      }
    }

    if (insertError) {
      console.error('createGoalAction insert error:', insertError)
      return { success: false, error: insertError }
    }

    // Notify assignee of newly assigned goal
    const creatorLabel = profile?.role === 'managing_director' ? 'Super Admin' : (profile?.full_name || 'Your Manager')
    await sendNotificationInternal({
      userId: employee_id,
      title: '🎯 New One-Minute Goal Assigned',
      message: `Target: "${objective}" (Assigned by ${creatorLabel}, Due: ${deadline})`,
      link: '/dashboard',
      type: 'goal_assigned',
    })

    // If super admin delegated supervision to a manager, notify that manager as well
    if (assignedManagerId !== user.id && assignedManagerId !== employee_id) {
      await sendNotificationInternal({
        userId: assignedManagerId,
        title: '📋 Executive Goal Delegated to Your Oversight',
        message: `Super Admin assigned "${objective}" to a team member under your supervision.`,
        link: '/dashboard',
        type: 'goal_assigned',
      })
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/team')
    return { success: true }
  } catch (err) {
    console.error('Create goal action error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create goal.' }
  }
}

export async function editGoalAction(formData: FormData) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const goal_id = formData.get('goal_id') as string
    const objective = (formData.get('objective') as string)?.trim()
    const expected_result = (formData.get('expected_result') as string)?.trim()
    const deadline = formData.get('deadline') as string
    const progressRaw = formData.get('progress') as string || '0'
    const progress = parseInt(progressRaw, 10) || 0

    if (!goal_id || !objective || !expected_result || !deadline) {
      return { success: false, error: 'All fields are required.' }
    }

    const status = determineStatus(progress, deadline)

    const { error } = await supabase
      .from('goals')
      .update({
        objective,
        expected_result,
        deadline,
        progress,
        status,
      })
      .eq('id', goal_id)
      .eq('manager_id', user.id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/team')
    return { success: true }
  } catch (err) {
    console.error('Edit goal action error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update goal.' }
  }
}

export async function completeGoalAction(goalId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { error } = await supabase
      .from('goals')
      .update({
        progress: 100,
        status: 'completed',
      })
      .eq('id', goalId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Fetch goal details to notify manager
    const { data: g } = await supabase
      .from('goals')
      .select('manager_id, objective')
      .eq('id', goalId)
      .single()

    if (g) {
      await sendNotificationInternal({
        userId: g.manager_id,
        title: '🎉 Goal Milestone Achieved (100%)',
        message: `Goal completed: "${g.objective}"`,
        link: '/dashboard',
        type: 'goal_completed',
      })
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/team')
    return { success: true }
  } catch (err) {
    console.error('Complete goal action error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to complete goal.' }
  }
}

export async function deleteGoalAction(goalId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)
      .eq('manager_id', user.id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/team')
    return { success: true }
  } catch (err) {
    console.error('Delete goal action error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete goal.' }
  }
}

export async function updateGoalProgressAction(goalId: string, progress: number, deadlineStr: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const status = determineStatus(progress, deadlineStr)

    const { error } = await supabase
      .from('goals')
      .update({
        progress,
        status,
      })
      .eq('id', goalId)

    if (error) {
      return { success: false, error: error.message }
    }

    // If progress reached 100%, dispatch completion notification
    if (progress >= 100) {
      const { data: g } = await supabase
        .from('goals')
        .select('manager_id, objective')
        .eq('id', goalId)
        .single()

      if (g) {
        await sendNotificationInternal({
          userId: g.manager_id,
          title: '🎉 Goal Milestone Achieved (100%)',
          message: `Goal completed: "${g.objective}"`,
          link: '/dashboard',
          type: 'goal_completed',
        })
      }
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    console.error('Update goal progress action error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update progress.' }
  }
}

/**
 * Submit / Update Goal Execution Strategy (Two-Way Communication)
 */
export async function submitGoalStrategyAction(goalId: string, strategyText: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    if (!strategyText || !strategyText.trim()) {
      return { success: false, error: 'Please enter your proposed strategy statement.' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    // Fetch the goal
    const { data: goal, error: goalErr } = await supabase
      .from('goals')
      .select('id, manager_id, employee_id, objective')
      .eq('id', goalId)
      .single()

    if (goalErr || !goal) {
      return { success: false, error: 'Goal not found.' }
    }

    const trimmedStrategy = strategyText.trim()
    const nowIso = new Date().toISOString()

    // Update goal strategy fields
    const adminSupabase = createAdminClient()
    const clientToUse = adminSupabase || supabase

    const { error: updateErr } = await clientToUse
      .from('goals')
      .update({
        strategy_text: trimmedStrategy,
        strategy_status: 'submitted',
        strategy_submitted_at: nowIso,
      })
      .eq('id', goalId)

    if (updateErr) {
      console.error('Failed to update goal strategy:', updateErr)
      return { success: false, error: updateErr.message }
    }

    // Attempt to log iteration in goal_strategy_iterations (failsafe if table doesn't exist yet)
    try {
      await clientToUse.from('goal_strategy_iterations').insert({
        goal_id: goalId,
        sender_id: user.id,
        sender_role: profile?.role || 'employee',
        action_type: 'submitted',
        strategy_content: trimmedStrategy,
      })
    } catch (e) {
      console.warn('goal_strategy_iterations log skipped:', e)
    }

    // Notify manager that strategy has been submitted for approval
    const senderName = profile?.full_name || 'Your staff member'
    if (goal.manager_id) {
      await sendNotificationInternal({
        userId: goal.manager_id,
        title: '💡 Strategy Submitted for Review',
        message: `${senderName} submitted a 60-second strategy for "${goal.objective}". Review and approve or provide feedback.`,
        link: '/dashboard',
        type: 'directive',
      })
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/team')
    return { success: true }
  } catch (err) {
    console.error('submitGoalStrategyAction error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to submit strategy.' }
  }
}

/**
 * Review Goal Strategy: Approve or Query/Request Revision (Manager / Super Admin)
 */
export async function reviewGoalStrategyAction(
  goalId: string, 
  decision: 'approve' | 'request_revision', 
  feedbackNote?: string
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    // Fetch the goal
    const { data: goal, error: goalErr } = await supabase
      .from('goals')
      .select('id, manager_id, employee_id, objective, strategy_text, status')
      .eq('id', goalId)
      .single()

    if (goalErr || !goal) {
      return { success: false, error: 'Goal not found.' }
    }

    const nowIso = new Date().toISOString()
    const adminSupabase = createAdminClient()
    const clientToUse = adminSupabase || supabase

    if (decision === 'approve') {
      const updatePayload: Record<string, unknown> = {
        strategy_status: 'approved',
        strategy_approved_at: nowIso,
      }
      if (goal.status === 'not_started') {
        updatePayload.status = 'in_progress'
      }

      const { error: updateErr } = await clientToUse
        .from('goals')
        .update(updatePayload)
        .eq('id', goalId)

      if (updateErr) {
        return { success: false, error: updateErr.message }
      }

      try {
        await clientToUse.from('goal_strategy_iterations').insert({
          goal_id: goalId,
          sender_id: user.id,
          sender_role: profile?.role || 'manager',
          action_type: 'approved',
          strategy_content: goal.strategy_text || '',
          feedback_note: feedbackNote?.trim() || 'Strategy approved for execution.',
        })
      } catch (e) {
        console.warn('goal_strategy_iterations log skipped:', e)
      }

      // Notify employee
      await sendNotificationInternal({
        userId: goal.employee_id,
        title: '✅ Strategy Approved! Clear to Execute',
        message: `Your manager approved your strategy for "${goal.objective}". Track your self-progress as you execute.`,
        link: '/dashboard',
        type: 'system',
      })
    } else {
      // Request Revision / Query Strategy
      if (!feedbackNote || !feedbackNote.trim()) {
        return { success: false, error: 'Please provide query feedback so the staff member knows what to adjust.' }
      }

      const { error: updateErr } = await clientToUse
        .from('goals')
        .update({
          strategy_status: 'revision_requested',
          strategy_feedback: feedbackNote.trim(),
        })
        .eq('id', goalId)

      if (updateErr) {
        return { success: false, error: updateErr.message }
      }

      try {
        await clientToUse.from('goal_strategy_iterations').insert({
          goal_id: goalId,
          sender_id: user.id,
          sender_role: profile?.role || 'manager',
          action_type: 'revision_requested',
          strategy_content: goal.strategy_text || '',
          feedback_note: feedbackNote.trim(),
        })
      } catch (e) {
        console.warn('goal_strategy_iterations log skipped:', e)
      }

      // Notify employee
      await sendNotificationInternal({
        userId: goal.employee_id,
        title: '⚠️ Strategy Query: Revision Requested',
        message: `Manager feedback on "${goal.objective}": "${feedbackNote.trim()}". Please update your plan.`,
        link: '/dashboard',
        type: 'directive',
      })
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/team')
    return { success: true }
  } catch (err) {
    console.error('reviewGoalStrategyAction error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to review strategy.' }
  }
}

/**
 * Fetch Strategy Iterations History for a Goal
 */
export async function getGoalStrategyHistoryAction(goalId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, iterations: [] }

    const { data, error } = await supabase
      .from('goal_strategy_iterations')
      .select('*, profiles:sender_id(full_name, role, email)')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: true })

    if (error) {
      return { success: false, iterations: [] }
    }

    return { success: true, iterations: data || [] }
  } catch (err) {
    console.error('getGoalStrategyHistoryAction error:', err)
    return { success: false, iterations: [] }
  }
}
