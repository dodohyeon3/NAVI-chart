'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const steps = [
  {
    step: 1,
    title: '캔들 차트 읽기',
    description: '빨간 막대는 오른 날, 파란 막대는 내린 날이에요. 막대의 길이가 그날의 변동폭을 나타내요.',
    icon: '📊',
  },
  {
    step: 2,
    title: '분석 도구 사용하기',
    description: 'RSI, MACD 같은 버튼을 누르면 차트 위에 신호가 나타나요. 각 도구가 어떤 의미인지 마우스를 올리면 바로 볼 수 있어요.',
    icon: '🔍',
  },
  {
    step: 3,
    title: '매매 신호 해석하기',
    description: '지표들이 보내는 신호를 조합해서 "지금 살까, 팔까?"를 판단하는 연습을 해봐요.',
    icon: '💡',
  },
]

export default function TutorialPage() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-lg mx-auto">
      <Link href="/" className="text-navi-muted text-sm hover:text-navi-text">
        ← 홈
      </Link>

      <div className="mt-8 mb-10">
        <h1 className="text-2xl font-bold text-navi-text">차트 튜토리얼</h1>
        <p className="text-navi-muted text-sm mt-2">
          3단계만 따라오면 차트를 읽을 수 있어요
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((item, i) => (
          <motion.div
            key={item.step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12 }}
            className="bg-navi-surface border border-navi-border rounded-2xl p-5 flex gap-4"
          >
            <div className="text-3xl shrink-0">{item.icon}</div>
            <div>
              <p className="text-xs text-navi-accent font-semibold mb-1">
                STEP {item.step}
              </p>
              <p className="font-bold text-navi-text text-sm">{item.title}</p>
              <p className="text-navi-muted text-xs mt-1 leading-relaxed">
                {item.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8">
        <Link
          href="/chart"
          className="w-full block text-center py-3.5 bg-navi-accent text-white
                     font-semibold rounded-2xl hover:bg-indigo-500 transition-colors"
        >
          이제 차트 보러 가기
        </Link>
      </div>
    </main>
  )
}
