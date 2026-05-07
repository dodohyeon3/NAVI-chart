import { create } from 'zustand'
import type { IndicatorSlug, CandleData } from '@/types'
import type { Period } from '@/data/mockCandles'

export type TimeUnit    = 'daily' | 'weekly' | 'monthly'
export type DrawingTool = 'none' | 'trendline' | 'hline' | 'erase'

interface ChartState {
  // 차트 데이터
  candleData: CandleData[]
  isLoading:  boolean
  error:      string | null
  setCandleData: (data: CandleData[]) => void
  setLoading:    (v: boolean) => void
  setError:      (msg: string | null) => void

  // 기간 · 단위
  period:      Period
  timeUnit:    TimeUnit
  setPeriod:   (p: Period) => void
  setTimeUnit: (u: TimeUnit) => void

  // 지표
  activeIndicators:  Set<IndicatorSlug>
  hoveredIndicator:  IndicatorSlug | null
  toggleIndicator:   (slug: IndicatorSlug) => void
  setHoveredIndicator: (slug: IndicatorSlug | null) => void

  // 작도 도구
  drawingTool:    DrawingTool
  setDrawingTool: (t: DrawingTool) => void
}

export const useChartStore = create<ChartState>((set) => ({
  candleData: [],
  isLoading:  true,
  error:      null,
  setCandleData: (candleData) => set({ candleData }),
  setLoading:    (isLoading)  => set({ isLoading }),
  setError:      (error)      => set({ error }),

  period:      '1Y',
  timeUnit:    'daily',
  setPeriod:   (period)   => set({ period }),
  setTimeUnit: (timeUnit) => set({ timeUnit }),

  activeIndicators: new Set(),
  hoveredIndicator: null,
  toggleIndicator: (slug) =>
    set((state) => {
      const next = new Set(state.activeIndicators)
      next.has(slug) ? next.delete(slug) : next.add(slug)
      return { activeIndicators: next }
    }),
  setHoveredIndicator: (hoveredIndicator) => set({ hoveredIndicator }),

  drawingTool:    'none',
  setDrawingTool: (drawingTool) => set({ drawingTool }),
}))
