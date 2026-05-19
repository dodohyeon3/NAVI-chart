'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProgressDots } from '@/components/ui/ProgressDots'
import { useTutorialStore } from '@/stores/tutorialStore'
import type { TutorialStep as TStep } from '@/types'

/* ─── 상수 ────────────────────────────────────────────────── */
const POPUP_W = 340   // 데스크톱 팝업 너비 (px)
const GAP     = 14    // 타겟 ~ 팝업 간격
const MARGIN  = 10    // 뷰포트 가장자리 여백
const PAD     = 6     // 하이라이트 링 패딩
const NAV_H   = 60    // 네비게이션(이전/다음) 영역 최소 높이 — 항상 보장

/* ─── "좁은 화면" 기준: 모바일 또는 창모드 PC ──────────────── */
function isSmallScreen() {
  return window.innerWidth < 640 || window.innerHeight < 560
}

/* ─── 위치 계산 타입 ──────────────────────────────────────── */
interface PopupPos {
  top:    number
  left:   number
  width:  number
  maxH:   number   // 팝업이 차지할 수 있는 최대 높이
  dir:    'top' | 'bottom' | 'left' | 'right'
  arrowX: number
  arrowY: number
}
interface HighlightRect {
  top: number; left: number; width: number; height: number
}

/* ─── 높이 추정 (보수적으로 + 여유) ─────────────────────────
   실제 렌더 높이는 텍스트 줄바꿈 등으로 더 클 수 있으므로
   각 섹션별로 충분한 여유를 둡니다.                          */
function estimateH(step: TStep) {
  const tipLines = step.tips?.length ?? 0
  // badge(24) + title(48) + body(40) + tips(28/줄) + nav(56) + 패딩(40)
  return 24 + 48 + 40 + tipLines * 28 + 56 + 40
}

/* ─── 위치 계산 ───────────────────────────────────────────── */
function calcPosition(step: TStep): { pos: PopupPos; highlight: HighlightRect | null } {
  const el  = document.querySelector(step.targetSelector)
  const vh  = window.innerHeight
  const vw  = window.innerWidth
  const estH = estimateH(step)
  const actualW = Math.min(POPUP_W, vw - MARGIN * 2)

  if (!el) {
    const top = Math.max(MARGIN, vh - estH - MARGIN - 24)
    return {
      pos: {
        top, left: Math.max(MARGIN, (vw - actualW) / 2),
        width: actualW,
        maxH: vh - top - MARGIN,
        dir: 'bottom', arrowX: actualW / 2, arrowY: 0,
      },
      highlight: null,
    }
  }

  const rect = el.getBoundingClientRect()
  const highlight: HighlightRect = {
    top:   rect.top    - PAD,
    left:  rect.left   - PAD,
    width: rect.width  + PAD * 2,
    height:rect.height + PAD * 2,
  }

  /* 방향 자동 뒤집기 */
  let dir = step.position
  if (dir === 'bottom' && rect.bottom + GAP + estH    > vh - MARGIN) dir = 'top'
  if (dir === 'top'    && rect.top    - GAP - estH    < MARGIN)       dir = 'bottom'
  if (dir === 'right'  && rect.right  + GAP + actualW > vw - MARGIN)  dir = 'left'
  if (dir === 'left'   && rect.left   - GAP - actualW < MARGIN)        dir = 'right'

  /* raw 위치 */
  let rawTop: number, rawLeft: number
  if (dir === 'bottom') {
    rawTop  = rect.bottom + GAP
    rawLeft = rect.left + rect.width / 2 - actualW / 2
  } else if (dir === 'top') {
    rawTop  = rect.top - estH - GAP
    rawLeft = rect.left + rect.width / 2 - actualW / 2
  } else if (dir === 'right') {
    rawTop  = rect.top + rect.height / 2 - estH / 2
    rawLeft = rect.right + GAP
  } else {
    rawTop  = rect.top + rect.height / 2 - estH / 2
    rawLeft = rect.left - actualW - GAP
  }

  /* 뷰포트 클램핑 — 최소 NAV_H + 여백은 반드시 확보 */
  const cLeft = Math.max(MARGIN, Math.min(rawLeft, vw - actualW - MARGIN))
  const cTop  = Math.max(MARGIN, Math.min(rawTop,  vh - NAV_H - MARGIN * 2))
  const maxH  = vh - cTop - MARGIN   // 이 공간 안에서 팝업이 성장

  /* 화살표 오프셋 */
  const arrowX = (dir === 'bottom' || dir === 'top')
    ? Math.max(16, Math.min(rect.left + rect.width  / 2 - cLeft, actualW - 16))
    : 0
  const arrowY = (dir === 'left' || dir === 'right')
    ? Math.max(16, Math.min(rect.top  + rect.height / 2 - cTop,  estH    - 16))
    : 0

  return { pos: { top: cTop, left: cLeft, width: actualW, maxH, dir, arrowX, arrowY }, highlight }
}

/* ═══════════════════════════════════════════════════════════════
   공통 팝업 콘텐츠 (데스크톱 / 모바일 공유)
═══════════════════════════════════════════════════════════════ */
interface ContentProps {
  step:     TStep
  index:    number
  total:    number
  onPrev:   () => void
  onNext:   () => void
  onSkip:   () => void
  isLast:   boolean
  /** 콘텐츠(tips 등) 영역에 추가할 스크롤 높이 제한 */
  contentMaxH?: number
}

function PopupContent({ step, index, total, onPrev, onNext, onSkip, isLast, contentMaxH }: ContentProps) {
  return (
    <>
      {/* ── 스크롤 가능 본문 ──────────────────────────────── */}
      <div
        className="overflow-y-auto"
        style={contentMaxH ? { maxHeight: contentMaxH } : undefined}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full">
                {index + 1} / {total}
              </span>
            </div>
            <p className="font-bold text-gray-900 text-[15px] leading-snug">
              {step.title}
            </p>
            <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">
              {step.body}
            </p>
          </div>
          <button
            onClick={onSkip}
            className="text-gray-300 hover:text-gray-400 text-[11px] shrink-0 mt-0.5 transition-colors"
          >
            건너뛰기
          </button>
        </div>

        {/* Tips */}
        {step.tips && step.tips.length > 0 && (
          <ul className="mt-3 space-y-1.5 rounded-2xl bg-gray-50 p-3">
            {step.tips.map((tip, i) => (
              <li key={i} className="flex gap-2 text-[12px] text-gray-600 leading-relaxed">
                <span className="text-indigo-300 shrink-0 mt-px">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── 네비게이션 — 항상 화면에 고정 ───────────────────
           flex-shrink-0 이므로 팝업 높이가 줄어도 잘리지 않음 */}
      <div className="flex items-center justify-between mt-4 flex-shrink-0">
        <ProgressDots total={total} current={index} />
        <div className="flex gap-2">
          {index > 0 && (
            <button
              onClick={onPrev}
              className="px-3 py-1.5 rounded-xl text-[13px] text-gray-500
                         border border-gray-200 hover:border-gray-300 transition"
            >
              이전
            </button>
          )}
          <button
            onClick={onNext}
            className="px-4 py-1.5 rounded-xl text-[13px] font-semibold
                       bg-indigo-500 text-white hover:bg-indigo-600 transition"
          >
            {isLast ? '🎉 완료' : '다음 →'}
          </button>
        </div>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════
   메인 컴포넌트
═══════════════════════════════════════════════════════════════ */
export function TutorialStep() {
  const { currentStep, currentIndex, steps, next, prev, skip } = useTutorialStore()

  const [pos,       setPos]       = useState<PopupPos | null>(null)
  const [highlight, setHighlight] = useState<HighlightRect | null>(null)
  const [small,     setSmall]     = useState(false)

  /* 화면 크기 추적 */
  useEffect(() => {
    const check = () => setSmall(isSmallScreen())
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  /* 위치 재계산 */
  const recompute = useCallback(() => {
    if (!currentStep || isSmallScreen()) { setPos(null); setHighlight(null); return }
    const { pos, highlight } = calcPosition(currentStep)
    setPos(pos); setHighlight(highlight)
  }, [currentStep])

  useEffect(() => {
    const id = requestAnimationFrame(recompute)
    window.addEventListener('resize', recompute)
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', recompute) }
  }, [recompute])

  if (!currentStep) return null
  const isLast = currentIndex === steps.length - 1
  const contentProps: ContentProps = {
    step: currentStep, index: currentIndex, total: steps.length,
    onPrev: prev, onNext: next, onSkip: skip, isLast,
  }

  return (
    <AnimatePresence mode="wait">
      <>
        {/* ── 타겟 하이라이트 링 (데스크톱만) ─────────────── */}
        {highlight && !small && (
          <motion.div
            key={`hl-${currentStep.id}`}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              position:     'fixed',
              top:          highlight.top,
              left:         highlight.left,
              width:        highlight.width,
              height:       highlight.height,
              zIndex:       45,
              pointerEvents:'none',
              borderRadius: 12,
              boxShadow:    '0 0 0 2px #818cf8, 0 0 0 5px rgba(99,102,241,0.25)',
            }}
          />
        )}

        {/* ════════════════════════════════════════════════════
            모바일 / 좁은 창 → 하단 시트 (Bottom Sheet)
            항상 화면 아래에 붙어서 버튼이 절대 가리지 않음
        ════════════════════════════════════════════════════ */}
        {small && (
          <motion.div
            key={`sheet-${currentStep.id}`}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{ opacity: 0,    y: 40 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50 }}
            className="bg-white rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.18)]
                       flex flex-col"
            /* 최대 높이: 화면의 72% — 스크롤 가능 */
            onClick={e => e.stopPropagation()}
          >
            {/* 드래그 핸들 */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* 스크롤 가능 영역 */}
            <div
              className="overflow-y-auto px-5 pb-1"
              style={{ maxHeight: 'calc(72dvh - 120px)' }}
            >
              {/* 배지 + 제목 + 본문 */}
              <div className="flex items-start justify-between gap-3 pt-1">
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
                  className="text-gray-300 hover:text-gray-400 text-[11px] shrink-0 mt-0.5"
                >
                  건너뛰기
                </button>
              </div>

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
            </div>

            {/* ── 네비게이션 — 항상 최하단에 고정 ──────────── */}
            <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0
                            flex items-center justify-between">
              <ProgressDots total={steps.length} current={currentIndex} />
              <div className="flex gap-2">
                {currentIndex > 0 && (
                  <button
                    onClick={prev}
                    className="px-3 py-2 rounded-xl text-[13px] text-gray-500
                               border border-gray-200 hover:border-gray-300 transition"
                  >
                    이전
                  </button>
                )}
                <button
                  onClick={next}
                  className="px-5 py-2 rounded-xl text-[13px] font-semibold
                             bg-indigo-500 text-white hover:bg-indigo-600 transition"
                >
                  {isLast ? '🎉 완료' : '다음 →'}
                </button>
              </div>
            </div>

            {/* iOS 홈바 safe area */}
            <div className="h-[env(safe-area-inset-bottom,0px)] flex-shrink-0" />
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════
            데스크톱 → 타겟 기준 동적 위치 팝업
            max-height + 콘텐츠 스크롤로 버튼이 항상 보임
        ════════════════════════════════════════════════════ */}
        {!small && pos && (
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position:  'fixed',
              top:       pos.top,
              left:      pos.left,
              width:     pos.width,
              maxHeight: pos.maxH,
              zIndex:    50,
              display:   'flex',
              flexDirection: 'column',
            }}
            className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-5"
          >
            {/* 방향 화살표 */}
            {pos.dir === 'bottom' && (
              <div style={{ position: 'absolute', top: -8, left: pos.arrowX - 8 }}
                className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px]
                           border-l-transparent border-r-transparent border-b-white" />
            )}
            {pos.dir === 'top' && (
              <div style={{ position: 'absolute', bottom: -8, left: pos.arrowX - 8 }}
                className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px]
                           border-l-transparent border-r-transparent border-t-white" />
            )}
            {pos.dir === 'right' && (
              <div style={{ position: 'absolute', left: -8, top: pos.arrowY - 8 }}
                className="w-0 h-0 border-t-[8px] border-b-[8px] border-r-[8px]
                           border-t-transparent border-b-transparent border-r-white" />
            )}
            {pos.dir === 'left' && (
              <div style={{ position: 'absolute', right: -8, top: pos.arrowY - 8 }}
                className="w-0 h-0 border-t-[8px] border-b-[8px] border-l-[8px]
                           border-t-transparent border-b-transparent border-l-white" />
            )}

            {/* 콘텐츠: 남은 높이에서 NAV_H 를 뺀 만큼만 스크롤 허용 */}
            <PopupContent
              {...contentProps}
              contentMaxH={pos.maxH - NAV_H - 40 /* padding */}
            />
          </motion.div>
        )}
      </>
    </AnimatePresence>
  )
}
