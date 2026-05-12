'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import type { Indicator } from '@/types'

interface Props {
  indicator: Indicator
  visible: boolean
}

/**
 * 분석 도구 버튼 호버 시 버튼 바로 위에 말풍선 표시
 *
 * 부모 요소에 반드시 `relative` + `overflow-visible` 이 있어야 합니다.
 * IndicatorToolbar 각 버튼 래퍼는 이미 `relative` 처리되어 있고,
 * 상위 카드에 `overflow-visible` 이 추가되어 있어 잘려나가지 않습니다.
 */
export function ToolTooltip({ indicator, visible }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.96 }}
          transition={{ duration: 0.13 }}
          /* 버튼 바로 위 / 수평 중앙 정렬 */
          className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2
                     z-[200] w-60
                     rounded-2xl bg-white shadow-[0_8px_32px_rgba(0,0,0,0.18)] p-4 text-gray-900
                     pointer-events-none"
        >
          {/* 말풍선 꼬리 (▼) */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-2
                        border-[8px] border-transparent border-t-white"
          />

          <p className="font-bold text-sm leading-tight">{indicator.name}</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            {indicator.oneLineSummary}
          </p>

          {/* 링크는 pointer-events-none 제거 후 별도 처리 — 호버 중엔 클릭 불가이므로 안내만 */}
          <p className="mt-2 text-xs text-indigo-400">
            버튼을 클릭하면 차트에 표시돼요
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
