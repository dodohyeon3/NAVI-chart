'use client'

import { motion } from 'framer-motion'
import { ProgressDots } from '@/components/ui/ProgressDots'
import { useTutorialStore } from '@/stores/tutorialStore'

export function TutorialStep() {
  const { currentStep, currentIndex, steps, next, prev, skip } = useTutorialStore()

  if (!currentStep) return null

  return (
    <motion.div
      key={currentStep.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50
                 w-[90vw] max-w-sm
                 bg-white rounded-3xl shadow-2xl p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-bold text-gray-900 text-base leading-snug">
            {currentStep.title}
          </p>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
            {currentStep.body}
          </p>
        </div>

        <button
          onClick={skip}
          className="text-gray-300 hover:text-gray-500 text-xs shrink-0 mt-0.5"
        >
          건너뛰기
        </button>
      </div>

      <div className="flex items-center justify-between mt-5">
        <ProgressDots total={steps.length} current={currentIndex} />

        <div className="flex gap-2">
          {currentIndex > 0 && (
            <button
              onClick={prev}
              className="px-3 py-1.5 rounded-xl text-sm text-gray-500
                         border border-gray-200 hover:border-gray-400 transition"
            >
              이전
            </button>
          )}
          <button
            onClick={next}
            className="px-4 py-1.5 rounded-xl text-sm font-semibold
                       bg-indigo-500 text-white hover:bg-indigo-600 transition"
          >
            {currentIndex === steps.length - 1 ? '완료' : '다음'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
