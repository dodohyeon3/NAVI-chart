'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts'
import { useChartStore } from '@/stores/chartStore'
import { calcRSI } from '@/lib/indicators'

export function RSIChart() {
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
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: { borderColor: '#2a2a45', timeVisible: true },
      width: containerRef.current.clientWidth,
      height: 140,
    })

    const rsiData = calcRSI(candleData)

    chart.addLineSeries({
      color: '#a78bfa', lineWidth: 2,
      lastValueVisible: true, priceLineVisible: false,
    }).setData(rsiData as any)

    if (rsiData.length > 0) {
      const first = rsiData[0].time
      const last  = rsiData[rsiData.length - 1].time

      chart.addLineSeries({
        color: '#ef4444', lineWidth: 1, lineStyle: 2,
        lastValueVisible: false, priceLineVisible: false,
      }).setData([{ time: first, value: 70 }, { time: last, value: 70 }] as any)

      chart.addLineSeries({
        color: '#22c55e', lineWidth: 1, lineStyle: 2,
        lastValueVisible: false, priceLineVisible: false,
      }).setData([{ time: first, value: 30 }, { time: last, value: 30 }] as any)
    }

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
  }, [candleData])

  return (
    <div className="mt-1">
      <div className="flex items-center gap-3 mb-1 px-1">
        <span className="text-xs font-semibold" style={{ color: '#a78bfa' }}>RSI (14)</span>
        <span className="text-xs text-red-400">── 70 과매수</span>
        <span className="text-xs text-green-400">── 30 과매도</span>
      </div>
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden" />
    </div>
  )
}
