import { clsx } from 'clsx'

interface Props {
  level: 1 | 2 | 3
}

const labels = { 1: '쉬움', 2: '보통', 3: '어려움' }
const colors = {
  1: 'bg-green-900/40 text-green-400 border-green-800',
  2: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
  3: 'bg-red-900/40 text-red-400 border-red-800',
}

export function DifficultyBadge({ level }: Props) {
  return (
    <span
      className={clsx(
        'text-xs px-2 py-0.5 rounded-full border',
        colors[level]
      )}
    >
      {labels[level]}
    </span>
  )
}
