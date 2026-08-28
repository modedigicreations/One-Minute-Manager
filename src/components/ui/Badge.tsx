import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'indigo'
  dot?: boolean
}

export function Badge({ className = '', variant = 'neutral', dot = false, children, ...props }: BadgeProps) {
  const baseStyle = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border shrink-0'
  
  const variants = {
    primary: 'bg-slate-100/90 text-slate-700 border-slate-200/90',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/80',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/80',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200/80',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  }

  const dotColors = {
    primary: 'bg-slate-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500 animate-pulse',
    neutral: 'bg-slate-400',
    indigo: 'bg-indigo-500',
  }

  return (
    <span className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} shrink-0`} />}
      {children}
    </span>
  )
}

export function GoalStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Badge variant="success" dot>Completed</Badge>
    case 'in_progress':
      return <Badge variant="primary" dot>In Progress</Badge>
    case 'behind':
      return <Badge variant="danger" dot>Falling Behind</Badge>
    case 'not_started':
    default:
      return <Badge variant="neutral" dot>Not Started</Badge>
  }
}
