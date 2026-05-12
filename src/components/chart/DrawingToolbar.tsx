'use client'

import { clsx } from 'clsx'
import { useChartStore, type DrawingTool } from '@/stores/chartStore'

const DRAWING_TOOLS: {
  value:   DrawingTool
  label:   string
  icon:    string
  desc:    string
}[] = [
  {
    value: 'trendline',
    label: '추세선',
    icon:  '↗',
    desc:  '두 점을 클릭해서 추세선을 그어요',
  },
  {
    value: 'fibonacci',
    label: '피보나치',
    icon:  '𝚽',
    desc:  '고점·저점을 클릭해 되돌림 구간을 표시해요',
  },
]

const STEP_GUIDE: Record<DrawingTool, [string, string] | null> = {
  trendline: ['① 시작점을 클릭하세요', '② 끝점을 클릭하세요 — 선이 그어져요'],
  fibonacci: ['① 고점(또는 저점)을 클릭하세요', '② 반대 끝점을 클릭하세요 — 레벨이 표시돼요'],
  none:  null,
  erase: null,
}

export function DrawingToolbar() {
  const { drawingTool, drawingStep, setDrawingTool } = useChartStore()

  const guide = STEP_GUIDE[drawingTool]
  const currentGuide = guide ? guide[drawingStep] : null

  return (
    <div id="drawing-toolbar" className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {DRAWING_TOOLS.map((tool) => {
          const isActive = drawingTool === tool.value
          return (
            <div key={tool.value} className="relative group">
              <button
                onClick={() => setDrawingTool(isActive ? 'none' : tool.value)}
                className={clsx(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold',
                  'border transition-all duration-200',
                  isActive
                    ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-md shadow-amber-500/10'
                    : 'bg-navi-surface border-navi-border text-navi-muted',
                  !isActive && 'hover:border-amber-500/50 hover:text-amber-400'
                )}
              >
                <span className={clsx('text-sm leading-none', isActive && 'animate-pulse')}>
                  {tool.icon}
                </span>
                {tool.label}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>

              {/* 호버 설명 */}
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5
                           bg-gray-900 border border-gray-700 text-white text-xs rounded-xl
                           whitespace-nowrap opacity-0 group-hover:opacity-100
                           pointer-events-none transition-opacity z-50"
              >
                {tool.desc}
                {/* 말풍선 꼬리 */}
                <div className="absolute top-full left-1/2 -translate-x-1/2
                               border-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          )
        })}

        {/* 지우기 버튼 */}
        <button
          onClick={() => setDrawingTool('erase')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs
                     border border-navi-border text-navi-muted
                     hover:border-red-500/50 hover:text-red-400 transition-all"
        >
          <span>✕</span>
          모두 지우기
        </button>
      </div>

      {/* 단계별 안내 패널 */}
      {currentGuide && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl
                        bg-amber-500/10 border border-amber-500/30">
          {/* 스텝 인디케이터 */}
          <div className="flex gap-1 shrink-0">
            {[0, 1].map((i) => (
              <div
                key={i}
                className={clsx(
                  'rounded-full transition-all duration-300',
                  i === drawingStep
                    ? 'w-5 h-2 bg-amber-400'
                    : i < drawingStep
                    ? 'w-2 h-2 bg-amber-600'
                    : 'w-2 h-2 bg-navi-border'
                )}
              />
            ))}
          </div>
          <p className="text-xs text-amber-300 font-medium">{currentGuide}</p>

          {/* 취소 버튼 */}
          <button
            onClick={() => setDrawingTool('none')}
            className="ml-auto text-xs text-navi-muted hover:text-navi-text shrink-0"
          >
            취소
          </button>
        </div>
      )}
    </div>
  )
}
