import { create } from 'zustand'
import type { IndicatorSlug } from '@/types'
import type { Period } from '@/data/mockCandles'

export type TimeUnit = 'daily' | 'weekly' | 'monthly'
export type DrawingTool = 'none' | 'trendline' | 'hline' | 'erase'

interface ChartState {
  activeIndicators: Set<IndicatorSlug>
  hoveredIndicator: IndicatorSlug | null
  period: Period
  timeUnit: TimeUnit
  drawingTool: DrawingTool
  toggleIndicator: (slug: IndicatorSlug) => void
  setHoveredIndicator: (slug: IndicatorSlug | null) => void
  setPeriod: (p: Period) => void
  setTimeUnit: (u: TimeUnit) => void
  setDrawingTool: (t: DrawingTool) => void
}

export const useChartStore = create<ChartState>((set) => ({
  activeIndicators: new Set(),
  hoveredIndicator: null,
  period: '3M',
  timeUnit: 'daily',
  drawingTool: 'none',

  toggleIndicator: (slug) =>
    set((state) => {
      const next = new Set(state.activeIndicators)
      next.has(slug) ? next.delete(slug) : next.add(slug)
      return { activeIndicators: next }
    }),

  setHoveredIndicator: (slug) => set({ hoveredIndicator: slug }),
  setPeriod: (period) => set({ period }),
  setTimeUnit: (timeUnit) => set({ timeUnit }),
  setDrawingTool: (drawingTool) => set({ drawingTool }),
}))
