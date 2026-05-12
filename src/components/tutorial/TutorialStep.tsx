'use client'

import { motion } from 'framer-motion'
import { ProgressDots } from '@/components/ui/ProgressDots'
import { useTutorialStore } from '@/stores/tutorialStore'

export function TutorialStep() {
  const { currentStep, currentIndex, steps, next, prev, skip } = useTutorialStore()

  if (!currentStep) return null

  const isLast = currentIndex === steps.length - 1

  return (
    <motion.div
      key={currentStep.id}
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{ opacity: 0,    y: 16, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                 w-[92vw] max-w-[360px]
                 bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.22)] p-5"
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* 단계 배지 */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full">
              {currentIndex + 1} / {steps.length}
            </span>
          </div>

          <p className="font-bold text-gray-900 text-[15px] leading-snug">
            {currentStep.title}
          </p>
          <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">
            {currentStep.body}
          </p>
        </div>

        <button
          onClick={skip}
          className="text-gray-300 hover:text-gray-400 text-[11px] shrink-0 mt-0.5 transition-colors"
        >
          건너뛰기
        </button>
      </div>

      {/* tips 불릿 리스트 */}
      {currentStep.tips && currentStep.tips.length > 0 && (
        <ul className="mt-3 space-y-1.5 rounded-2xl bg-gray-50 p-3">
          {currentStep.tips.map((tip, i) => (
            <li key={i} className="flex gap-2 text-[12px] text-gray-600 leading-relaxed">
              <span className="text-indigo-300 shrink-0 mt-px">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      )}

      {/* 하단 네비게이션 */}
      <div className="flex items-center justify-between mt-4">
        <ProgressDots total={steps.length} current={currentIndex} />

        <div className="flex gap-2">
          {currentIndex > 0 && (
            <button
              onClick={prev}
              className="px-3 py-1.5 rounded-xl text-[13px] text-gray-500
                         border border-gray-200 hover:border-gray-300 transition"
            >
              이전
            </button>
          )}
          <button
            onClick={next}
            className="px-4 py-1.5 rounded-xl text-[13px] font-semibold
                       bg-indigo-500 text-white hover:bg-indigo-600 transition"
          >
            {isLast ? '🎉 완료' : '다음 →'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
