'use client'

/**
 * 시뮬레이션 메인 차트
 *
 * phase 'analyzing' : pastData 만 표시 + 노란 수직 점선(예측 시작점)
 * phase 'revealed'  : pastData + futureData 표시 + 결과 카드
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import {
  createChart, ColorType, CrosshairMode,
  type IChartApi, type ISeriesApi, type MouseEventParams, type Time,
} from 'lightweight-charts'
import { calcBollingerBands, calcMA, calcRSI, calcMACD } from '@/lib/indicators'
import type { CandleData } from '@/types'
import { clsx } from 'clsx'

/* ─── 로컬 타입 ─────────────────────────────────────────────── */
type DrawTool  = 'none' | 'trendline' | 'fibonacci' | 'erase'
type LineS     = ISeriesApi<'Line'>
type HistS     = ISeriesApi<'Histogram'>

/* ─── 상수 ──────────────────────────────────────────────────── */
const FIB_LEVELS = [
  { ratio: 0,     color: '#94a3b8', label: '0%'    },
  { ratio: 0.236, color: '#60a5fa', label: '23.6%' },
  { ratio: 0.382, color: '#34d399', label: '38.2%' },
  { ratio: 0.5,   color: '#fbbf24', label: '50%'   },
  { ratio: 0.618, color: '#f97316', label: '61.8%' },
  { ratio: 0.786, color: '#f472b6', label: '78.6%' },
  { ratio: 1,     color: '#94a3b8', label: '100%'  },
]
const MAIN_H = 340
const SUB_H  = 110

/* ─── 분석 도구 버튼 정의 ────────────────────────────────────── */
const INDICATOR_BTNS = [
  { key: 'moving-average', label: 'MA',   desc: '이동평균선' },
  { key: 'bollinger',      label: 'BB',   desc: '볼린저 밴드' },
  { key: 'rsi',            label: 'RSI',  desc: 'RSI' },
  { key: 'macd',           label: 'MACD', desc: 'MACD' },
] as const

/* ─── Props ─────────────────────────────────────────────────── */
interface Props {
  pastData:   CandleData[]
  futureData: CandleData[]
  onRetry:    () => void
}

/* ─── 헬퍼: canvas roundRect (구형 브라우저 대응) ─────────────── */
function rrect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  if (typeof (ctx as any).roundRect === 'function') {
    ;(ctx as any).roundRect(x, y, w, h, r)
  } else {
    ctx.rect(x, y, w, h)
  }
}

/* ═══════════════════════════════════════════════════════════════
   컴포넌트
═══════════════════════════════════════════════════════════════ */
export function SimulateChart({ pastData, futureData, onRetry }: Props) {

  /* ── DOM refs ─────────────────────────────────────────────── */
  const mainRef   = useRef<HTMLDivElement>(null)
  const rsiDiv    = useRef<HTMLDivElement>(null)
  const macdDiv   = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  /* ── 차트 / 시리즈 refs ──────────────────────────────────── */
  const chartRef    = useRef<IChartApi | null>(null)
  const candleRef   = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const bbRef       = useRef<{ upper: LineS; middle: LineS; lower: LineS } | null>(null)
  const maRef       = useRef<{ ma20: LineS; ma60: LineS } | null>(null)
  const rsiChart    = useRef<IChartApi | null>(null)
  const rsiSeries   = useRef<{ line: LineS; ob: LineS; os: LineS } | null>(null)
  const macdChart   = useRef<IChartApi | null>(null)
  const macdSeries  = useRef<{ hist: HistS; line: LineS; signal: LineS } | null>(null)

  /* ── 작도 refs ────────────────────────────────────────────── */
  const drawnRef   = useRef<LineS[]>([])
  const pendingRef = useRef<{ time: Time; price: number } | null>(null)
  const mouseRef   = useRef<{ x: number; y: number } | null>(null)
  const toolRef    = useRef<DrawTool>('none')
  const revRef     = useRef(false)

  /* ── State ────────────────────────────────────────────────── */
  const [revealed,    setRevealed]  = useState(false)
  const [drawTool,    _setTool]     = useState<DrawTool>('none')
  const [drawStep,    setDrawStep]  = useState<0 | 1>(0)
  const [activeInds,  setActiveInds] = useState(new Set<string>())
  const [result, setResult] = useState<{
    change: number; startPrice: number; endPrice: number; days: number
  } | null>(null)

  /* ── ref 동기화 ──────────────────────────────────────────── */
  const setTool = useCallback((t: DrawTool) => { toolRef.current = t; _setTool(t) }, [])
  const toggleInd = useCallback((k: string) =>
    setActiveInds(prev => { const s = new Set(prev); s.has(k) ? s.delete(k) : s.add(k); return s }), [])

  /* ══ 캔버스 헬퍼 ════════════════════════════════════════════ */

  const syncCanvas = useCallback(() => {
    const c = canvasRef.current, el = mainRef.current
    if (!c || !el) return
    c.width = el.clientWidth; c.height = MAIN_H
  }, [])

  /** 예측 시작 수직 점선 */
  const drawCutoff = useCallback((ctx: CanvasRenderingContext2D, chart: IChartApi) => {
    if (revRef.current || pastData.length === 0) return
    const x = chart.timeScale().timeToCoordinate(pastData[pastData.length - 1].time as Time)
    if (x === null || x < 0 || x > ctx.canvas.width + 50) return

    ctx.save()
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, MAIN_H)
    ctx.strokeStyle = 'rgba(251,191,36,0.65)'; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.setLineDash([])

    const lw = 74, lh = 18
    const lx = Math.min(Math.max(x - lw / 2, 2), ctx.canvas.width - lw - 2)
    const ly = 10
    ctx.fillStyle = 'rgba(20,18,10,0.82)'
    ctx.strokeStyle = 'rgba(251,191,36,0.7)'; ctx.lineWidth = 1
    ctx.beginPath(); rrect(ctx, lx, ly, lw, lh, 5); ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#fbbf24'
    ctx.font = 'bold 9px system-ui,sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('예측 시작 →', lx + lw / 2, ly + lh / 2)
    ctx.restore()
  }, [pastData])

  const drawDot = useCallback((
    ctx: CanvasRenderingContext2D, x: number, y: number, color = '#6c63ff'
  ) => {
    ctx.save()
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.fillStyle = color; ctx.fill()
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.stroke()
    ctx.restore()
  }, [])

  /** 캔버스 전체 갱신 (cutoff line + 고무줄 프리뷰) */
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current, chart = chartRef.current, series = candleRef.current
    if (!canvas || !chart) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawCutoff(ctx, chart)

    const pending = pendingRef.current
    const mouse   = mouseRef.current
    const tool    = toolRef.current
    if (pending && series) {
      const x1 = chart.timeScale().timeToCoordinate(pending.time)
      const y1 = series.priceToCoordinate(pending.price)
      if (x1 !== null && y1 !== null) {
        if (mouse && (tool === 'trendline' || tool === 'fibonacci')) {
          ctx.save()
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mouse.x, mouse.y)
          ctx.strokeStyle = 'rgba(108,99,255,0.75)'
          ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.restore()
          ctx.save()
          ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 3, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(108,99,255,0.5)'; ctx.fill(); ctx.restore()
        }
        drawDot(ctx, x1, y1, tool === 'fibonacci' ? '#f97316' : '#6c63ff')
      }
    }
  }, [drawCutoff, drawDot])

  /* ══ 차트 생성 (1회) ════════════════════════════════════════ */
  useEffect(() => {
    if (!mainRef.current) return
    syncCanvas()

    const chart = createChart(mainRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#1a1a2e' }, textColor: '#94a3b8' },
      grid:   { vertLines: { color: '#2a2a45' }, horzLines: { color: '#2a2a45' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#2a2a45' },
      timeScale: { borderColor: '#2a2a45', timeVisible: true },
      width: mainRef.current.clientWidth, height: MAIN_H,
    })
    const series = chart.addCandlestickSeries({
      upColor: '#26a69a', downColor: '#ef5350',
      borderUpColor: '#26a69a', borderDownColor: '#ef5350',
      wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    })
    chartRef.current = chart; candleRef.current = series

    /* 스크롤 시 캔버스 + 서브차트 동기화 */
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      redrawCanvas()
      if (!range) return
      rsiChart.current?.timeScale().setVisibleLogicalRange(range)
      macdChart.current?.timeScale().setVisibleLogicalRange(range)
    })
    /* 크로스헤어 이동 */
    chart.subscribeCrosshairMove((p: MouseEventParams<Time>) => {
      mouseRef.current = p.point ? { x: p.point.x, y: p.point.y } : null
      redrawCanvas()
    })

    const onResize = () => {
      if (!mainRef.current) return
      chart.applyOptions({ width: mainRef.current.clientWidth }); syncCanvas(); redrawCanvas()
      if (rsiDiv.current  && rsiChart.current)  rsiChart.current.applyOptions({ width: rsiDiv.current.clientWidth })
      if (macdDiv.current && macdChart.current) macdChart.current.applyOptions({ width: macdDiv.current.clientWidth })
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.remove(); chartRef.current = null; candleRef.current = null
      bbRef.current = null; maRef.current = null
      rsiChart.current?.remove();  rsiChart.current  = null; rsiSeries.current  = null
      macdChart.current?.remove(); macdChart.current = null; macdSeries.current = null
    }
  }, [syncCanvas, redrawCanvas])  // eslint-disable-line react-hooks/exhaustive-deps

  /* ══ 메인 캔들 + BB/MA 동기화 ══════════════════════════════ */
  useEffect(() => {
    const chart = chartRef.current, candle = candleRef.current
    if (!chart || !candle || pastData.length === 0) return
    const data = revealed ? [...pastData, ...futureData] : pastData

    candle.setData(data as any)
    if (revealed) {
      // 공개 시점 마커
      candle.setMarkers([{
        time: futureData[0].time as Time,
        position: 'belowBar', color: '#fbbf24', shape: 'arrowUp', text: '공개 시점',
      }])
    }
    chart.timeScale().fitContent()

    // BB
    if (activeInds.has('bollinger')) {
      const { upper, middle, lower } = calcBollingerBands(data)
      if (!bbRef.current) {
        const mk = (c: string, dash = false) => chart.addLineSeries({
          color: c, lineWidth: 1, lineStyle: dash ? 2 : 0,
          lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
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

    // MA
    if (activeInds.has('moving-average')) {
      const ma20 = calcMA(data, 20), ma60 = calcMA(data, 60)
      if (!maRef.current) {
        maRef.current = {
          ma20: chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false }),
          ma60: chart.addLineSeries({ color: '#a78bfa', lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false }),
        }
      }
      maRef.current.ma20.setData(ma20 as any)
      maRef.current.ma60.setData(ma60 as any)
    } else if (maRef.current) {
      chart.removeSeries(maRef.current.ma20)
      chart.removeSeries(maRef.current.ma60)
      maRef.current = null
    }

    redrawCanvas()
  }, [pastData, futureData, revealed, activeInds, redrawCanvas])

  /* ══ RSI 서브차트 ════════════════════════════════════════════ */
  useEffect(() => {
    if (!rsiDiv.current) return
    const data = revealed ? [...pastData, ...futureData] : pastData
    if (!activeInds.has('rsi')) {
      rsiChart.current?.remove(); rsiChart.current = null; rsiSeries.current = null; return
    }
    if (!rsiChart.current) {
      rsiChart.current = createChart(rsiDiv.current, {
        layout: { background: { type: ColorType.Solid, color: '#1a1a2e' }, textColor: '#94a3b8' },
        grid:   { vertLines: { color: '#2a2a45' }, horzLines: { color: '#2a2a45' } },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#2a2a45', scaleMargins: { top: 0.1, bottom: 0.1 } },
        timeScale: { borderColor: '#2a2a45', timeVisible: true },
        handleScroll: false, handleScale: false,
        width: rsiDiv.current.clientWidth, height: SUB_H,
      })
      rsiSeries.current = null
    }
    const rc = rsiChart.current
    const rsiData = calcRSI(data)
    if (!rsiSeries.current) {
      rsiSeries.current = {
        line: rc.addLineSeries({ color: '#a78bfa', lineWidth: 2, lastValueVisible: true, priceLineVisible: false }),
        ob:   rc.addLineSeries({ color: '#ef4444', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false }),
        os:   rc.addLineSeries({ color: '#22c55e', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false }),
      }
    }
    rsiSeries.current.line.setData(rsiData as any)
    if (rsiData.length > 0) {
      const [f, l] = [rsiData[0].time, rsiData[rsiData.length - 1].time]
      rsiSeries.current.ob.setData([{ time: f, value: 70 }, { time: l, value: 70 }] as any)
      rsiSeries.current.os.setData([{ time: f, value: 30 }, { time: l, value: 30 }] as any)
    }
    rc.timeScale().fitContent()
    // 현재 메인 range 즉시 동기화
    const mainRange = chartRef.current?.timeScale().getVisibleLogicalRange()
    if (mainRange) rc.timeScale().setVisibleLogicalRange(mainRange)
  }, [activeInds, revealed, pastData, futureData])

  /* ══ MACD 서브차트 ═══════════════════════════════════════════ */
  useEffect(() => {
    if (!macdDiv.current) return
    const data = revealed ? [...pastData, ...futureData] : pastData
    if (!activeInds.has('macd')) {
      macdChart.current?.remove(); macdChart.current = null; macdSeries.current = null; return
    }
    if (!macdChart.current) {
      macdChart.current = createChart(macdDiv.current, {
        layout: { background: { type: ColorType.Solid, color: '#1a1a2e' }, textColor: '#94a3b8' },
        grid:   { vertLines: { color: '#2a2a45' }, horzLines: { color: '#2a2a45' } },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#2a2a45', scaleMargins: { top: 0.15, bottom: 0.15 } },
        timeScale: { borderColor: '#2a2a45', timeVisible: true },
        handleScroll: false, handleScale: false,
        width: macdDiv.current.clientWidth, height: SUB_H,
      })
      macdSeries.current = null
    }
    const mc = macdChart.current
    const md = calcMACD(data)
    if (!macdSeries.current) {
      macdSeries.current = {
        hist:   mc.addHistogramSeries({ color: '#26a69a', lastValueVisible: false, priceLineVisible: false }),
        line:   mc.addLineSeries({ color: '#60a5fa', lineWidth: 2, lastValueVisible: true,  priceLineVisible: false }),
        signal: mc.addLineSeries({ color: '#f97316', lineWidth: 1, lastValueVisible: true,  priceLineVisible: false }),
      }
    }
    macdSeries.current.hist.setData(
      md.filter(d => d.histogram !== null)
        .map(d => ({ time: d.time, value: d.histogram!, color: d.histogram! >= 0 ? '#26a69a' : '#ef5350' })) as any
    )
    macdSeries.current.line.setData(md.map(d => ({ time: d.time, value: d.macd })) as any)
    macdSeries.current.signal.setData(md.filter(d => d.signal !== null).map(d => ({ time: d.time, value: d.signal! })) as any)
    mc.timeScale().fitContent()
    const mainRange = chartRef.current?.timeScale().getVisibleLogicalRange()
    if (mainRange) mc.timeScale().setVisibleLogicalRange(mainRange)
  }, [activeInds, revealed, pastData, futureData])

  /* ══ 크로스헤어 이동 → 고무줄 미리보기 ════════════════════ */
  useEffect(() => {
    const chart = chartRef.current, series = candleRef.current
    if (!chart || !series) return
    if (drawTool !== 'trendline' && drawTool !== 'fibonacci') { redrawCanvas(); return }
    const onMove = (p: MouseEventParams<Time>) => {
      mouseRef.current = p.point ? { x: p.point.x, y: p.point.y } : null
      redrawCanvas()
    }
    chart.subscribeCrosshairMove(onMove)
    return () => { chart.unsubscribeCrosshairMove(onMove); redrawCanvas() }
  }, [drawTool, redrawCanvas])

  /* ══ 클릭 핸들러 ═════════════════════════════════════════════ */
  const handleClick = useCallback((p: MouseEventParams<Time>) => {
    const tool = toolRef.current, chart = chartRef.current, series = candleRef.current
    if (!chart || !series || !p.point || !p.time) return
    const price = series.coordinateToPrice(p.point.y)
    if (price === null) return
    const time = p.time

    const dotOnCanvas = (color: string) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const px = chart.timeScale().timeToCoordinate(time)
      const py = series.priceToCoordinate(price)
      if (ctx && px !== null && py !== null) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        drawCutoff(ctx, chart)
        drawDot(ctx, px, py, color)
      }
    }

    if (tool === 'trendline') {
      if (!pendingRef.current) {
        pendingRef.current = { time, price }; setDrawStep(1); dotOnCanvas('#6c63ff')
      } else {
        const start = pendingRef.current; pendingRef.current = null
        const s = chart.addLineSeries({ color: '#6c63ff', lineWidth: 2, lastValueVisible: false, priceLineVisible: false })
        const pts = String(start.time) < String(time)
          ? [{ time: start.time, value: start.price }, { time, value: price }]
          : [{ time, value: price }, { time: start.time, value: start.price }]
        s.setData(pts as any); drawnRef.current.push(s)
        redrawCanvas(); setDrawStep(0); setTool('none')
      }
    }
    if (tool === 'fibonacci') {
      if (!pendingRef.current) {
        pendingRef.current = { time, price }; setDrawStep(1); dotOnCanvas('#f97316')
      } else {
        const start = pendingRef.current; pendingRef.current = null
        const hi = Math.max(start.price, price), lo = Math.min(start.price, price), range = hi - lo
        const t0 = pastData[0].time as Time
        const allD = revealed ? [...pastData, ...futureData] : pastData
        const t1 = allD[allD.length - 1].time as Time
        FIB_LEVELS.forEach(({ ratio, color, label }) => {
          const s = chart.addLineSeries({ color, lineWidth: 1, lineStyle: 2, title: label, lastValueVisible: true, priceLineVisible: false })
          s.setData([{ time: t0, value: hi - range * ratio }, { time: t1, value: hi - range * ratio }] as any)
          drawnRef.current.push(s)
        })
        redrawCanvas(); setDrawStep(0); setTool('none')
      }
    }
  }, [drawCutoff, drawDot, redrawCanvas, setTool, pastData, futureData, revealed])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    if (drawTool === 'erase') {
      drawnRef.current.forEach(s => { try { chart.removeSeries(s) } catch {} })
      drawnRef.current = []; pendingRef.current = null
      redrawCanvas(); setDrawStep(0); setTool('none'); return
    }
    if (drawTool === 'none') return
    chart.subscribeClick(handleClick)
    return () => chart.unsubscribeClick(handleClick)
  }, [drawTool, handleClick, setTool, redrawCanvas])

  /* ══ 결과 공개 ═══════════════════════════════════════════════ */
  const handleReveal = useCallback(() => {
    if (futureData.length === 0) return
    revRef.current = true
    setRevealed(true)
    const startPrice = futureData[0].open
    const endPrice   = futureData[futureData.length - 1].close
    const change     = ((endPrice - startPrice) / startPrice) * 100
    setResult({ change, startPrice, endPrice, days: futureData.length })
  }, [futureData])

  /* ── 날짜 포맷 ─────────────────────────────────────────────── */
  const fmtDate = (d: CandleData) => d.time.slice(0, 7).replace('-', '년 ') + '월'
  const periodLabel = pastData.length > 0 && futureData.length > 0
    ? `${fmtDate(pastData[0])} ~ ${fmtDate(pastData[pastData.length - 1])}`
    : ''
  const futurePeriodLabel = futureData.length > 0
    ? `${fmtDate(futureData[0])} ~ ${fmtDate(futureData[futureData.length - 1])}`
    : ''

  const showRSI  = activeInds.has('rsi')
  const showMACD = activeInds.has('macd')
  const cursor   = (drawTool === 'trendline' || drawTool === 'fibonacci') ? 'crosshair' : 'default'

  /* ══ 렌더 ════════════════════════════════════════════════════ */
  return (
    <div className="space-y-3">

      {/* ── 기간 배지 ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="bg-navi-surface border border-navi-border rounded-lg px-2.5 py-1 text-navi-muted">
          📅 분석 구간: <span className="text-navi-text font-medium">{periodLabel}</span>
        </span>
        {revealed
          ? <span className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1 text-amber-300">
              🔓 공개 구간: {futurePeriodLabel}
            </span>
          : <span className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1 text-amber-300 animate-pulse">
              🔒 앞으로 {futureData.length}일이 숨겨져 있어요
            </span>
        }
      </div>

      {/* ── 메인 차트 + 캔버스 ────────────────────────────────── */}
      <div className="bg-navi-surface border border-navi-border rounded-2xl p-3">
        <div className="relative" style={{ cursor }}>
          <div ref={mainRef} className="w-full rounded-xl overflow-hidden" />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-none"
            style={{ height: MAIN_H, borderRadius: '0.75rem' }}
          />
        </div>

        {/* RSI */}
        {showRSI && (
          <div className="mt-1">
            <div className="flex items-center gap-3 mb-1 px-1">
              <span className="text-[11px] font-semibold" style={{ color: '#a78bfa' }}>RSI (14)</span>
              <span className="text-[11px] text-red-400">── 70</span>
              <span className="text-[11px] text-green-400">── 30</span>
            </div>
            <div ref={rsiDiv} className="w-full rounded-xl overflow-hidden" />
          </div>
        )}

        {/* MACD */}
        {showMACD && (
          <div className="mt-1">
            <div className="flex items-center gap-3 mb-1 px-1">
              <span className="text-[11px] font-semibold" style={{ color: '#60a5fa' }}>MACD (12,26,9)</span>
              <span className="text-[11px]" style={{ color: '#f97316' }}>── 시그널</span>
            </div>
            <div ref={macdDiv} className="w-full rounded-xl overflow-hidden" />
          </div>
        )}

        {/* 작도 step 안내 */}
        {drawStep === 1 && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="text-xs text-amber-300 font-medium">
              {drawTool === 'trendline' ? '끝점을 클릭하세요' : '반대 끝점을 클릭하세요'}
            </span>
            <button onClick={() => { pendingRef.current = null; setDrawStep(0); setTool('none'); redrawCanvas() }}
              className="ml-auto text-xs text-navi-muted hover:text-navi-text">취소</button>
          </div>
        )}
      </div>

      {/* ── 도구 패널 ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* 분석 도구 */}
        <div className="bg-navi-surface border border-navi-border rounded-2xl p-3 overflow-visible">
          <p className="text-[11px] font-bold text-navi-muted mb-2">분석 도구</p>
          <div className="flex flex-wrap gap-1.5">
            {INDICATOR_BTNS.map(({ key, label }) => (
              <button key={key} onClick={() => toggleInd(key)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                  activeInds.has(key)
                    ? 'bg-navi-accent text-white shadow-md'
                    : 'bg-navi-border text-navi-muted hover:bg-navi-accent/20 hover:text-navi-text'
                )}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 작도 도구 */}
        <div className="bg-navi-surface border border-navi-border rounded-2xl p-3">
          <p className="text-[11px] font-bold text-navi-muted mb-2">작도 도구</p>
          <div className="flex flex-wrap gap-1.5">
            {([
              { v: 'trendline', icon: '↗', label: '추세선'  },
              { v: 'fibonacci', icon: '𝚽', label: '피보나치' },
            ] as const).map(({ v, icon, label }) => (
              <button key={v}
                onClick={() => setTool(drawTool === v ? 'none' : v)}
                className={clsx(
                  'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all',
                  drawTool === v
                    ? 'bg-amber-500/15 border-amber-400 text-amber-300'
                    : 'border-navi-border text-navi-muted hover:border-amber-500/50 hover:text-amber-400'
                )}>
                <span>{icon}</span>{label}
                {drawTool === v && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
              </button>
            ))}
            <button onClick={() => setTool('erase')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border border-navi-border
                         text-navi-muted hover:border-red-500/50 hover:text-red-400 transition-all">
              ✕ 지우기
            </button>
          </div>
        </div>
      </div>

      {/* ── 결과 공개 / 결과 카드 ───────────────────────────────── */}
      {!revealed ? (
        <button
          onClick={handleReveal}
          className="w-full py-3.5 rounded-2xl font-bold text-sm
                     bg-gradient-to-r from-indigo-600 to-indigo-500
                     text-white hover:from-indigo-500 hover:to-indigo-400
                     shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
        >
          🔮 결과 보기 — 실제로 어떻게 됐을까요?
        </button>
      ) : (
        result && (
          <div className={clsx(
            'rounded-2xl border p-4',
            result.change >= 0
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-red-500/10 border-red-500/30'
          )}>
            <p className="text-xs text-navi-muted mb-2">{futurePeriodLabel} · 실제 결과 ({result.days}거래일)</p>
            <div className="flex items-end gap-4">
              <div>
                <p className={clsx(
                  'text-3xl font-black',
                  result.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {result.change >= 0 ? '+' : ''}{result.change.toFixed(1)}%
                </p>
                <p className="text-xs text-navi-muted mt-0.5">
                  ${result.startPrice.toFixed(2)} → ${result.endPrice.toFixed(2)}
                </p>
              </div>
              <p className="text-2xl mb-1">
                {result.change >= 0 ? '📈' : '📉'}
              </p>
              <p className={clsx(
                'text-sm font-semibold ml-auto',
                result.change >= 0 ? 'text-emerald-400' : 'text-red-400'
              )}>
                {result.change >= 0 ? '상승했어요' : '하락했어요'}
              </p>
            </div>
          </div>
        )
      )}

      {/* 결과 이후 액션 버튼 */}
      {revealed && (
        <div className="flex gap-3">
          <button
            onClick={() => { revRef.current = false; onRetry() }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold
                       bg-navi-accent text-white hover:bg-indigo-500 transition-colors"
          >
            🔄 다른 구간 도전
          </button>
        </div>
      )}
    </div>
  )
}
