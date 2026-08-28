import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean
  hover?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', glass = false, hover = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-2xl border transition-all duration-200 ${
          glass
            ? 'bg-white/80 backdrop-blur-md border-white/60 shadow-sm'
            : 'bg-white border-slate-200/75 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_1px_2px_-1px_rgba(15,23,42,0.04)]'
        } ${
          hover ? 'hover:shadow-md hover:border-slate-300/80 hover:-translate-y-0.5' : ''
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Card.displayName = 'Card'

export function CardHeader({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100/80 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className = '', children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`font-bold text-slate-900 tracking-tight text-base sm:text-lg ${className}`} {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({ className = '', children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-slate-500 font-normal mt-0.5 ${className}`} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-5 pt-3 border-t border-slate-100/80 flex items-center justify-end gap-2 ${className}`} {...props}>
      {children}
    </div>
  )
}
