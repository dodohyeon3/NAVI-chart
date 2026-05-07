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
import { allDailyData } from '@/data/mockCandles'
import { calcBollingerBands, calcMA } from '@/lib/indicators'

type LineSeries = ISeriesApi<'Line'>

export function ChartContainer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const candleRef    = useRef<ISeriesApi<'Candlestick'> | null>(null)

  const bbRef = useRef<{ upper: LineSeries; middle: LineSeries; lower: LineSeries } | null>(null)
  const maRef = useRef<{ ma20: LineSeries; ma60: LineSeries } | null>(null)

  const drawnLinesRef   = useRef<LineSeries[]>([])
  const pendingPointRef = useRef<{ time: Time; price: number } | null>(null)

  const {
    candleData, isLoading, error,
    activeIndicators, drawingTool, setDrawingTool,
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

    // ── 볼린저 밴드 ──────────────────────────────────
    if (activeIndicators.has('bollinger')) {
      const { upper, middle, lower } = calcBollingerBands(candleData)
      if (!bbRef.current) {
        const mkLine = (color: string, dash = false) =>
          chart.addLineSeries({
            color, lineWidth: 1, lineStyle: dash ? 2 : 0,
            lastValueVisible: false, priceLineVisible: false,
            crosshairMarkerVisible: false,
          })
        bbRef.current = {
          upper:  mkLine('#60a5fa'),
          middle: mkLine('#94a3b8', true),
          lower:  mkLine('#60a5fa'),
        }
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

    // ── 이동평균선 ────────────────────────────────────
    if (activeIndicators.has('moving-average')) {
      const ma20data = calcMA(candleData, 20)
      const ma60data = calcMA(candleData, 60)
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
      maRef.current.ma20.setData(ma20data as any)
      maRef.current.ma60.setData(ma60data as any)
    } else if (maRef.current) {
      chart.removeSeries(maRef.current.ma20)
      chart.removeSeries(maRef.current.ma60)
      maRef.current = null
    }
  }, [candleData, activeIndicators])

  // ── 작도 클릭 핸들러 ─────────────────────────────────
  const handleClick = useCallback(
    (params: MouseEventParams<Time>) => {
      const chart  = chartRef.current
      const series = candleRef.current
      if (!chart || !series || !params.point || !params.time) return

      const price = series.coordinateToPrice(params.point.y)
      if (price === null) return
      const time = params.time

      if (drawingTool === 'hline') {
        const allTimes = allDailyData.map((d) => d.time as Time)
        const s = chart.addLineSeries({
          color: '#f59e0b', lineWidth: 1, lineStyle: 2,
          lastValueVisible: false, priceLineVisible: false,
        })
        s.setData([
          { time: allTimes[0], value: price },
          { time: allTimes[allTimes.length - 1], value: price },
        ] as any)
        drawnLinesRef.current.push(s)
      }

      if (drawingTool === 'trendline') {
        if (!pendingPointRef.current) {
          pendingPointRef.current = { time, price }
        } else {
          const start = pendingPointRef.current
          pendingPointRef.current = null
          const s = chart.addLineSeries({
            color: '#6c63ff', lineWidth: 2,
            lastValueVisible: false, priceLineVisible: false,
          })
          const pts =
            String(start.time) < String(time)
              ? [{ time: start.time, value: start.price }, { time, value: price }]
              : [{ time, value: price }, { time: start.time, value: start.price }]
          s.setData(pts as any)
          drawnLinesRef.current.push(s)
          setDrawingTool('none')
        }
      }
    },
    [drawingTool, setDrawingTool]
  )

  // ── 작도 도구 구독 ───────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    if (drawingTool === 'erase') {
      drawnLinesRef.current.forEach((s) => chart.removeSeries(s))
      drawnLinesRef.current = []
      pendingPointRef.current = null
      setDrawingTool('none')
      return
    }

    if (drawingTool !== 'none') {
      chart.subscribeClick(handleClick)
      return () => chart.unsubscribeClick(handleClick)
    }
  }, [drawingTool, handleClick, setDrawingTool])

  const cursor = drawingTool === 'trendline' || drawingTool === 'hline'
    ? 'crosshair' : 'default'

  return (
    <div className="relative">
      <div
        id="chart-area"
        ref={containerRef}
        className="w-full rounded-2xl overflow-hidden"
        style={{ cursor }}
      />

      {/* 로딩 오버레이 */}
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
    </div>
  )
}
