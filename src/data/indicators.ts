import type { Indicator } from '@/types'

export const indicators: Record<string, Indicator> = {
  rsi: {
    slug: 'rsi',
    name: 'RSI (상대강도지수)',
    oneLineSummary: '주가가 너무 올랐는지, 너무 내렸는지 알려줘요',
    description:
      'RSI(Relative Strength Index)는 일정 기간 동안 주가가 상승한 힘과 하락한 힘을 비교해서 0~100 사이 숫자로 표현해요. 숫자가 높을수록 "너무 많이 올랐다", 낮을수록 "너무 많이 내렸다"는 신호예요.',
    howToRead: [
      '70 이상 → 과매수: 곧 떨어질 수 있어요 (팔 타이밍 고려)',
      '30 이하 → 과매도: 곧 오를 수 있어요 (살 타이밍 고려)',
      '50 근처 → 중립 상태',
    ],
    difficulty: 1,
  },
  macd: {
    slug: 'macd',
    name: 'MACD',
    oneLineSummary: '상승 추세인지 하락 추세인지 방향을 알려줘요',
    description:
      'MACD는 단기 이동평균과 장기 이동평균의 차이를 이용해 추세 전환 시점을 찾는 지표예요. 막대(히스토그램)가 0선을 넘으면 상승 전환, 밑으로 내려가면 하락 전환 신호로 해석해요.',
    howToRead: [
      'MACD선이 시그널선을 위로 돌파 → 매수 신호',
      'MACD선이 시그널선을 아래로 돌파 → 매도 신호',
      '히스토그램이 커질수록 추세가 강해지는 중',
    ],
    difficulty: 2,
  },
  bollinger: {
    slug: 'bollinger',
    name: '볼린저 밴드',
    oneLineSummary: '주가의 정상 범위를 띠로 표시해줘요',
    description:
      '이동평균선을 중심으로 위아래에 표준편차 기반 밴드를 그려요. 주가가 밴드 안에서 움직이는 게 "정상"이고, 밴드 밖으로 나가면 비정상적인 움직임이라는 신호예요.',
    howToRead: [
      '상단 밴드 터치 → 과매수 가능성',
      '하단 밴드 터치 → 과매도 가능성',
      '밴드가 좁아짐 → 곧 큰 움직임 예고',
    ],
    difficulty: 2,
  },
  'moving-average': {
    slug: 'moving-average',
    name: '이동평균선 (MA)',
    oneLineSummary: '주가의 평균적인 흐름을 부드럽게 보여줘요',
    description:
      '일정 기간(5일, 20일, 60일 등)의 종가를 평균 내어 선으로 이어요. 단기선이 장기선을 위로 뚫으면 상승 신호(골든크로스), 아래로 뚫으면 하락 신호(데드크로스)예요.',
    howToRead: [
      '골든크로스(단기>장기) → 상승 전환 신호',
      '데드크로스(단기<장기) → 하락 전환 신호',
      '주가가 이동평균선 위에 있으면 → 상승 추세',
    ],
    difficulty: 1,
  },
  trendline: {
    slug: 'trendline',
    name: '추세선',
    oneLineSummary: '주가가 나아가는 방향을 선으로 표시해줘요',
    description:
      '저점과 저점, 또는 고점과 고점을 이어서 주가의 방향을 파악해요. 주가가 추세선을 강하게 돌파하면 추세 전환 신호로 봐요.',
    howToRead: [
      '상승 추세선: 저점이 점점 높아지는 라인',
      '하락 추세선: 고점이 점점 낮아지는 라인',
      '추세선 돌파 → 방향 전환 가능성',
    ],
    difficulty: 1,
  },
  fibonacci: {
    slug: 'fibonacci',
    name: '피보나치 되돌림',
    oneLineSummary: '상승 후 얼마나 내려올지 되돌림 구간을 예측해요',
    description:
      '피보나치 수열에서 나온 비율(23.6%, 38.2%, 61.8% 등)을 이용해 주가가 눌릴 때 어디서 지지받을지 예측해요. 고점과 저점을 잇는 선만 그으면 자동으로 레벨이 표시돼요.',
    howToRead: [
      '38.2% 되돌림 → 약한 조정',
      '61.8% 되돌림 → 강한 조정 (황금비율)',
      '레벨에서 반등 확인 후 진입이 안전해요',
    ],
    difficulty: 3,
  },
}

export const indicatorList = Object.values(indicators)
