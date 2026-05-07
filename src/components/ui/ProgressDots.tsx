import { clsx } from 'clsx'

interface Props {
  total: number
  current: number
}

export function ProgressDots({ total, current }: Props) {
  return (
    <div className="flex gap-1.5 items-center">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={clsx(
            'rounded-full transition-all duration-300',
            i === current
              ? 'w-4 h-2 bg-navi-accent'
              : 'w-2 h-2 bg-navi-border'
          )}
        />
      ))}
    </div>
  )
}
