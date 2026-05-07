export type IndicatorSlug = 'rsi' | 'macd' | 'bollinger' | 'moving-average' | 'trendline' | 'fibonacci'

export interface Indicator {
  slug: IndicatorSlug
  name: string
  oneLineSummary: string
  description: string
  howToRead: string[]
  difficulty: 1 | 2 | 3  // 1=쉬움, 3=어려움
  exampleImageUrl?: string
}

export interface TutorialStep {
  id: string
  targetSelector: string   // CSS selector for spotlight target
  title: string
  body: string
  position: 'top' | 'bottom' | 'left' | 'right'
}

export interface CandleData {
  time: string   // 'YYYY-MM-DD'
  open: number
  high: number
  low: number
  close: number
}
