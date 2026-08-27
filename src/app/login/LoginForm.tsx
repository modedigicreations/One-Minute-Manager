'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, Award, Briefcase, User, Sparkles } from 'lucide-react'
import { loginAction, signupAction } from '@/app/auth/actions'

interface ManagerOption {
  id: string
  full_name: string
  email: string
}

export default function LoginForm() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Signup-specific state
  const [role, setRole] = useState<'manager' | 'employee'>('employee')
  const [managers, setManagers] = useState<ManagerOption[]>([])
  const [loadingManagers, setLoadingManagers] = useState(false)

  // Fetch managers when entering signup mode
  useEffect(() => {
    if (mode === 'signup' && role === 'employee') {
      setLoadingManagers(true)
      fetch('/api/auth/managers')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setManagers(data)
          }
        })
        .catch((err) => console.error('Failed to fetch managers:', err))
        .finally(() => setLoadingManagers(false))
    }
  }, [mode, role])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
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
          setError('Account created! Please check your email to confirm your account, then sign in.')
          return
        }
      } else {
        const res = await loginAction(form)
        if (!res.success) {
          setError(res.error || 'Login failed')
          return
        }
      }

      window.location.replace(new URL('/dashboard', window.location.origin).toString())
    } catch (err) {
      setError('Something went wrong. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-omm-primary flex items-center justify-center text-white shadow-md shadow-slate-900/20">
            <Award size={18} />
          </div>
          <span className="text-slate-800 font-extrabold text-xl tracking-tight">One-Minute Manager</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {mode === 'login'
            ? 'Sign in to access your dashboard'
            : 'Join your team to set clear goals and get timely feedback'}
        </p>
      </div>

      {(error || urlError) && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 font-medium">
          {error || urlError}
        </div>
      )}

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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-omm-primary bg-white transition"
              placeholder="Jane Smith"
            />
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              What is your role?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer text-sm font-semibold transition ${role === 'employee' ? 'border-omm-primary bg-omm-primary/5 text-omm-primary' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  name="role"
                  value="employee"
                  checked={role === 'employee'}
                  onChange={() => setRole('employee')}
                  className="sr-only"
                />
                <User size={16} />
                Employee
              </label>
              <label className={`flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer text-sm font-semibold transition ${role === 'manager' ? 'border-omm-primary bg-omm-primary/5 text-omm-primary' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  name="role"
                  value="manager"
                  checked={role === 'manager'}
                  onChange={() => setRole('manager')}
                  className="sr-only"
                />
                <Briefcase size={16} />
                Manager
              </label>
            </div>
          </div>

          {/* Manager Association (for employees only) */}
          {role === 'employee' && (
            <div>
              <label htmlFor="manager_id" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Select Your Manager</span>
                {loadingManagers && <Loader2 size={12} className="animate-spin text-slate-400" />}
              </label>
              <select
                id="manager_id"
                name="manager_id"
                required={role === 'employee'}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-omm-primary bg-white transition"
              >
                <option value="">-- Choose your manager --</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.email})
                  </option>
                ))}
              </select>
              {managers.length === 0 && !loadingManagers && (
                <p className="text-[10px] text-amber-600 mt-1">
                  No managers registered yet. If you are the first team member, please sign up as a Manager first.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Email */}
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
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-omm-primary bg-white transition"
          placeholder="you@company.com"
        />
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-omm-primary bg-white transition"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-omm-primary hover:bg-omm-primary-light text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-md shadow-slate-900/10 hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {mode === 'login' ? 'Sign in' : 'Create account'}
      </button>

      {/* Toggles */}
      <div className="text-center text-sm text-slate-500 pt-2">
        {mode === 'login' ? (
          <>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null) }}
              className="text-omm-primary hover:underline font-bold"
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null) }}
              className="text-omm-primary hover:underline font-bold"
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </form>
  )
}
