import { ReactNode } from 'react'

export const metadata = {
  title: 'Authentication | One-Minute Manager',
  description: 'Sign in or register to One-Minute Manager to start tracking goals and getting instant feedback.',
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-slate-50">{children}</div>
}
