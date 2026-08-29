'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface AppNotification {
  id: string
  user_id: string
  title: string
  message: string
  link: string
  type: 'directive' | 'goal_completed' | 'goal_assigned' | 'feedback' | 'system'
  read: boolean
  created_at: string
}

export async function getNotificationsAction(): Promise<{
  success: boolean
  notifications: AppNotification[]
  unreadCount: number
}> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, notifications: [], unreadCount: 0 }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(25)

    if (error) {
      // Table might not exist yet if migration hasn't run
      return { success: false, notifications: [], unreadCount: 0 }
    }

    const notifications: AppNotification[] = (data || []) as AppNotification[]
    const unreadCount = notifications.filter(n => !n.read).length

    return {
      success: true,
      notifications,
      unreadCount,
    }
  } catch (err) {
    console.error('getNotificationsAction error:', err)
    return { success: false, notifications: [], unreadCount: 0 }
  }
}

export async function markNotificationReadAction(notificationId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false }

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id)

    if (error) return { success: false }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    console.error('markNotificationReadAction error:', err)
    return { success: false }
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false }

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)

    if (error) return { success: false }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    console.error('markAllNotificationsReadAction error:', err)
    return { success: false }
  }
}

/**
 * Internal helper to send a notification to a specific user.
 */
export async function sendNotificationInternal({
  userId,
  title,
  message,
  link = '/dashboard',
  type = 'system',
}: {
  userId: string
  title: string
  message: string
  link?: string
  type?: 'directive' | 'goal_completed' | 'goal_assigned' | 'feedback' | 'system'
}) {
  try {
    const supabase = await createClient()

    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      link,
      type,
      read: false,
    })
  } catch (err) {
    console.error('sendNotificationInternal error:', err)
  }
}
