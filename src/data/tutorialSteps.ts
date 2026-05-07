import type { TutorialStep } from '@/types'

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    targetSelector: '#chart-area',
    title: '주식 차트가 처음이신가요?',
    body: '걱정 마세요. NAVI가 하나씩 알려드릴게요. 지금부터 5단계만 따라오시면 차트를 읽을 수 있어요.',
    position: 'bottom',
  },
  {
    id: 'candle-intro',
    targetSelector: '#chart-area',
    title: '이게 캔들 차트예요',
    body: '막대 하나가 하루치 주가예요. 빨간색은 오른 날, 파란색은 내린 날이에요. 생각보다 간단하죠?',
    position: 'bottom',
  },
  {
    id: 'toolbar-intro',
    targetSelector: '#indicator-toolbar',
    title: '이 버튼들이 분석 도구예요',
    body: '각 버튼을 눌러보면 차트 위에 여러 신호가 나타나요. 하나씩 눌러보면서 익혀봐요.',
    position: 'bottom',
  },
  {
    id: 'rsi-intro',
    targetSelector: '#btn-rsi',
    title: 'RSI를 먼저 알아볼까요?',
    body: '"지금 너무 오른 거 아닌가?" 싶을 때 RSI를 확인해요. 마우스를 올려보면 자세한 설명이 나와요.',
    position: 'right',
  },
  {
    id: 'tooltip-hint',
    targetSelector: '#btn-macd',
    title: '버튼에 마우스를 올려봐요',
    body: '모든 분석 도구 버튼에는 쉬운 설명이 달려 있어요. 모르는 게 있으면 언제든 마우스를 올려보세요.',
    position: 'right',
  },
]
