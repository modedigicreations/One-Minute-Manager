'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

async function getOrigin() {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'localhost:3000'
  const proto = headerList.get('x-forwarded-proto') || 'https'
  return `${proto}://${host}`
}

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
      // If error is unconfirmed email, provide a descriptive message
      if (error.message.toLowerCase().includes('email not confirmed')) {
        return { 
          success: false, 
          error: 'Your email has not been verified yet. Check your inbox and spam folder, or click "Resend verification email" below.' 
        }
      }
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
    const origin = await getOrigin()

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
        emailRedirectTo: `${origin}/auth/callback`,
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

export async function resetPasswordAction(formData: FormData) {
  try {
    const supabase = await createClient()
    const origin = await getOrigin()

    const email = (formData.get('email') as string)?.trim()

    if (!email) {
      return { success: false, error: 'Email is required.' }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/update-password`,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { 
      success: true, 
      message: 'Password reset link sent! Check your inbox and spam folder. (Links expire after 1 hour).' 
    }
  } catch (err) {
    console.error('Reset password error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send reset link.' }
  }
}

export async function updatePasswordAction(formData: FormData) {
  try {
    const supabase = await createClient()

    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' }
    }

    if (password !== confirmPassword) {
      return { success: false, error: 'Passwords do not match.' }
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('Update password error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update password.' }
  }
}

export async function resendVerificationAction(formData: FormData) {
  try {
    const supabase = await createClient()
    const origin = await getOrigin()

    const email = (formData.get('email') as string)?.trim()

    if (!email) {
      return { success: false, error: 'Email is required to resend verification.' }
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { 
      success: true, 
      message: 'Verification email resent! Please check your inbox and spam folder.' 
    }
  } catch (err) {
    console.error('Resend verification error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to resend email.' }
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
