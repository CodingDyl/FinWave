import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/cn' // simple clsx wrapper you'll add

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const base = 'btn'
    const variants = {
      primary: 'bg-primary text-primary-foreground shadow-base hover:brightness-110 active:scale-[0.98] focus-visible:ring-primary',
      secondary: 'bg-secondary text-secondary-foreground shadow-base hover:brightness-110 active:scale-[0.98] focus-visible:ring-ring',
      ghost: 'bg-transparent hover:bg-accent text-foreground',
      destructive: 'bg-destructive text-destructive-foreground hover:brightness-110',
    } as const

    return (
      <button ref={ref} className={cn(base, variants[variant], className)} {...props} />
    )
  }
)
Button.displayName = 'Button'
