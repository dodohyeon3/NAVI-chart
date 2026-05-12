'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProgressDots } from '@/components/ui/ProgressDots'
import { useTutorialStore } from '@/stores/tutorialStore'
import type { TutorialStep as TStep } from '@/types'

/* ─── 상수 ────────────────────────────────────────────────── */
const POPUP_W  = 340   // 팝업 고정 너비 (px)
const GAP      = 14    // 타겟 ~ 팝업 간격
const MARGIN   = 10    // 뷰포트 가장자리 여백
const PAD      = 6     // 하이라이트 링 패딩

/* ─── 위치 계산 결과 타입 ──────────────────────────────────── */
interface PopupPos {
  top:      number
  left:     number
  dir:      'top' | 'bottom' | 'left' | 'right'
  arrowX:   number   // 위/아래 화살표일 때 팝업 왼쪽 기준 X 오프셋
  arrowY:   number   // 좌/우 화살표일 때 팝업 위 기준 Y 오프셋
}
interface HighlightRect {
  top: number; left: number; width: number; height: number
}

/* ─── 팝업 높이 추정 (tips 수 기반) ──────────────────────── */
function estimateH(step: TStep) {
  const tipLines = step.tips?.length ?? 0
  return 88 + tipLines * 24 + 64   // header + tips + nav
}

/* ─── 위치 계산 함수 ──────────────────────────────────────── */
function calcPosition(step: TStep): { pos: PopupPos; highlight: HighlightRect | null } {
  const el   = document.querySelector(step.targetSelector)
  const vh   = window.innerHeight
  const vw   = window.innerWidth
  const estH = estimateH(step)

  /* 타겟 없으면 화면 하단 중앙 */
  if (!el) {
    return {
      pos: {
        top:    vh - estH - MARGIN - 24,
        left:   Math.max(MARGIN, (vw - POPUP_W) / 2),
        dir:    'bottom',
        arrowX: POPUP_W / 2,
        arrowY: 0,
      },
      highlight: null,
    }
  }

  const rect = el.getBoundingClientRect()

  const highlight: HighlightRect = {
    top:    rect.top    - PAD,
    left:   rect.left   - PAD,
    width:  rect.width  + PAD * 2,
    height: rect.height + PAD * 2,
  }

  /* position 자동 뒤집기 (뷰포트 넘침 방지) */
  let dir = step.position
  if (dir === 'bottom' && rect.bottom + GAP + estH > vh - MARGIN) dir = 'top'
  if (dir === 'top'    && rect.top    - GAP - estH < MARGIN)       dir = 'bottom'
  if (dir === 'right'  && rect.right  + GAP + POPUP_W > vw - MARGIN) dir = 'left'
  if (dir === 'left'   && rect.left   - GAP - POPUP_W < MARGIN)       dir = 'right'

  /* 팝업 raw 위치 계산 */
  let rawTop: number, rawLeft: number
  if (dir === 'bottom') {
    rawTop  = rect.bottom + GAP
    rawLeft = rect.left + rect.width / 2 - POPUP_W / 2
  } else if (dir === 'top') {
    rawTop  = rect.top - estH - GAP
    rawLeft = rect.left + rect.width / 2 - POPUP_W / 2
  } else if (dir === 'right') {
    rawTop  = rect.top + rect.height / 2 - estH / 2
    rawLeft = rect.right + GAP
  } else {
    rawTop  = rect.top + rect.height / 2 - estH / 2
    rawLeft = rect.left - POPUP_W - GAP
  }

  /* 뷰포트 클램핑 */
  const cLeft = Math.max(MARGIN, Math.min(rawLeft, vw - POPUP_W - MARGIN))
  const cTop  = Math.max(MARGIN, Math.min(rawTop,  vh - estH   - MARGIN))

  /* 화살표 위치: 타겟 중심을 향하도록 */
  const arrowX =
    (dir === 'bottom' || dir === 'top')
      ? Math.max(16, Math.min(rect.left + rect.width  / 2 - cLeft, POPUP_W - 16))
      : 0
  const arrowY =
    (dir === 'left' || dir === 'right')
      ? Math.max(16, Math.min(rect.top  + rect.height / 2 - cTop,  estH    - 16))
      : 0

  return { pos: { top: cTop, left: cLeft, dir, arrowX, arrowY }, highlight }
}

/* ═══════════════════════════════════════════════════════════════
   컴포넌트
═══════════════════════════════════════════════════════════════ */
export function TutorialStep() {
  const { currentStep, currentIndex, steps, next, prev, skip } = useTutorialStore()

  const [pos,       setPos]       = useState<PopupPos | null>(null)
  const [highlight, setHighlight] = useState<HighlightRect | null>(null)

  const recompute = useCallback(() => {
    if (!currentStep) { setPos(null); setHighlight(null); return }
    const { pos, highlight } = calcPosition(currentStep)
    setPos(pos); setHighlight(highlight)
  }, [currentStep])

  /* 스텝 변경 & 리사이즈 시 위치 재계산 */
  useEffect(() => {
    const id = requestAnimationFrame(recompute)        // DOM 페인트 후 실행
    window.addEventListener('resize', recompute)
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', recompute) }
  }, [recompute])

  if (!currentStep) return null
  const isLast = currentIndex === steps.length - 1

  return (
    <AnimatePresence mode="wait">
      <>
        {/* ── 타겟 하이라이트 링 ──────────────────────────── */}
        {highlight && (
          <motion.div
            key={`hl-${currentStep.id}`}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'fixed',
              top:    highlight.top,
              left:   highlight.left,
              width:  highlight.width,
              height: highlight.height,
              zIndex: 45,
              pointerEvents: 'none',
              borderRadius: 12,
              boxShadow: '0 0 0 2px #818cf8, 0 0 0 5px rgba(99,102,241,0.25)',
            }}
          />
        )}

        {/* ── 팝업 ────────────────────────────────────────── */}
        {pos && (
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: POPUP_W, zIndex: 50 }}
            className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-5"
          >
            {/* ── 방향 화살표 ─────────────────────────────── */}
            {pos.dir === 'bottom' && (
              <div style={{ position: 'absolute', top: -8, left: pos.arrowX - 8 }}
                className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-white" />
            )}
            {pos.dir === 'top' && (
              <div style={{ position: 'absolute', bottom: -8, left: pos.arrowX - 8 }}
                className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white" />
            )}
            {pos.dir === 'right' && (
              <div style={{ position: 'absolute', left: -8, top: pos.arrowY - 8 }}
                className="w-0 h-0 border-t-[8px] border-b-[8px] border-r-[8px] border-t-transparent border-b-transparent border-r-white" />
            )}
            {pos.dir === 'left' && (
              <div style={{ position: 'absolute', right: -8, top: pos.arrowY - 8 }}
                className="w-0 h-0 border-t-[8px] border-b-[8px] border-l-[8px] border-t-transparent border-b-transparent border-l-white" />
            )}

            {/* ── 헤더 ────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
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

            {/* ── Tips 불릿 ───────────────────────────────── */}
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

            {/* ── 하단 네비게이션 ──────────────────────────── */}
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
        )}
      </>
    </AnimatePresence>
  )
}
