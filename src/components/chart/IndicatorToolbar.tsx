'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { ToolTooltip } from './ToolTooltip'
import { useChartStore } from '@/stores/chartStore'
import { indicators } from '@/data/indicators'
import type { IndicatorSlug } from '@/types'

const TOOLBAR_ITEMS: IndicatorSlug[] = [
  'moving-average',
  'rsi',
  'macd',
  'bollinger',
  'trendline',
  'fibonacci',
]

const SHORT_LABELS: Record<IndicatorSlug, string> = {
  'moving-average': 'MA',
  rsi:              'RSI',
  macd:             'MACD',
  bollinger:        'BB',
  trendline:        '추세선',
  fibonacci:        'Fib',
}

export function IndicatorToolbar() {
  const { activeIndicators, toggleIndicator } = useChartStore()
  const [hovered, setHovered] = useState<IndicatorSlug | null>(null)

  return (
    <div
      id="indicator-toolbar"
      className="flex flex-wrap gap-2 items-center"
    >
      {TOOLBAR_ITEMS.map((slug) => {
        const indicator = indicators[slug]
        const isActive = activeIndicators.has(slug)

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
                  ? 'bg-navi-accent text-white'
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
