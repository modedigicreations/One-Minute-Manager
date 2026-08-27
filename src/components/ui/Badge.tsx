import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
}

export function Badge({ className = '', variant = 'neutral', children, ...props }: BadgeProps) {
  const baseStyle = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide border uppercase shrink-0'
  
  const variants = {
    primary: 'bg-slate-50 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    neutral: 'bg-slate-100 text-slate-500 border-slate-200',
  }

  return (
    <span className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  )
}

export function GoalStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Badge variant="success">Completed</Badge>
    case 'in_progress':
      return <Badge variant="primary">In Progress</Badge>
    case 'behind':
      return <Badge variant="danger">Behind</Badge>
    case 'not_started':
    default:
      return <Badge variant="neutral">Not Started</Badge>
  }
}
