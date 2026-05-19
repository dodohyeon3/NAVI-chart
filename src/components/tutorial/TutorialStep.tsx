'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProgressDots } from '@/components/ui/ProgressDots'
import { useTutorialStore } from '@/stores/tutorialStore'
import type { TutorialStep as TStep } from '@/types'

/* ─── 상수 ────────────────────────────────────────────────── */
const POPUP_W   = 340   // 데스크톱 팝업 너비
const GAP       = 14    // 타겟 ↔ 팝업 간격
const MARGIN    = 10    // 뷰포트 가장자리 여백
const PAD       = 6     // 하이라이트 링 패딩
const NAV_H     = 68    // 이전/다음 버튼 영역 높이 (항상 보장)
const CONTENT_MIN = 130 // 콘텐츠 영역 최소 높이 — 이보다 작으면 하단 시트로 전환

/* ─── 소형 화면 판정 ──────────────────────────────────────── *
 *  · 너비 < 640px  → 모바일                                    *
 *  · 높이 < 768px  → 창모드 PC / 소형 노트북                    *
 *  두 조건 중 하나라도 해당하면 하단 시트를 사용합니다.           */
function isSmall() {
  return window.innerWidth < 640 || window.innerHeight < 768
}

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

/* ─── 높이 추정 (보수적으로) ──────────────────────────────── */
function estimateH(step: TStep) {
  // badge + title(2줄) + body(2줄) + tips(줄당) + nav + 패딩
  return 28 + 52 + 44 + (step.tips?.length ?? 0) * 30 + NAV_H + 44
}

/* ─── 위치 계산 ───────────────────────────────────────────── */
function calcPos(step: TStep): { pos: PopupPos; highlight: HighlightRect | null } {
  const el  = document.querySelector(step.targetSelector)
  const vh  = window.innerHeight
  const vw  = window.innerWidth
  const estH = estimateH(step)
  const w   = Math.min(POPUP_W, vw - MARGIN * 2)

  if (!el) {
    const top = Math.max(MARGIN, vh - estH - 40)
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

  // 자동 방향 뒤집기
  let dir = step.position
  if (dir === 'bottom' && rect.bottom + GAP + estH    > vh - MARGIN)  dir = 'top'
  if (dir === 'top'    && rect.top    - GAP - estH    < MARGIN)        dir = 'bottom'
  if (dir === 'right'  && rect.right  + GAP + w       > vw - MARGIN)   dir = 'left'
  if (dir === 'left'   && rect.left   - GAP - w       < MARGIN)        dir = 'right'

  // raw 위치
  let rawTop: number, rawLeft: number
  if      (dir === 'bottom') { rawTop = rect.bottom + GAP;                    rawLeft = rect.left + rect.width / 2 - w / 2 }
  else if (dir === 'top')    { rawTop = rect.top - estH - GAP;                rawLeft = rect.left + rect.width / 2 - w / 2 }
  else if (dir === 'right')  { rawTop = rect.top + rect.height / 2 - estH/2;  rawLeft = rect.right + GAP }
  else                       { rawTop = rect.top + rect.height / 2 - estH/2;  rawLeft = rect.left - w - GAP }

  // 뷰포트 클램핑 — 최소 NAV_H + CONTENT_MIN + 여백 확보
  const minTop = MARGIN
  const maxTop = vh - NAV_H - CONTENT_MIN - MARGIN
  const cLeft  = Math.max(MARGIN, Math.min(rawLeft, vw - w - MARGIN))
  const cTop   = Math.max(minTop, Math.min(rawTop, maxTop))
  const maxH   = vh - cTop - MARGIN

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

  const [useSheet, setUseSheet] = useState(false)
  const [pos,      setPos]      = useState<PopupPos | null>(null)
  const [hl,       setHl]       = useState<HighlightRect | null>(null)

  const recompute = useCallback(() => {
    if (!currentStep) { setPos(null); setHl(null); setUseSheet(false); return }

    // ① 소형 화면 기준 충족 → 무조건 하단 시트
    if (isSmall()) { setPos(null); setHl(null); setUseSheet(true); return }

    // ② 위치 계산
    const { pos, highlight } = calcPos(currentStep)

    // ③ 계산 후에도 콘텐츠 공간이 부족하면 하단 시트로 전환
    const contentH = pos.maxH - NAV_H - 44
    if (contentH < CONTENT_MIN) {
      setPos(null); setHl(null); setUseSheet(true); return
    }

    setPos(pos); setHl(highlight); setUseSheet(false)
  }, [currentStep])

  useEffect(() => {
    const id = requestAnimationFrame(recompute)
    window.addEventListener('resize', recompute)
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', recompute) }
  }, [recompute])

  if (!currentStep) return null
  const isLast = currentIndex === steps.length - 1

  /* ── 공통 콘텐츠 (헤더 + tips) ────────────────────────────── */
  const Body = ({ maxH }: { maxH?: number }) => (
    <div className="overflow-y-auto" style={maxH ? { maxHeight: maxH } : undefined}>
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
        <button onClick={skip} className="text-gray-300 hover:text-gray-400 text-[11px] shrink-0 mt-0.5 transition-colors">
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

  /* ── 네비게이션 (항상 가시) ─────────────────────────────────── */
  const Nav = ({ border = false }: { border?: boolean }) => (
    <div className={`flex items-center justify-between flex-shrink-0 ${border ? 'pt-3 mt-1 border-t border-gray-100' : 'mt-4'}`}>
      <ProgressDots total={steps.length} current={currentIndex} />
      <div className="flex gap-2">
        {currentIndex > 0 && (
          <button onClick={prev} className="px-3 py-1.5 rounded-xl text-[13px] text-gray-500 border border-gray-200 hover:border-gray-300 transition">
            이전
          </button>
        )}
        <button onClick={next} className="px-4 py-1.5 rounded-xl text-[13px] font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition">
          {isLast ? '🎉 완료' : '다음 →'}
        </button>
      </div>
    </div>
  )

  return (
    <AnimatePresence mode="wait">
      <>
        {/* ── 하이라이트 링 (데스크톱만) ──────────────────── */}
        {hl && !useSheet && (
          <motion.div
            key={`hl-${currentStep.id}`}
            initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ position:'fixed', top:hl.top, left:hl.left, width:hl.width, height:hl.height,
                     zIndex:45, pointerEvents:'none', borderRadius:12,
                     boxShadow:'0 0 0 2px #818cf8, 0 0 0 5px rgba(99,102,241,0.25)' }}
          />
        )}

        {/* ════════════════════════════════════════════════
            하단 시트 — 모바일 / 창모드 / 공간 부족 시
        ════════════════════════════════════════════════ */}
        {useSheet && (
          <motion.div
            key={`sheet-${currentStep.id}`}
            initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 48 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            onClick={e => e.stopPropagation()}
            style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:50 }}
            className="bg-white rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.18)] flex flex-col"
          >
            {/* 드래그 핸들 */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* 스크롤 가능 콘텐츠 */}
            <div className="overflow-y-auto px-5 py-2" style={{ maxHeight: 'calc(65dvh - 80px)' }}>
              <Body />
            </div>

            {/* 네비게이션 — 항상 고정 */}
            <div className="px-5 pb-4 pt-1 flex-shrink-0">
              <Nav border />
            </div>
            <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} className="flex-shrink-0" />
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════
            데스크톱 플로팅 팝업
        ════════════════════════════════════════════════ */}
        {!useSheet && pos && (
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ position:'fixed', top:pos.top, left:pos.left, width:pos.width,
                     maxHeight:pos.maxH, zIndex:50, display:'flex', flexDirection:'column' }}
            className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-5"
          >
            {/* 방향 화살표 */}
            {pos.dir === 'bottom' && <div style={{ position:'absolute', top:-8,    left:pos.arrowX-8 }} className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-white" />}
            {pos.dir === 'top'    && <div style={{ position:'absolute', bottom:-8, left:pos.arrowX-8 }} className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white" />}
            {pos.dir === 'right'  && <div style={{ position:'absolute', left:-8,   top:pos.arrowY-8  }} className="w-0 h-0 border-t-[8px] border-b-[8px] border-r-[8px] border-t-transparent border-b-transparent border-r-white" />}
            {pos.dir === 'left'   && <div style={{ position:'absolute', right:-8,  top:pos.arrowY-8  }} className="w-0 h-0 border-t-[8px] border-b-[8px] border-l-[8px] border-t-transparent border-b-transparent border-l-white" />}

            {/* 스크롤 가능 콘텐츠 */}
            <Body maxH={pos.maxH - NAV_H - 44} />
            {/* 네비게이션 — flex-shrink-0으로 항상 가시 */}
            <Nav />
          </motion.div>
        )}
      </>
    </AnimatePresence>
  )
}
