'use client'

import { useEffect, useRef } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
} from 'lightweight-charts'
import { allDailyData } from '@/data/mockCandles'
import { calcBollingerBands, calcMA, calcRSI, calcMACD } from '@/lib/indicators'
import type { IndicatorSlug } from '@/types'

// 최근 90일 데이터를 미리보기에 사용
const PREVIEW_DATA = allDailyData.slice(-90)

const FIB_LEVELS = [
  { ratio: 0,     label: '0%',    color: '#94a3b8' },
  { ratio: 0.236, label: '23.6%', color: '#60a5fa' },
  { ratio: 0.382, label: '38.2%', color: '#34d399' },
  { ratio: 0.5,   label: '50%',   color: '#fbbf24' },
  { ratio: 0.618, label: '61.8%', color: '#f97316' },
  { ratio: 1,     label: '100%',  color: '#94a3b8' },
]

function makeChart(el: HTMLDivElement, height: number): IChartApi {
  return createChart(el, {
    layout: {
      background: { type: ColorType.Solid, color: '#0d1117' },
      textColor:  '#6b7280',
    },
    grid: {
      vertLines: { color: '#161b22' },
      horzLines: { color: '#161b22' },
    },
    crosshair:       { mode: CrosshairMode.Magnet },
    rightPriceScale: { borderColor: '#2a2a45', scaleMargins: { top: 0.08, bottom: 0.08 } },
    timeScale:       { borderColor: '#2a2a45', timeVisible: false, rightOffset: 3 },
    handleScroll:    false,
    handleScale:     false,
    width:           el.clientWidth,
    height,
  })
}

function addCandles(chart: IChartApi) {
  const s = chart.addCandlestickSeries({
    upColor:         '#26a69a',
    downColor:       '#ef5350',
    borderUpColor:   '#26a69a',
    borderDownColor: '#ef5350',
    wickUpColor:     '#26a69a',
    wickDownColor:   '#ef5350',
  })
  s.setData(PREVIEW_DATA as any)
  return s
}

interface Props {
  slug: IndicatorSlug
}

export function MiniChartPreview({ slug }: Props) {
  const mainRef = useRef<HTMLDivElement>(null)
  const subRef  = useRef<HTMLDivElement>(null)
  const needsSub = slug === 'rsi' || slug === 'macd'

  useEffect(() => {
    if (!mainRef.current) return
    const data       = PREVIEW_DATA
    const mainHeight = needsSub ? 140 : 200

    const mainChart = makeChart(mainRef.current, mainHeight)
    const candleSeries = addCandles(mainChart)

    // ── 지표 오버레이 ────────────────────────────────

    if (slug === 'bollinger') {
      const { upper, middle, lower } = calcBollingerBands(data)
      ;[
        { d: upper,  color: '#60a5fa', dash: false },
        { d: middle, color: '#94a3b8', dash: true  },
        { d: lower,  color: '#60a5fa', dash: false },
      ].forEach(({ d, color, dash }) =>
        mainChart.addLineSeries({
          color, lineWidth: 1, lineStyle: dash ? 2 : 0,
          lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
        }).setData(d as any)
      )
    }

    if (slug === 'moving-average') {
      const ma20 = calcMA(data, 20)
      const ma60 = calcMA(data, 60)
      ;[
        { d: ma20, color: '#f59e0b' },
        { d: ma60, color: '#a78bfa' },
      ].forEach(({ d, color }) =>
        mainChart.addLineSeries({
          color, lineWidth: 2,
          lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
        }).setData(d as any)
      )

      // 골든크로스 포인트 근처에 마커 표시
      const ma20arr = calcMA(data, 20)
      const ma60arr = calcMA(data, 60)
      const crossMarkers: any[] = []
      for (let i = 1; i < Math.min(ma20arr.length, ma60arr.length); i++) {
        const prev20 = ma20arr[i - 1]?.value ?? 0
        const prev60 = ma60arr[i - 1]?.value ?? 0
        const cur20  = ma20arr[i]?.value ?? 0
        const cur60  = ma60arr[i]?.value ?? 0
        if (prev20 < prev60 && cur20 >= cur60) {
          crossMarkers.push({ time: ma20arr[i].time, position: 'belowBar', color: '#fbbf24', shape: 'arrowUp', text: '골든크로스' })
        }
      }
      if (crossMarkers.length > 0) {
        candleSeries.setMarkers(crossMarkers.slice(0, 1) as any)
      }
    }

    if (slug === 'trendline') {
      // 전반부 저점 → 후반부 저점 연결 (상승 추세선)
      const half = Math.floor(data.length / 2)
      const pt1  = data.slice(0, half).reduce((m, d) => d.low < m.low ? d : m, data[0])
      const pt2  = data.slice(half).reduce((m, d) => d.low < m.low ? d : m, data[half])

      mainChart.addLineSeries({
        color: '#6c63ff', lineWidth: 2,
        lastValueVisible: false, priceLineVisible: false,
      }).setData([
        { time: pt1.time, value: pt1.low },
        { time: pt2.time, value: pt2.low },
      ] as any)

      // 점 마커
      candleSeries.setMarkers([
        { time: pt1.time, position: 'belowBar', color: '#6c63ff', shape: 'circle', text: '①' },
        { time: pt2.time, position: 'belowBar', color: '#6c63ff', shape: 'circle', text: '②' },
      ] as any)
    }

    if (slug === 'fibonacci') {
      const high      = Math.max(...data.map(d => d.high))
      const low       = Math.min(...data.map(d => d.low))
      const range     = high - low
      const timeStart = data[0].time
      const timeEnd   = data[data.length - 1].time

      FIB_LEVELS.forEach(({ ratio, label, color }) => {
        mainChart.addLineSeries({
          color, lineWidth: 1, lineStyle: 2,
          title: label,
          lastValueVisible: true, priceLineVisible: false,
        }).setData([
          { time: timeStart, value: high - range * ratio },
          { time: timeEnd,   value: high - range * ratio },
        ] as any)
      })
    }

    mainChart.timeScale().fitContent()

    // ── RSI 서브차트 ──────────────────────────────────
    let subChart: IChartApi | null = null

    if (slug === 'rsi' && subRef.current) {
      subChart = makeChart(subRef.current, 90)
      const rsiData = calcRSI(data)

      subChart.addLineSeries({
        color: '#a78bfa', lineWidth: 2,
        lastValueVisible: true, priceLineVisible: false,
      }).setData(rsiData as any)

      if (rsiData.length > 0) {
        const t0 = rsiData[0].time
        const t1 = rsiData[rsiData.length - 1].time
        subChart.addLineSeries({ color: '#ef4444', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false })
          .setData([{ time: t0, value: 70 }, { time: t1, value: 70 }] as any)
        subChart.addLineSeries({ color: '#22c55e', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false })
          .setData([{ time: t0, value: 30 }, { time: t1, value: 30 }] as any)
      }
      subChart.timeScale().fitContent()
    }

    // ── MACD 서브차트 ─────────────────────────────────
    if (slug === 'macd' && subRef.current) {
      subChart = makeChart(subRef.current, 90)
      const macdData = calcMACD(data)

      subChart.addHistogramSeries({ color: '#26a69a', lastValueVisible: false, priceLineVisible: false })
        .setData(
          macdData
            .filter(d => d.histogram !== null)
            .map(d => ({ time: d.time, value: d.histogram!, color: d.histogram! >= 0 ? '#26a69a' : '#ef5350' })) as any
        )
      subChart.addLineSeries({ color: '#60a5fa', lineWidth: 2, lastValueVisible: true, priceLineVisible: false })
        .setData(macdData.map(d => ({ time: d.time, value: d.macd })) as any)
      subChart.addLineSeries({ color: '#f97316', lineWidth: 1, lastValueVisible: true, priceLineVisible: false })
        .setData(macdData.filter(d => d.signal !== null).map(d => ({ time: d.time, value: d.signal! })) as any)
      subChart.timeScale().fitContent()
    }

    const handleResize = () => {
      if (mainRef.current) mainChart.applyOptions({ width: mainRef.current.clientWidth })
      if (subChart && subRef.current) subChart.applyOptions({ width: subRef.current.clientWidth })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      mainChart.remove()
      subChart?.remove()
    }
  }, [slug, needsSub])

  // 범례 정의
  const legends: { color: string; label: string }[] = []
  if (slug === 'bollinger')       legends.push({ color: '#60a5fa', label: '볼린저 밴드' }, { color: '#94a3b8', label: '중심선(MA20)' })
  if (slug === 'moving-average')  legends.push({ color: '#f59e0b', label: 'MA 20' }, { color: '#a78bfa', label: 'MA 60' })
  if (slug === 'rsi')             legends.push({ color: '#a78bfa', label: 'RSI(14)' }, { color: '#ef4444', label: '70 과매수' }, { color: '#22c55e', label: '30 과매도' })
  if (slug === 'macd')            legends.push({ color: '#60a5fa', label: 'MACD' }, { color: '#f97316', label: '시그널' }, { color: '#26a69a', label: '히스토그램' })
  if (slug === 'trendline')       legends.push({ color: '#6c63ff', label: '상승 추세선' })
  if (slug === 'fibonacci')       legends.push({ color: '#fbbf24', label: '50%' }, { color: '#f97316', label: '61.8% (황금비)' }, { color: '#34d399', label: '38.2%' })

  return (
    <div className="w-full space-y-1">
      {/* 범례 */}
      {legends.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-2">
          {legends.map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="text-xs text-navi-muted">{l.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* 캔들 차트 */}
      <div ref={mainRef} className="w-full rounded-xl overflow-hidden" />

      {/* RSI / MACD 서브차트 */}
      {needsSub && (
        <div ref={subRef} className="w-full rounded-xl overflow-hidden mt-0.5" />
      )}

      <p className="text-right text-xs text-navi-border mt-1">NVDA · 최근 90일 · 학습용 데이터</p>
    </div>
  )
}
