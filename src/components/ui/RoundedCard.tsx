import { clsx } from 'clsx'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

export function RoundedCard({ children, className, padding = 'md' }: Props) {
  return (
    <div
      className={clsx(
        'bg-navi-surface border border-navi-border rounded-2xl',
        {
          'p-3': padding === 'sm',
          'p-5': padding === 'md',
          'p-8': padding === 'lg',
        },
        className
      )}
    >
      {children}
    </div>
  )
}
