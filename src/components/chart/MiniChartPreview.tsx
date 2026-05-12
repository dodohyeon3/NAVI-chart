'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, CrosshairMode, type IChartApi } from 'lightweight-charts'
import { calcBollingerBands, calcMA, calcRSI, calcMACD } from '@/lib/indicators'
import type { IndicatorSlug } from '@/types'
import type { CandleData } from '@/types'

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
    layout: { background: { type: ColorType.Solid, color: '#0d1117' }, textColor: '#6b7280' },
    grid: { vertLines: { color: '#161b22' }, horzLines: { color: '#161b22' } },
    crosshair: { mode: CrosshairMode.Magnet },
    rightPriceScale: { borderColor: '#2a2a45', scaleMargins: { top: 0.08, bottom: 0.08 } },
    timeScale: { borderColor: '#2a2a45', timeVisible: false, rightOffset: 3 },
    handleScroll: false,
    handleScale: false,
    width: el.clientWidth,
    height,
  })
}

interface Props { slug: IndicatorSlug }

export function MiniChartPreview({ slug }: Props) {
  const mainRef = useRef<HTMLDivElement>(null)
  const subRef  = useRef<HTMLDivElement>(null)
  const [data,    setData]    = useState<CandleData[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const needsSub = slug === 'rsi' || slug === 'macd'

  // 실제 NVDA 데이터 fetch
  useEffect(() => {
    fetch('/api/candles?symbol=NVDA&period=1Y&timeUnit=daily')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  // 차트 렌더 (데이터 준비 후)
  useEffect(() => {
    if (!mainRef.current || data.length === 0) return

    // 최근 90일 사용
    const preview    = data.slice(-90)
    const mainHeight = needsSub ? 140 : 200
    const mainChart  = makeChart(mainRef.current, mainHeight)

    const candleSeries = mainChart.addCandlestickSeries({
      upColor: '#26a69a', downColor: '#ef5350',
      borderUpColor: '#26a69a', borderDownColor: '#ef5350',
      wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    })
    candleSeries.setData(preview as any)

    // ── 오버레이 지표 ────────────────────────────────
    if (slug === 'bollinger') {
      const { upper, middle, lower } = calcBollingerBands(preview)
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
      const ma20 = calcMA(preview, 20)
      const ma60 = calcMA(preview, 60)
      ;[
        { d: ma20, color: '#f59e0b' },
        { d: ma60, color: '#a78bfa' },
      ].forEach(({ d, color }) =>
        mainChart.addLineSeries({
          color, lineWidth: 2,
          lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
        }).setData(d as any)
      )

      // 골든크로스 마커
      const markers: any[] = []
      for (let i = 1; i < Math.min(ma20.length, ma60.length); i++) {
        if (ma20[i - 1].value < ma60[i - 1].value && ma20[i].value >= ma60[i].value) {
          markers.push({ time: ma20[i].time, position: 'belowBar', color: '#fbbf24', shape: 'arrowUp', text: '골든크로스' })
        }
      }
      if (markers.length) candleSeries.setMarkers(markers.slice(0, 1) as any)
    }

    if (slug === 'trendline') {
      const half = Math.floor(preview.length / 2)
      const pt1  = preview.slice(0, half).reduce((m, d) => d.low  < m.low  ? d : m, preview[0])
      const pt2  = preview.slice(half).reduce((m, d) => d.low  < m.low  ? d : m, preview[half])
      mainChart.addLineSeries({
        color: '#6c63ff', lineWidth: 2,
        lastValueVisible: false, priceLineVisible: false,
      }).setData([
        { time: pt1.time, value: pt1.low },
        { time: pt2.time, value: pt2.low },
      ] as any)
      candleSeries.setMarkers([
        { time: pt1.time, position: 'belowBar', color: '#6c63ff', shape: 'circle', text: '①' },
        { time: pt2.time, position: 'belowBar', color: '#6c63ff', shape: 'circle', text: '②' },
      ] as any)
    }

    if (slug === 'fibonacci') {
      const high  = Math.max(...preview.map(d => d.high))
      const low   = Math.min(...preview.map(d => d.low))
      const range = high - low
      const t0    = preview[0].time
      const t1    = preview[preview.length - 1].time
      FIB_LEVELS.forEach(({ ratio, label, color }) =>
        mainChart.addLineSeries({
          color, lineWidth: 1, lineStyle: 2, title: label,
          lastValueVisible: true, priceLineVisible: false,
        }).setData([
          { time: t0, value: high - range * ratio },
          { time: t1, value: high - range * ratio },
        ] as any)
      )
    }

    mainChart.timeScale().fitContent()

    // ── 서브 차트 (RSI / MACD) ────────────────────────
    let subChart: IChartApi | null = null

    if (slug === 'rsi' && subRef.current) {
      subChart = makeChart(subRef.current, 90)
      const rsiData = calcRSI(preview)
      subChart.addLineSeries({ color: '#a78bfa', lineWidth: 2, lastValueVisible: true, priceLineVisible: false })
        .setData(rsiData as any)
      if (rsiData.length > 0) {
        const t0 = rsiData[0].time, t1 = rsiData[rsiData.length - 1].time
        subChart.addLineSeries({ color: '#ef4444', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false })
          .setData([{ time: t0, value: 70 }, { time: t1, value: 70 }] as any)
        subChart.addLineSeries({ color: '#22c55e', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false })
          .setData([{ time: t0, value: 30 }, { time: t1, value: 30 }] as any)
      }
      subChart.timeScale().fitContent()
    }

    if (slug === 'macd' && subRef.current) {
      subChart = makeChart(subRef.current, 90)
      const md = calcMACD(preview)
      subChart.addHistogramSeries({ color: '#26a69a', lastValueVisible: false, priceLineVisible: false })
        .setData(md.filter(d => d.histogram !== null).map(d => ({ time: d.time, value: d.histogram!, color: d.histogram! >= 0 ? '#26a69a' : '#ef5350' })) as any)
      subChart.addLineSeries({ color: '#60a5fa', lineWidth: 2, lastValueVisible: true, priceLineVisible: false })
        .setData(md.map(d => ({ time: d.time, value: d.macd })) as any)
      subChart.addLineSeries({ color: '#f97316', lineWidth: 1, lastValueVisible: true, priceLineVisible: false })
        .setData(md.filter(d => d.signal !== null).map(d => ({ time: d.time, value: d.signal! })) as any)
      subChart.timeScale().fitContent()
    }

    const onResize = () => {
      if (mainRef.current) mainChart.applyOptions({ width: mainRef.current.clientWidth })
      if (subChart && subRef.current) subChart.applyOptions({ width: subRef.current.clientWidth })
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      mainChart.remove()
      subChart?.remove()
    }
  }, [data, slug, needsSub])

  // 범례
  const legends: { color: string; label: string }[] = []
  if (slug === 'bollinger')      legends.push({ color: '#60a5fa', label: '밴드' },     { color: '#94a3b8', label: '중심(MA20)' })
  if (slug === 'moving-average') legends.push({ color: '#f59e0b', label: 'MA 20' },   { color: '#a78bfa', label: 'MA 60' })
  if (slug === 'rsi')            legends.push({ color: '#a78bfa', label: 'RSI(14)' }, { color: '#ef4444', label: '70' }, { color: '#22c55e', label: '30' })
  if (slug === 'macd')           legends.push({ color: '#60a5fa', label: 'MACD' },    { color: '#f97316', label: '시그널' })
  if (slug === 'trendline')      legends.push({ color: '#6c63ff', label: '상승 추세선' })
  if (slug === 'fibonacci')      legends.push({ color: '#f97316', label: '61.8%' },   { color: '#fbbf24', label: '50%' }, { color: '#34d399', label: '38.2%' })

  if (loading) return (
    <div className="w-full h-48 flex items-center justify-center rounded-xl bg-navi-bg">
      <div className="flex flex-col items-center gap-2">
        <div className="w-5 h-5 border-2 border-navi-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-navi-muted">NVDA 차트 로드 중...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="w-full h-48 flex items-center justify-center rounded-xl bg-navi-bg">
      <p className="text-xs text-navi-muted">차트를 불러오지 못했어요</p>
    </div>
  )

  return (
    <div className="w-full space-y-1">
      {legends.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-2">
          {legends.map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="text-xs text-navi-muted">{l.label}</span>
            </div>
          ))}
        </div>
      )}
      <div ref={mainRef} className="w-full rounded-xl overflow-hidden" />
      {needsSub && <div ref={subRef} className="w-full rounded-xl overflow-hidden mt-0.5" />}
      <p className="text-right text-xs text-navi-border mt-1">NVDA · 실제 데이터 최근 90일</p>
    </div>
  )
}
