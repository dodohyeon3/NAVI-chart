'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { ToolTooltip } from './ToolTooltip'
import { useChartStore } from '@/stores/chartStore'
import { indicators } from '@/data/indicators'
import type { IndicatorSlug } from '@/types'

// 추세선·피보나치는 작도 도구로 분리 → 여기서 제외
const ANALYSIS_TOOLS: IndicatorSlug[] = [
  'moving-average',
  'rsi',
  'macd',
  'bollinger',
]

const SHORT_LABELS: Partial<Record<IndicatorSlug, string>> = {
  'moving-average': 'MA',
  rsi:              'RSI',
  macd:             'MACD',
  bollinger:        'BB',
}

export function IndicatorToolbar() {
  const { activeIndicators, toggleIndicator } = useChartStore()
  const [hovered, setHovered] = useState<IndicatorSlug | null>(null)

  return (
    <div id="indicator-toolbar" className="flex flex-wrap gap-2 items-center">
      {ANALYSIS_TOOLS.map((slug) => {
        const indicator = indicators[slug]
        const isActive  = activeIndicators.has(slug)

        return (
          <div
            key={slug}
            id={`btn-${slug}`}
            className="relative"
            onMouseEnter={() => setHovered(slug)}
            onMouseLeave={() => setHovered(null)}
          >
            <button
              onClick={() => toggleIndicator(slug)}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150',
                isActive
                  ? 'bg-navi-accent text-white shadow-lg shadow-navi-accent/20'
                  : 'bg-navi-border text-navi-muted hover:bg-navi-accent/20 hover:text-navi-text'
              )}
            >
              {SHORT_LABELS[slug]}
            </button>

            <ToolTooltip indicator={indicator} visible={hovered === slug} />
          </div>
        )
      })}
    </div>
  )
}
