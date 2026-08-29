'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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

    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    console.error('Update lag status error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update directive status.' }
  }
}
