'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts'
import { useChartStore } from '@/stores/chartStore'
import { getCurrentData } from '@/lib/chartData'
import { calcMACD } from '@/lib/indicators'

export function MACDChart() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { period, timeUnit } = useChartStore()

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
      rightPriceScale: { borderColor: '#2a2a45', scaleMargins: { top: 0.15, bottom: 0.15 } },
      timeScale: { borderColor: '#2a2a45', timeVisible: true },
      width: containerRef.current.clientWidth,
      height: 140,
    })

    const data = getCurrentData(period, timeUnit)
    const macdData = calcMACD(data)

    // 히스토그램 (막대)
    const histSeries = chart.addHistogramSeries({
      color: '#26a69a',
      lastValueVisible: false,
      priceLineVisible: false,
    })
    histSeries.setData(
      macdData
        .filter((d) => d.histogram !== null)
        .map((d) => ({
          time: d.time,
          value: d.histogram!,
          color: d.histogram! >= 0 ? '#26a69a' : '#ef5350',
        })) as any
    )

    // MACD 선
    const macdSeries = chart.addLineSeries({
      color: '#60a5fa', lineWidth: 2,
      lastValueVisible: true, priceLineVisible: false,
    })
    macdSeries.setData(macdData.map((d) => ({ time: d.time, value: d.macd })) as any)

    // 시그널 선
    const signalSeries = chart.addLineSeries({
      color: '#f97316', lineWidth: 1, lineStyle: 0,
      lastValueVisible: true, priceLineVisible: false,
    })
    signalSeries.setData(
      macdData
        .filter((d) => d.signal !== null)
        .map((d) => ({ time: d.time, value: d.signal! })) as any
    )

    chart.timeScale().fitContent()

    const handleResize = () => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [period, timeUnit])

  return (
    <div className="mt-1">
      <div className="flex items-center gap-3 mb-1 px-1">
        <span className="text-xs font-semibold" style={{ color: '#60a5fa' }}>MACD (12,26,9)</span>
        <span className="text-xs" style={{ color: '#f97316' }}>─ 시그널</span>
        <span className="text-xs text-navi-muted">▌ 히스토그램</span>
      </div>
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden" />
    </div>
  )
}
