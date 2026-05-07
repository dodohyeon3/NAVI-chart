import type { CandleData } from '@/types'

// ── 기본 수식 ─────────────────────────────────────────────

function sma(values: number[], period: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < period - 1) return null
    return values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
  })
}

function ema(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null)
  const k = 2 / (period + 1)
  let prev: number | null = null
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) continue
    if (i === period - 1) {
      prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period
      result[i] = prev
      continue
    }
    prev = values[i] * k + prev! * (1 - k)
    result[i] = prev
  }
  return result
}

// ── 볼린저 밴드 ───────────────────────────────────────────

export interface BBPoint { time: string; value: number }

export function calcBollingerBands(
  data: CandleData[],
  period = 20,
  mult = 2
): { upper: BBPoint[]; middle: BBPoint[]; lower: BBPoint[] } {
  const closes = data.map((d) => d.close)
  const midArr = sma(closes, period)
  const upper: BBPoint[] = []
  const middle: BBPoint[] = []
  const lower: BBPoint[] = []

  data.forEach((d, i) => {
    if (midArr[i] === null) return
    const slice = closes.slice(i - period + 1, i + 1)
    const mean = midArr[i]!
    const std = Math.sqrt(slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / period)
    upper.push({ time: d.time, value: mean + mult * std })
    middle.push({ time: d.time, value: mean })
    lower.push({ time: d.time, value: mean - mult * std })
  })

  return { upper, middle, lower }
}

// ── 이동평균선 ────────────────────────────────────────────

export interface MAPoint { time: string; value: number }

export function calcMA(data: CandleData[], period: number): MAPoint[] {
  const closes = data.map((d) => d.close)
  return sma(closes, period)
    .map((v, i) => (v === null ? null : { time: data[i].time, value: v }))
    .filter(Boolean) as MAPoint[]
}

// ── RSI ──────────────────────────────────────────────────

export interface RSIPoint { time: string; value: number }

export function calcRSI(data: CandleData[], period = 14): RSIPoint[] {
  const closes = data.map((d) => d.close)
  const result: RSIPoint[] = []
  if (closes.length < period + 1) return result

  const changes = closes.slice(1).map((c, i) => c - closes[i])
  let avgGain =
    changes.slice(0, period).filter((c) => c > 0).reduce((a, b) => a + b, 0) / period
  let avgLoss =
    Math.abs(
      changes.slice(0, period).filter((c) => c < 0).reduce((a, b) => a + b, 0)
    ) / period

  const push = (i: number) => {
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
    result.push({ time: data[i].time, value: Math.round(rsi * 100) / 100 })
  }

  push(period)

  for (let i = period + 1; i < closes.length; i++) {
    const change = changes[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(0, change)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -change)) / period
    push(i)
  }

  return result
}

// ── MACD ─────────────────────────────────────────────────

export interface MACDPoint {
  time: string
  macd: number
  signal: number | null
  histogram: number | null
}

export function calcMACD(
  data: CandleData[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): MACDPoint[] {
  const closes = data.map((d) => d.close)
  const ema12 = ema(closes, fast)
  const ema26 = ema(closes, slow)

  const macdValues: { time: string; value: number }[] = []
  data.forEach((d, i) => {
    if (ema12[i] !== null && ema26[i] !== null) {
      macdValues.push({ time: d.time, value: ema12[i]! - ema26[i]! })
    }
  })

  const signalArr = ema(macdValues.map((v) => v.value), signalPeriod)

  return macdValues.map((m, i) => ({
    time: m.time,
    macd: m.value,
    signal: signalArr[i] ?? null,
    histogram: signalArr[i] !== null ? m.value - signalArr[i]! : null,
  }))
}
