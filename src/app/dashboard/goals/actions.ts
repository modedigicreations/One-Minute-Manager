'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
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
    if (!user) return { success: false, error: 'Unauthorized' }

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
      return { success: false, error: 'All fields are required.' }
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

    const { error } = await supabase
      .from('goals')
      .insert({
        manager_id: assignedManagerId,
        employee_id,
        objective,
        expected_result,
        deadline,
        progress,
        status,
      })

    if (error) {
      return { success: false, error: error.message }
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
