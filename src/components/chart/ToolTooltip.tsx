'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import type { Indicator } from '@/types'

interface Props {
  indicator: Indicator
  visible: boolean
}

export function ToolTooltip({ indicator, visible }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                     w-64 rounded-2xl bg-white shadow-2xl p-4 text-gray-900"
        >
          {/* 말풍선 꼬리 */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2
                          w-3 h-3 bg-white rotate-45 shadow-sm" />

          <p className="font-bold text-sm leading-tight">{indicator.name}</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            {indicator.oneLineSummary}
          </p>
          <Link
            href={`/indicator/${indicator.slug}`}
            className="mt-2 text-xs text-indigo-500 font-medium hover:underline block"
          >
            자세히 알아보기 →
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
