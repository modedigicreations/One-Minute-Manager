'use client'

import { useEffect } from 'react'
import { Award, AlertTriangle, RefreshCw, LogIn } from 'lucide-react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 text-slate-900">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden text-center">
        {/* Header */}
        <div className="bg-[#0b1329] p-6 text-white flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
            <Award size={24} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">One-Minute Manager</h2>
            <p className="text-xs text-slate-400 mt-0.5">Application Resilience Center</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
            <AlertTriangle size={22} />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">Something went wrong</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              An unexpected issue occurred while processing your request. You can try refreshing or returning to sign in.
            </p>
            {error.digest && (
              <p className="text-[10px] font-mono text-slate-400 mt-2">
                Reference Digest: {error.digest}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            <button
              onClick={() => reset()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Try Again</span>
            </button>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition border border-slate-200/80"
            >
              <LogIn size={14} />
              <span>Return to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
