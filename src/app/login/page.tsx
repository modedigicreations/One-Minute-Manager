import LoginForm from './LoginForm'
import { Award, CheckCircle, Flame, ShieldCheck } from 'lucide-react'
import { Suspense } from 'react'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Form Container (Left) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-20 bg-white">
        <div className="w-full max-w-md">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-sm font-medium">
              Loading authentication...
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>
      </div>

      {/* Decorative Showcase Panel (Right) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white relative items-center justify-center p-16 overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] -ml-32 -mb-32 pointer-events-none" />

        <div className="w-full max-w-lg z-10 space-y-12">
          {/* Tagline */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Flame size={12} />
              The One-Minute Philosophy
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
              Effective management is a continuous loop, not an annual event.
            </h2>
            <p className="text-slate-400 text-lg">
              Set clear goals, give immediate praise for good work, and address issues early through constructive course correction.
            </p>
          </div>

          {/* Key pillars */}
          <div className="grid grid-cols-1 gap-6">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0 border border-slate-700">
                <CheckCircle size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-200">1. One-Minute Goals</h4>
                <p className="text-slate-400 text-sm mt-0.5">Know exactly what you are expected to achieve at any given moment.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0 border border-slate-700">
                <Award size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-200">2. One-Minute Praisings</h4>
                <p className="text-slate-400 text-sm mt-0.5">Catch people doing things right and provide immediate recognition.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-rose-400 shrink-0 border border-slate-700">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-200">3. One-Minute Corrections</h4>
                <p className="text-slate-400 text-sm mt-0.5">Adjust course-corrections immediately to prevent minor issues from growing.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
