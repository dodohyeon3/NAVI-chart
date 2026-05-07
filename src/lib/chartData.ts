import { allDailyData, filterByPeriod, toWeekly, toMonthly } from '@/data/mockCandles'
import type { Period } from '@/data/mockCandles'
import type { TimeUnit } from '@/stores/chartStore'
import type { CandleData } from '@/types'

export function getCurrentData(period: Period, timeUnit: TimeUnit): CandleData[] {
  const filtered = filterByPeriod(allDailyData, period)
  if (timeUnit === 'weekly') return toWeekly(filtered)
  if (timeUnit === 'monthly') return toMonthly(filtered)
  return filtered
}
