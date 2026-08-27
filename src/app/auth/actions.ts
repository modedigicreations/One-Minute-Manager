'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function loginAction(formData: FormData) {
  try {
    const supabase = await createClient()

    const email = (formData.get('email') as string)?.trim()
    const password = formData.get('password') as string

    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('Login error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Login failed. Please try again.' }
  }
}

export async function signupAction(formData: FormData) {
  try {
    const supabase = await createClient()

    const email = (formData.get('email') as string)?.trim()
    const password = formData.get('password') as string
    const full_name = (formData.get('full_name') as string)?.trim()
    const role = (formData.get('role') as string) || 'employee'
    const manager_id = (formData.get('manager_id') as string) || null

    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' }
    }

    if (role === 'employee' && !manager_id) {
      return { success: false, error: 'Employees must select a manager.' }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          full_name: full_name || '',
          role,
          manager_id: manager_id || undefined
        },
      },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    // Email confirmation required (common Supabase default)
    if (data?.user && !data.session) {
      return { success: true, requiresConfirmation: true }
    }

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('Signup error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Signup failed. Please try again.' }
  }
}

export async function logoutAction() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('Logout error:', err)
    return { success: true }
  }
}
