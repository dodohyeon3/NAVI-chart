'use client'

import { useEffect } from 'react'
import { ChartContainer } from '@/components/chart/ChartContainer'
import { RSIChart } from '@/components/chart/RSIChart'
import { MACDChart } from '@/components/chart/MACDChart'
import { IndicatorToolbar } from '@/components/chart/IndicatorToolbar'
import { PeriodToolbar } from '@/components/chart/PeriodToolbar'
import { DrawingToolbar } from '@/components/chart/DrawingToolbar'
import { TutorialManager } from '@/components/tutorial/TutorialManager'
import { RoundedCard } from '@/components/ui/RoundedCard'
import { useTutorialStore } from '@/stores/tutorialStore'
import { useChartStore } from '@/stores/chartStore'
import Link from 'next/link'

export default function ChartPage() {
  const { hasCompletedOnce, start } = useTutorialStore()
  const { activeIndicators } = useChartStore()

  const showRSI  = activeIndicators.has('rsi')
  const showMACD = activeIndicators.has('macd')

  useEffect(() => {
    if (!hasCompletedOnce) {
      const timer = setTimeout(start, 800)
      return () => clearTimeout(timer)
    }
  }, [hasCompletedOnce, start])

  return (
    <>
      <TutorialManager />

      <div className="min-h-screen px-4 py-6 max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-navi-muted text-sm hover:text-navi-text">
            ← 홈
          </Link>
          <div className="text-center">
            <h1 className="text-navi-text font-bold text-sm">NVIDIA Corporation</h1>
            <p className="text-navi-muted text-xs">NVDA · NASDAQ  (학습용 데이터)</p>
          </div>
          <button onClick={start} className="text-xs text-navi-accent hover:underline">
            튜토리얼
          </button>
        </div>

        {/* 기간 · 봉 단위 */}
        <div className="mb-3">
          <PeriodToolbar />
        </div>

        {/* 메인 차트 */}
        <RoundedCard padding="sm">
          <ChartContainer />
          {showRSI  && <RSIChart />}
          {showMACD && <MACDChart />}
        </RoundedCard>

        {/* 분석 도구 */}
        <div className="mt-4">
          <p className="text-xs text-navi-muted mb-2">분석 도구 — 버튼을 클릭하면 차트에 나타나요</p>
          <IndicatorToolbar />
        </div>

        {/* 작도 도구 */}
        <div className="mt-3">
          <p className="text-xs text-navi-muted mb-2">직접 그려보기</p>
          <DrawingToolbar />
        </div>

        {/* 지표 상세 링크 */}
        <div className="mt-6">
          <p className="text-xs text-navi-muted mb-3">지표가 뭔지 더 알아보고 싶다면?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              ['rsi',            'RSI 설명'],
              ['macd',           'MACD 설명'],
              ['bollinger',      '볼린저 밴드 설명'],
              ['moving-average', '이동평균선 설명'],
              ['trendline',      '추세선 설명'],
              ['fibonacci',      '피보나치 설명'],
            ].map(([slug, label]) => (
              <Link
                key={slug}
                href={`/indicator/${slug}`}
                className="px-3 py-2 bg-navi-surface border border-navi-border
                           rounded-xl text-xs text-navi-muted hover:border-navi-accent
                           hover:text-navi-text transition-colors text-center"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
