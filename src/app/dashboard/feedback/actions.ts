'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendNotificationInternal } from '@/app/dashboard/notifications/actions'

export async function createFeedbackAction(formData: FormData) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const employee_id = formData.get('employee_id') as string
    const goal_id = formData.get('goal_id') as string || null
    const type = formData.get('type') as 'praising' | 'correction'
    const message = (formData.get('message') as string)?.trim()

    if (!employee_id || !type || !message) {
      return { success: false, error: 'All fields are required.' }
    }

    if (type !== 'praising' && type !== 'correction') {
      return { success: false, error: 'Invalid feedback type.' }
    }

    const { error } = await supabase
      .from('feedbacks')
      .insert({
        manager_id: user.id,
        employee_id,
        goal_id: goal_id || null,
        type,
        message,
      })

    if (error) {
      return { success: false, error: error.message }
    }

    // Notify employee of praise or adjustment
    await sendNotificationInternal({
      userId: employee_id,
      title: type === 'praising' ? '🏆 New One-Minute Praise Received!' : '🧭 New One-Minute Re-Direct Delivered',
      message: `"${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`,
      link: '/dashboard',
      type: 'feedback',
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/team')
    return { success: true }
  } catch (err) {
    console.error('Create feedback action error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to save feedback.' }
  }
}

export async function deleteFeedbackAction(feedbackId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { error } = await supabase
      .from('feedbacks')
      .delete()
      .eq('id', feedbackId)
      .eq('manager_id', user.id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/team')
    return { success: true }
  } catch (err) {
    console.error('Delete feedback action error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete feedback.' }
  }
}
