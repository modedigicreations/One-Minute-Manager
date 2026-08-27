import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    const baseStyle = 'inline-flex items-center justify-center font-semibold rounded-xl transition duration-150 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none cursor-pointer'
    
    const variants = {
      primary: 'bg-omm-primary hover:bg-omm-primary-light text-white shadow-sm shadow-slate-900/10',
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
      success: 'bg-omm-success hover:bg-omm-success-dark text-white shadow-sm shadow-emerald-900/10',
      danger: 'bg-omm-danger hover:opacity-90 text-white shadow-sm shadow-rose-900/10',
      ghost: 'bg-transparent hover:bg-slate-50 text-slate-600',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4.5 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading && <Loader2 size={14} className="animate-spin mr-1.5 shrink-0" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
