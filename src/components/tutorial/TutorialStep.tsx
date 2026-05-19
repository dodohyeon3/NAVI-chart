'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProgressDots } from '@/components/ui/ProgressDots'
import { useTutorialStore } from '@/stores/tutorialStore'
import type { TutorialStep as TStep } from '@/types'

/* ─── 상수 ────────────────────────────────────────────────── */
const GAP        = 12   // 타겟 ↔ 팝업 간격
const MARGIN     = 12   // 뷰포트 가장자리 여백
const PAD        = 6    // 하이라이트 링 패딩
const NAV_H      = 68   // 이전/다음 버튼 영역 높이
const SCROLL_MS  = 400  // 스크롤 완료 대기 시간 (ms)

/* ─── 타입 ────────────────────────────────────────────────── */
interface PopupPos {
  top:    number
  left:   number
  width:  number
  maxH:   number
  dir:    'top' | 'bottom' | 'left' | 'right'
  arrowX: number
  arrowY: number
}
interface HighlightRect {
  top: number; left: number; width: number; height: number
}

/* ─── 뷰포트에 맞는 팝업 너비 ─────────────────────────────── */
function popupWidth() {
  return Math.min(340, window.innerWidth - MARGIN * 2)
}

/* ─── 높이 추정 ───────────────────────────────────────────── */
function estimateH(step: TStep) {
  return 28 + 52 + 44 + (step.tips?.length ?? 0) * 30 + NAV_H + 44
}

/* ─── 팝업 표시에 적합한 위치로 스크롤 ───────────────────── *
 *  · position: 'bottom' → 타겟을 뷰포트 상단 20% 부근에 배치
 *  · position: 'top'    → 타겟을 뷰포트 하단 80% 부근에 배치
 *  · position: 'left'/'right' → 타겟을 뷰포트 중앙에 배치      */
function scrollToTarget(step: TStep): boolean {
  const el = document.querySelector(step.targetSelector)
  if (!el) return false

  const vh   = window.innerHeight
  const rect = el.getBoundingClientRect()
  let targetScrollY: number

  if (step.position === 'bottom') {
    // 팝업이 요소 아래에 올 공간 확보 → 요소를 화면 위쪽에
    const idealTop = vh * 0.18
    targetScrollY  = window.scrollY + rect.top - idealTop
  } else if (step.position === 'top') {
    // 팝업이 요소 위에 올 공간 확보 → 요소를 화면 아래쪽에
    const idealBottom = vh * 0.78
    targetScrollY     = window.scrollY + rect.bottom - idealBottom
  } else {
    // left / right → 요소를 화면 중앙에
    const idealCenter = vh * 0.45
    targetScrollY     = window.scrollY + rect.top + rect.height / 2 - idealCenter
  }

  window.scrollTo({ top: Math.max(0, targetScrollY), behavior: 'smooth' })
  return true
}

/* ─── 위치 계산 ───────────────────────────────────────────── */
function calcPos(step: TStep): { pos: PopupPos; highlight: HighlightRect | null } {
  const el   = document.querySelector(step.targetSelector)
  const vh   = window.innerHeight
  const vw   = window.innerWidth
  const w    = popupWidth()
  const estH = estimateH(step)

  if (!el) {
    const top = Math.max(MARGIN, (vh - estH) / 2)
    return {
      pos: { top, left: (vw - w) / 2, width: w, maxH: vh - top - MARGIN, dir: 'bottom', arrowX: w / 2, arrowY: 0 },
      highlight: null,
    }
  }

  const rect = el.getBoundingClientRect()
  const highlight: HighlightRect = {
    top: rect.top - PAD, left: rect.left - PAD,
    width: rect.width + PAD * 2, height: rect.height + PAD * 2,
  }

  // 가용 공간 측정
  const spaceBottom = vh - rect.bottom - GAP
  const spaceTop    = rect.top   - GAP
  const spaceRight  = vw - rect.right  - GAP
  const spaceLeft   = rect.left  - GAP

  // 자동 방향 결정: 넓은 공간 우선
  let dir = step.position
  if (dir === 'bottom' && spaceBottom < estH  && spaceTop    > spaceBottom) dir = 'top'
  if (dir === 'top'    && spaceTop    < estH  && spaceBottom > spaceTop)    dir = 'bottom'
  if (dir === 'right'  && spaceRight  < w     && spaceLeft   > spaceRight)  dir = 'left'
  if (dir === 'left'   && spaceLeft   < w     && spaceRight  > spaceLeft)   dir = 'right'

  // 모바일에서 left/right가 너무 좁으면 top/bottom으로 전환
  if ((dir === 'left' || dir === 'right') && w > vw * 0.55) {
    dir = spaceBottom >= spaceTop ? 'bottom' : 'top'
  }

  // raw 위치 계산
  let rawTop: number, rawLeft: number
  if      (dir === 'bottom') { rawTop = rect.bottom + GAP;                     rawLeft = rect.left + rect.width / 2 - w / 2 }
  else if (dir === 'top')    { rawTop = rect.top - estH - GAP;                 rawLeft = rect.left + rect.width / 2 - w / 2 }
  else if (dir === 'right')  { rawTop = rect.top + rect.height / 2 - estH / 2; rawLeft = rect.right + GAP }
  else                       { rawTop = rect.top + rect.height / 2 - estH / 2; rawLeft = rect.left - w - GAP }

  // 뷰포트 클램핑
  const cLeft = Math.max(MARGIN, Math.min(rawLeft, vw - w - MARGIN))
  const cTop  = Math.max(MARGIN, Math.min(rawTop,  vh - NAV_H - MARGIN))
  const maxH  = Math.max(NAV_H + 120, vh - cTop - MARGIN)

  // 화살표 위치
  const arrowX = (dir === 'bottom' || dir === 'top')
    ? Math.max(16, Math.min(rect.left + rect.width  / 2 - cLeft, w    - 16)) : 0
  const arrowY = (dir === 'left'   || dir === 'right')
    ? Math.max(16, Math.min(rect.top  + rect.height / 2 - cTop,  estH - 16)) : 0

  return { pos: { top: cTop, left: cLeft, width: w, maxH, dir, arrowX, arrowY }, highlight }
}

/* ═══════════════════════════════════════════════════════════════
   컴포넌트
═══════════════════════════════════════════════════════════════ */
export function TutorialStep() {
  const { currentStep, currentIndex, steps, next, prev, skip } = useTutorialStore()

  const [pos, setPos] = useState<PopupPos | null>(null)
  const [hl,  setHl]  = useState<HighlightRect | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── 위치 재계산 (리사이즈 시) ─────────────────────────── */
  const recompute = useCallback(() => {
    if (!currentStep) { setPos(null); setHl(null); return }
    const { pos, highlight } = calcPos(currentStep)
    setPos(pos); setHl(highlight)
  }, [currentStep])

  /* ── 스텝 변경 시: 스크롤 → 팝업 위치 계산 ─────────────── */
  useEffect(() => {
    if (!currentStep) { setPos(null); setHl(null); return }

    // 이전 타이머 초기화
    if (timerRef.current) clearTimeout(timerRef.current)

    // 스크롤하는 동안 팝업 숨김
    setPos(null); setHl(null)

    const hasEl = scrollToTarget(currentStep)
    const delay = hasEl ? SCROLL_MS : 0

    // 스크롤 완료 후 위치 계산
    timerRef.current = setTimeout(() => {
      const { pos, highlight } = calcPos(currentStep)
      setPos(pos); setHl(highlight)
    }, delay)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [currentStep]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 리사이즈 대응 ──────────────────────────────────────── */
  useEffect(() => {
    window.addEventListener('resize', recompute)
    return () => window.removeEventListener('resize', recompute)
  }, [recompute])

  if (!currentStep) return null
  const isLast = currentIndex === steps.length - 1

  /* ── 공통 콘텐츠 ────────────────────────────────────────── */
  const Body = ({ maxH }: { maxH?: number }) => (
    <div className="overflow-y-auto" style={maxH ? { maxHeight: Math.max(80, maxH) } : undefined}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full">
              {currentIndex + 1} / {steps.length}
            </span>
          </div>
          <p className="font-bold text-gray-900 text-[15px] leading-snug">{currentStep.title}</p>
          <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">{currentStep.body}</p>
        </div>
        <button
          onClick={skip}
          className="text-gray-300 hover:text-gray-400 text-[11px] shrink-0 mt-0.5 transition-colors"
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
  )

  /* ── 네비게이션 ─────────────────────────────────────────── */
  const Nav = () => (
    <div className="flex items-center justify-between flex-shrink-0 mt-4">
      <ProgressDots total={steps.length} current={currentIndex} />
      <div className="flex gap-2">
        {currentIndex > 0 && (
          <button
            onClick={prev}
            className="px-3 py-1.5 rounded-xl text-[13px] text-gray-500 border border-gray-200 hover:border-gray-300 transition"
          >
            이전
          </button>
        )}
        <button
          onClick={next}
          className="px-4 py-1.5 rounded-xl text-[13px] font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition"
        >
          {isLast ? '🎉 완료' : '다음 →'}
        </button>
      </div>
    </div>
  )

  return (
    <AnimatePresence mode="wait">
      <>
        {/* ── 하이라이트 링 ──────────────────────────────────── */}
        {hl && (
          <motion.div
            key={`hl-${currentStep.id}`}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'fixed', top: hl.top, left: hl.left,
              width: hl.width, height: hl.height,
              zIndex: 45, pointerEvents: 'none', borderRadius: 12,
              boxShadow: '0 0 0 2px #818cf8, 0 0 0 5px rgba(99,102,241,0.25)',
            }}
          />
        )}

        {/* ── 플로팅 팝업 ────────────────────────────────────── */}
        {pos && (
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, scale: 0.94, y: 6 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{   opacity: 0, scale: 0.94,  y: 6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', top: pos.top, left: pos.left,
              width: pos.width, maxHeight: pos.maxH,
              zIndex: 50, display: 'flex', flexDirection: 'column',
            }}
            className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.22)] p-5"
          >
            {/* 방향 화살표 */}
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

            {/* 콘텐츠 */}
            <Body maxH={pos.maxH - NAV_H - 44} />
            <Nav />
          </motion.div>
        )}
      </>
    </AnimatePresence>
  )
}
