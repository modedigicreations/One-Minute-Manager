'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, Award, Briefcase, User, ArrowLeft, ShieldCheck } from 'lucide-react'
import { 
  loginAction, 
  signupAction, 
  resetPasswordAction, 
  resendVerificationAction 
} from '@/app/auth/actions'

interface ManagerOption {
  id: string
  full_name: string | null
  email: string
  role?: string
}

type AuthMode = 'login' | 'signup' | 'forgot' | 'resend'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')
  const [mode, setMode] = useState<AuthMode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Signup-specific state
  const [role, setRole] = useState<'manager' | 'employee' | 'managing_director'>('employee')
  const [managers, setManagers] = useState<ManagerOption[]>([])
  const [loadingManagers, setLoadingManagers] = useState(false)

  async function handleRefreshManagers() {
    setLoadingManagers(true)
    try {
      const res = await fetch('/api/auth/managers', { cache: 'no-store' })
      const data = await res.json()
      if (Array.isArray(data)) {
        setManagers(data)
      }
    } catch (err) {
      console.error('Failed to fetch managers:', err)
    } finally {
      setLoadingManagers(false)
    }
  }

  // Fetch managers when entering signup mode
  useEffect(() => {
    let active = true
    if (mode === 'signup' && role === 'employee') {
      fetch('/api/auth/managers', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (active && Array.isArray(data)) {
            setManagers(data)
          }
        })
        .catch((err) => console.error('Failed to fetch managers:', err))
    }
    return () => {
      active = false
    }
  }, [mode, role])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    const form = new FormData(e.currentTarget)

    try {
      if (mode === 'signup') {
        const res = await signupAction(form)
        if (!res.success) {
          setError(res.error || 'Signup failed')
          return
        }
        if (res.requiresConfirmation) {
          setSuccessMessage(
            'Account created! A verification email has been sent. Please check your inbox (and Spam folder) to confirm, then sign in.'
          )
          return
        }
        window.location.replace(new URL('/dashboard', window.location.origin).toString())
      } else if (mode === 'login') {
        const res = await loginAction(form)
        if (!res.success) {
          setError(res.error || 'Login failed')
          return
        }
        window.location.replace(new URL('/dashboard', window.location.origin).toString())
      } else if (mode === 'forgot') {
        const res = await resetPasswordAction(form)
        if (!res.success) {
          setError(res.error || 'Failed to send reset link')
        } else {
          setSuccessMessage(res.message || 'Password reset link sent! Check your inbox and spam folder.')
        }
      } else if (mode === 'resend') {
        const res = await resendVerificationAction(form)
        if (!res.success) {
          setError(res.error || 'Failed to resend verification email')
        } else {
          setSuccessMessage(res.message || 'Verification link sent! Check your inbox and spam folder.')
        }
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function switchMode(newMode: AuthMode) {
    setMode(newMode)
    setError(null)
    setSuccessMessage(null)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Brand Header */}
      <div className="text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md shadow-slate-900/20">
            <Award size={18} />
          </div>
          <span className="text-slate-800 font-extrabold text-xl tracking-tight">One-Minute Manager</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          {mode === 'login' && 'Welcome back'}
          {mode === 'signup' && 'Create account'}
          {mode === 'forgot' && 'Reset password'}
          {mode === 'resend' && 'Resend verification'}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {mode === 'login' && 'Sign in to access your dashboard'}
          {mode === 'signup' && 'Join your team to set clear goals and get timely feedback'}
          {mode === 'forgot' && 'Enter your email to receive a secure password reset link'}
          {mode === 'resend' && 'Enter your email to receive a fresh verification link'}
        </p>
      </div>

      {/* Error alert */}
      {(error || (mode === 'login' && urlError)) && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-xl px-4 py-3 font-medium">
          {error || urlError}
        </div>
      )}

      {/* Success alert */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-xl px-4 py-3 font-medium leading-relaxed">
          {successMessage}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE: SIGNUP FIELDS */}
      {/* ============================================================ */}
      {mode === 'signup' && (
        <>
          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Full name
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition"
              placeholder="Jane Smith"
            />
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              What is your role?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className={`flex items-center justify-center gap-1.5 p-2.5 border rounded-xl cursor-pointer text-xs font-semibold transition ${role === 'employee' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  name="role"
                  value="employee"
                  checked={role === 'employee'}
                  onChange={() => setRole('employee')}
                  className="sr-only"
                />
                <User size={14} />
                Employee
              </label>
              <label className={`flex items-center justify-center gap-1.5 p-2.5 border rounded-xl cursor-pointer text-xs font-semibold transition ${role === 'manager' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  name="role"
                  value="manager"
                  checked={role === 'manager'}
                  onChange={() => setRole('manager')}
                  className="sr-only"
                />
                <Briefcase size={14} />
                Manager
              </label>
              <label className={`flex items-center justify-center gap-1.5 p-2.5 border rounded-xl cursor-pointer text-xs font-semibold transition ${role === 'managing_director' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  name="role"
                  value="managing_director"
                  checked={role === 'managing_director'}
                  onChange={() => setRole('managing_director')}
                  className="sr-only"
                />
                <ShieldCheck size={14} />
                Managing Director
              </label>
            </div>
          </div>

          {/* Manager Dropdown (for employees only) */}
          {role === 'employee' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="manager_id" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Select your manager
                </label>
                <button
                  type="button"
                  onClick={handleRefreshManagers}
                  disabled={loadingManagers}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition cursor-pointer flex items-center gap-1"
                >
                  {loadingManagers ? 'Loading...' : '↻ Refresh list'}
                </button>
              </div>
              <select
                id="manager_id"
                name="manager_id"
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition"
              >
                <option value="">-- Choose your manager --</option>
                {managers.map((m) => {
                  const displayName = m.full_name?.trim() || m.email.split('@')[0]
                  const roleLabel = m.role === 'managing_director' ? 'Managing Director' : 'Manager'
                  return (
                    <option key={m.id} value={m.id}>
                      {displayName} — {roleLabel} ({m.email})
                    </option>
                  )
                })}
              </select>
              {managers.length === 0 && !loadingManagers && (
                <div className="mt-1.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 flex items-center justify-between gap-2">
                  <span>No managers found.</span>
                  <button
                    type="button"
                    onClick={handleRefreshManagers}
                    className="font-bold underline hover:text-amber-950 transition cursor-pointer shrink-0"
                  >
                    ↻ Try reloading
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* COMMON FIELD: EMAIL (All Modes) */}
      {/* ============================================================ */}
      <div>
        <label htmlFor="email" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition"
          placeholder="you@company.com"
        />
      </div>

      {/* ============================================================ */}
      {/* PASSWORD FIELD (Only for Login & Signup) */}
      {/* ============================================================ */}
      {(mode === 'login' || mode === 'signup') && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Password
            </label>
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            )}
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBMIT BUTTON */}
      {/* ============================================================ */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-md shadow-slate-900/10 hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {mode === 'login' && 'Sign in'}
        {mode === 'signup' && 'Create account'}
        {mode === 'forgot' && 'Send Password Reset Link'}
        {mode === 'resend' && 'Resend Verification Email'}
      </button>

      {/* ============================================================ */}
      {/* NAVIGATION TOGGLES & RECOVERY LINKS */}
      {/* ============================================================ */}
      <div className="text-center text-xs sm:text-sm text-slate-500 pt-2 space-y-2">
        {mode === 'login' && (
          <>
            <div>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-slate-900 hover:underline font-bold cursor-pointer"
              >
                Sign up
              </button>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => switchMode('resend')}
                className="text-xs text-slate-500 hover:text-slate-800 transition underline cursor-pointer"
              >
                Didn&apos;t receive verification email? Click here
              </button>
            </div>
          </>
        )}

        {mode === 'signup' && (
          <div>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-slate-900 hover:underline font-bold cursor-pointer"
            >
              Sign in
            </button>
          </div>
        )}

        {(mode === 'forgot' || mode === 'resend') && (
          <div>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-bold hover:underline cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Sign in</span>
            </button>
          </div>
        )}
      </div>
    </form>
  )
}
