'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { SimulateChart } from '@/components/simulate/SimulateChart'
import type { CandleData } from '@/types'

/* ─── 구간 설정 ──────────────────────────────────────────────── */
const PAST_DAYS   = 350  // 약 16개월 (분석 구간)
const FUTURE_DAYS = 150  // 약 7개월  (예측 구간)
const TOTAL_NEEDED = PAST_DAYS + FUTURE_DAYS

/** 랜덤(또는 시드 기반) 으로 past/future 를 잘라냄 */
function pickWindow(data: CandleData[], seed?: number) {
  if (data.length < TOTAL_NEEDED) {
    // 데이터 부족 시 마지막 부분을 최대한 사용
    const cutAt = Math.max(1, data.length - Math.floor(data.length * 0.3))
    return { past: data.slice(0, cutAt), future: data.slice(cutAt) }
  }
  const maxStart = data.length - TOTAL_NEEDED
  const start = seed !== undefined
    ? Math.abs(seed) % (maxStart + 1)
    : Math.floor(Math.random() * (maxStart + 1))
  return {
    past:   data.slice(start, start + PAST_DAYS),
    future: data.slice(start + PAST_DAYS, start + PAST_DAYS + FUTURE_DAYS),
  }
}

export default function SimulatePage() {
  const [allData, setAllData] = useState<CandleData[]>([])
  const [past,    setPast]    = useState<CandleData[]>([])
  const [future,  setFuture]  = useState<CandleData[]>([])
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  /* ── 최초 데이터 fetch ───────────────────────────────────── */
  useEffect(() => {
    fetch('/api/candles?symbol=NVDA&period=ALL&timeUnit=daily')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((data: CandleData[]) => {
        setAllData(data)
        const { past, future } = pickWindow(data)
        setPast(past); setFuture(future)
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  /* ── 다른 구간 선택 ─────────────────────────────────────── */
  const retry = useCallback(() => {
    if (allData.length === 0) return
    const { past, future } = pickWindow(allData)
    setPast(past); setFuture(future)
    setAttempt(a => a + 1)
  }, [allData])

  /* ── 로딩 / 에러 ─────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-navi-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-navi-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-navi-muted">NVDA 데이터 불러오는 중...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-navi-bg">
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-red-400">데이터를 불러오지 못했어요</p>
        <Link href="/chart" className="text-xs text-navi-accent hover:underline">차트로 돌아가기</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-navi-bg px-4 py-6 max-w-4xl mx-auto">

      {/* ── 헤더 ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/chart" className="text-navi-muted text-sm hover:text-navi-text">
          ← 차트로 돌아가기
        </Link>
        <div className="text-center">
          <h1 className="text-navi-text font-bold text-sm">예측 시뮬레이션</h1>
          <p className="text-navi-muted text-xs">NVDA · 과거 데이터 챌린지</p>
        </div>
        <button onClick={retry} className="text-xs text-navi-accent hover:underline">
          다른 구간
        </button>
      </div>

      {/* ── 안내 배너 ────────────────────────────────────────── */}
      <div className="mb-4 bg-navi-surface border border-navi-border rounded-2xl p-4">
        <p className="text-sm font-semibold text-navi-text mb-1.5">
          📊 이 시점 이후, 차트는 어떻게 됐을까요?
        </p>
        <p className="text-xs text-navi-muted leading-relaxed">
          아래 차트는 NVDA의 실제 과거 {PAST_DAYS}일(약 {Math.round(PAST_DAYS / 21)}개월) 데이터예요.
          노란 점선 오른쪽의 {FUTURE_DAYS}일이 숨겨져 있어요.
          분석 도구·작도 도구를 활용해 예측한 뒤{' '}
          <span className="text-indigo-400 font-medium">결과 보기</span>를 눌러보세요.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-navi-muted">
          <span>🔵 분석 도구로 지표 추가</span>
          <span>✏️ 작도 도구로 직접 그리기</span>
          <span>🔮 결과 보기로 정답 확인</span>
          <span>🔄 다른 구간으로 반복 연습</span>
        </div>
      </div>

      {/* ── 시뮬레이션 차트 ─────────────────────────────────── */}
      {past.length > 0 && future.length > 0 && (
        <SimulateChart
          key={attempt}
          pastData={past}
          futureData={future}
          onRetry={retry}
        />
      )}
    </div>
  )
}
