'use client'

import { useEffect, useRef, useCallback } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts'
import { useChartStore } from '@/stores/chartStore'
import { calcBollingerBands, calcMA } from '@/lib/indicators'

type LineSeries = ISeriesApi<'Line'>

// 피보나치 레벨 정의
const FIB_LEVELS = [
  { ratio: 0,     label: '0%',    color: '#94a3b8' },
  { ratio: 0.236, label: '23.6%', color: '#60a5fa' },
  { ratio: 0.382, label: '38.2%', color: '#34d399' },
  { ratio: 0.5,   label: '50%',   color: '#fbbf24' },
  { ratio: 0.618, label: '61.8%', color: '#f97316' },
  { ratio: 0.786, label: '78.6%', color: '#f472b6' },
  { ratio: 1,     label: '100%',  color: '#94a3b8' },
]

export function ChartContainer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const candleRef    = useRef<ISeriesApi<'Candlestick'> | null>(null)

  // 오버레이 지표 refs
  const bbRef = useRef<{ upper: LineSeries; middle: LineSeries; lower: LineSeries } | null>(null)
  const maRef = useRef<{ ma20: LineSeries; ma60: LineSeries } | null>(null)

  // 작도 refs
  const drawnLinesRef   = useRef<LineSeries[]>([])
  const pendingPointRef = useRef<{ time: Time; price: number } | null>(null)
  const previewLineRef  = useRef<LineSeries | null>(null)

  const {
    candleData, isLoading, error,
    activeIndicators,
    drawingTool, drawingStep,
    setDrawingTool, setDrawingStep,
  } = useChartStore()

  // ── 차트 최초 생성 ────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a2e' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#2a2a45' },
        horzLines: { color: '#2a2a45' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#2a2a45' },
      timeScale: { borderColor: '#2a2a45', timeVisible: true },
      width: containerRef.current.clientWidth,
      height: 440,
    })

    const series = chart.addCandlestickSeries({
      upColor:         '#26a69a',
      downColor:       '#ef5350',
      borderUpColor:   '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor:     '#26a69a',
      wickDownColor:   '#ef5350',
    })

    chartRef.current  = chart
    candleRef.current = series

    const handleResize = () => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current  = null
      candleRef.current = null
      bbRef.current     = null
      maRef.current     = null
    }
  }, [])

  // ── 데이터·지표 동기화 ───────────────────────────────
  useEffect(() => {
    const chart  = chartRef.current
    const candle = candleRef.current
    if (!chart || !candle || candleData.length === 0) return

    candle.setData(candleData as any)
    chart.timeScale().fitContent()

    // 볼린저 밴드
    if (activeIndicators.has('bollinger')) {
      const { upper, middle, lower } = calcBollingerBands(candleData)
      if (!bbRef.current) {
        const mk = (color: string, dash = false) =>
          chart.addLineSeries({
            color, lineWidth: 1, lineStyle: dash ? 2 : 0,
            lastValueVisible: false, priceLineVisible: false,
            crosshairMarkerVisible: false,
          })
        bbRef.current = { upper: mk('#60a5fa'), middle: mk('#94a3b8', true), lower: mk('#60a5fa') }
      }
      bbRef.current.upper.setData(upper as any)
      bbRef.current.middle.setData(middle as any)
      bbRef.current.lower.setData(lower as any)
    } else if (bbRef.current) {
      chart.removeSeries(bbRef.current.upper)
      chart.removeSeries(bbRef.current.middle)
      chart.removeSeries(bbRef.current.lower)
      bbRef.current = null
    }

    // 이동평균선
    if (activeIndicators.has('moving-average')) {
      const ma20d = calcMA(candleData, 20)
      const ma60d = calcMA(candleData, 60)
      if (!maRef.current) {
        maRef.current = {
          ma20: chart.addLineSeries({
            color: '#f59e0b', lineWidth: 1,
            lastValueVisible: false, priceLineVisible: false,
            crosshairMarkerVisible: false,
          }),
          ma60: chart.addLineSeries({
            color: '#a78bfa', lineWidth: 1,
            lastValueVisible: false, priceLineVisible: false,
            crosshairMarkerVisible: false,
          }),
        }
      }
      maRef.current.ma20.setData(ma20d as any)
      maRef.current.ma60.setData(ma60d as any)
    } else if (maRef.current) {
      chart.removeSeries(maRef.current.ma20)
      chart.removeSeries(maRef.current.ma60)
      maRef.current = null
    }
  }, [candleData, activeIndicators])

  // ── 추세선 rubber-band 미리보기 ───────────────────────
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    if (drawingTool !== 'trendline') {
      // 도구 변경 시 미리보기 선 제거
      if (previewLineRef.current) {
        try { chart.removeSeries(previewLineRef.current) } catch {}
        previewLineRef.current = null
      }
      return
    }

    const handleMove = (params: MouseEventParams<Time>) => {
      const pending = pendingPointRef.current
      if (!pending || !params.time || !params.point) return
      const price = candleRef.current?.coordinateToPrice(params.point.y)
      if (!price) return
      const c = chartRef.current
      if (!c) return

      if (!previewLineRef.current) {
        previewLineRef.current = c.addLineSeries({
          color: 'rgba(108,99,255,0.5)',
          lineWidth: 1,
          lineStyle: 1, // dashed
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
        })
      }

      const pts =
        String(pending.time) < String(params.time)
          ? [{ time: pending.time, value: pending.price }, { time: params.time, value: price }]
          : [{ time: params.time, value: price }, { time: pending.time, value: pending.price }]

      try { previewLineRef.current.setData(pts as any) } catch {}
    }

    chart.subscribeCrosshairMove(handleMove)
    return () => {
      chart.unsubscribeCrosshairMove(handleMove)
      if (previewLineRef.current) {
        try { chart.removeSeries(previewLineRef.current) } catch {}
        previewLineRef.current = null
      }
    }
  }, [drawingTool])

  // ── 클릭 핸들러 (추세선 + 피보나치) ─────────────────
  const handleClick = useCallback(
    (params: MouseEventParams<Time>) => {
      const chart  = chartRef.current
      const series = candleRef.current
      if (!chart || !series || !params.point || !params.time) return

      const price = series.coordinateToPrice(params.point.y)
      if (price === null) return
      const time = params.time

      // ── 추세선 ───────────────────────────────────────
      if (drawingTool === 'trendline') {
        if (!pendingPointRef.current) {
          // 첫 번째 점
          pendingPointRef.current = { time, price }
          setDrawingStep(1)
        } else {
          // 두 번째 점 → 확정 선 그리기
          const start = pendingPointRef.current
          pendingPointRef.current = null

          // 미리보기 선 제거
          if (previewLineRef.current) {
            try { chart.removeSeries(previewLineRef.current) } catch {}
            previewLineRef.current = null
          }

          const finalLine = chart.addLineSeries({
            color: '#6c63ff',
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
          })
          const pts =
            String(start.time) < String(time)
              ? [{ time: start.time, value: start.price }, { time, value: price }]
              : [{ time, value: price }, { time: start.time, value: start.price }]
          finalLine.setData(pts as any)
          drawnLinesRef.current.push(finalLine)

          setDrawingStep(0)
          setDrawingTool('none')
        }
      }

      // ── 피보나치 ─────────────────────────────────────
      if (drawingTool === 'fibonacci') {
        if (!pendingPointRef.current) {
          // 첫 번째 점
          pendingPointRef.current = { time, price }
          setDrawingStep(1)
        } else {
          // 두 번째 점 → 피보나치 레벨 그리기
          const start = pendingPointRef.current
          pendingPointRef.current = null

          const priceHigh = Math.max(start.price, price)
          const priceLow  = Math.min(start.price, price)
          const range     = priceHigh - priceLow

          // 전체 시간 범위 (데이터 전체)
          const allData = candleRef.current
          const timeStart = candleData[0].time as Time
          const timeEnd   = candleData[candleData.length - 1].time as Time

          FIB_LEVELS.forEach(({ ratio, label, color }) => {
            const levelPrice = priceHigh - range * ratio
            const s = chart.addLineSeries({
              color,
              lineWidth: 1,
              lineStyle: 2, // dashed
              title: label,
              lastValueVisible: true,
              priceLineVisible: false,
            })
            s.setData([
              { time: timeStart, value: levelPrice },
              { time: timeEnd,   value: levelPrice },
            ] as any)
            drawnLinesRef.current.push(s)
          })

          setDrawingStep(0)
          setDrawingTool('none')
        }
      }
    },
    [drawingTool, setDrawingTool, setDrawingStep, candleData]
  )

  // ── 작도 도구 클릭 구독 ──────────────────────────────
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    if (drawingTool === 'erase') {
      drawnLinesRef.current.forEach((s) => {
        try { chart.removeSeries(s) } catch {}
      })
      drawnLinesRef.current = []
      pendingPointRef.current = null
      setDrawingStep(0)
      setDrawingTool('none')
      return
    }

    if (drawingTool !== 'none') {
      chart.subscribeClick(handleClick)
      return () => chart.unsubscribeClick(handleClick)
    }
  }, [drawingTool, handleClick, setDrawingTool, setDrawingStep])

  const cursor = drawingTool !== 'none' && drawingTool !== 'erase'
    ? 'crosshair' : 'default'

  return (
    <div className="relative">
      <div
        id="chart-area"
        ref={containerRef}
        className="w-full rounded-2xl overflow-hidden"
        style={{ cursor }}
      />

      {/* 로딩 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center
                        bg-navi-surface/80 rounded-2xl backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-navi-accent border-t-transparent
                            rounded-full animate-spin" />
            <p className="text-xs text-navi-muted">실시간 데이터 불러오는 중...</p>
          </div>
        </div>
      )}

      {/* 에러 */}
      {error && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center
                        bg-navi-surface/90 rounded-2xl">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* 첫 번째 점 찍은 후 차트 위 안내 */}
      {drawingStep === 1 && drawingTool !== 'none' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10
                        px-3 py-1.5 bg-amber-500/20 border border-amber-400/40
                        rounded-full text-xs text-amber-300 pointer-events-none">
          {drawingTool === 'trendline' && '끝점을 클릭하세요'}
          {drawingTool === 'fibonacci' && '반대 끝점을 클릭하세요'}
        </div>
      )}
    </div>
  )
}
