'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts'
import { useChartStore } from '@/stores/chartStore'
import { calcMACD } from '@/lib/indicators'
import { chartSync } from '@/lib/chartSync'

export function MACDChart() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { candleData } = useChartStore()

  useEffect(() => {
    if (!containerRef.current || candleData.length === 0) return

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
      rightPriceScale: {
        borderColor: '#2a2a45',
        scaleMargins: { top: 0.15, bottom: 0.15 },
      },
      timeScale: { borderColor: '#2a2a45', timeVisible: true },
      handleScroll: false,
      handleScale: false,
      width: containerRef.current.clientWidth,
      height: 140,
    })

    const macdData = calcMACD(candleData)

    chart.addHistogramSeries({
      color: '#26a69a',
      lastValueVisible: false,
      priceLineVisible: false,
    }).setData(
      macdData
        .filter((d) => d.histogram !== null)
        .map((d) => ({
          time: d.time,
          value: d.histogram!,
          color: d.histogram! >= 0 ? '#26a69a' : '#ef5350',
        })) as any
    )

    chart.addLineSeries({
      color: '#60a5fa', lineWidth: 2,
      lastValueVisible: true, priceLineVisible: false,
    }).setData(macdData.map((d) => ({ time: d.time, value: d.macd })) as any)

    chart.addLineSeries({
      color: '#f97316', lineWidth: 1,
      lastValueVisible: true, priceLineVisible: false,
    }).setData(
      macdData
        .filter((d) => d.signal !== null)
        .map((d) => ({ time: d.time, value: d.signal! })) as any
    )

    chart.timeScale().fitContent()

    // 메인 차트 범위를 구독 → 메인이 스크롤/드래그되면 MACD도 같이 이동
    const unsub = chartSync.subscribe((range) => {
      chart.timeScale().setVisibleLogicalRange(range)
    })

    const handleResize = () => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      unsub()
      chart.remove()
    }
  }, [candleData])

  return (
    <div className="mt-1">
      <div className="flex items-center gap-3 mb-1 px-1">
        <span className="text-xs font-semibold" style={{ color: '#60a5fa' }}>MACD (12,26,9)</span>
        <span className="text-xs" style={{ color: '#f97316' }}>── 시그널</span>
        <span className="text-xs text-navi-muted">▌ 히스토그램</span>
      </div>
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden" />
    </div>
  )
}
