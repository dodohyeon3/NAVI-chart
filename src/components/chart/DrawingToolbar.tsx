'use client'

import { clsx } from 'clsx'
import { useChartStore, type DrawingTool } from '@/stores/chartStore'

const TOOLS: { value: DrawingTool; label: string; icon: string; tip: string }[] = [
  {
    value: 'trendline',
    label: '추세선',
    icon: '↗',
    tip: '두 지점을 클릭하면 추세선이 그어져요',
  },
  {
    value: 'hline',
    label: '수평선',
    icon: '─',
    tip: '클릭한 가격에 수평선이 그어져요',
  },
  {
    value: 'erase',
    label: '지우기',
    icon: '✕',
    tip: '그린 선을 모두 지워요',
  },
]

export function DrawingToolbar() {
  const { drawingTool, setDrawingTool } = useChartStore()

  return (
    <div className="flex flex-wrap items-center gap-2">
      {TOOLS.map((tool) => (
        <div key={tool.value} className="relative group">
          <button
            onClick={() =>
              setDrawingTool(drawingTool === tool.value ? 'none' : tool.value)
            }
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
              drawingTool === tool.value
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-navi-surface border border-navi-border text-navi-muted hover:border-amber-500/40 hover:text-amber-400'
            )}
          >
            <span className="font-mono text-sm leading-none">{tool.icon}</span>
            {tool.label}
          </button>

          {/* 툴팁 */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1
                          bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap
                          opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            {tool.tip}
          </div>
        </div>
      ))}

      {/* 작도 중 안내 */}
      {drawingTool === 'trendline' && (
        <span className="text-xs text-amber-400 animate-pulse ml-1">
          차트에서 시작점을 클릭하세요
        </span>
      )}
      {drawingTool === 'hline' && (
        <span className="text-xs text-amber-400 animate-pulse ml-1">
          수평선을 그을 가격대를 클릭하세요
        </span>
      )}
    </div>
  )
}
