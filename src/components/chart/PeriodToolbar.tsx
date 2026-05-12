'use client'

import { clsx } from 'clsx'
import { useChartStore, type TimeUnit } from '@/stores/chartStore'
import type { Period } from '@/data/mockCandles'

const PERIODS: { value: Period; label: string }[] = [
  { value: '1M',  label: '1개월' },
  { value: '3M',  label: '3개월' },
  { value: '6M',  label: '6개월' },
  { value: '1Y',  label: '1년' },
  { value: 'ALL', label: '전체' },
]

const UNITS: { value: TimeUnit; label: string }[] = [
  { value: 'daily',   label: '일' },
  { value: 'weekly',  label: '주' },
  { value: 'monthly', label: '월' },
]

export function PeriodToolbar() {
  const { period, timeUnit, setPeriod, setTimeUnit } = useChartStore()

  return (
    <div id="period-toolbar" className="flex flex-wrap items-center gap-3">
      {/* 기간 선택 */}
      <div className="flex gap-1 bg-navi-surface border border-navi-border rounded-xl p-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={clsx(
              'px-3 py-1 rounded-lg text-xs font-medium transition-all',
              period === p.value
                ? 'bg-navi-accent text-white'
                : 'text-navi-muted hover:text-navi-text'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 봉 단위 선택 */}
      <div className="flex gap-1 bg-navi-surface border border-navi-border rounded-xl p-1">
        {UNITS.map((u) => (
          <button
            key={u.value}
            onClick={() => setTimeUnit(u.value)}
            className={clsx(
              'px-3 py-1 rounded-lg text-xs font-medium transition-all',
              timeUnit === u.value
                ? 'bg-navi-accent text-white'
                : 'text-navi-muted hover:text-navi-text'
            )}
          >
            {u.label}
          </button>
        ))}
      </div>
    </div>
  )
}
