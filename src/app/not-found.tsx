import Link from 'next/link'
import { Award, Compass, ArrowRight } from 'lucide-react'

export default function NotFound() {
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
            <p className="text-xs text-slate-400 mt-0.5">Page Not Found</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
            <Compass size={22} />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-extrabold text-slate-800">404 - Lost Direction</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              The page you are looking for does not exist or has been relocated.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm w-full sm:w-auto"
            >
              <span>Return to Dashboard</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
