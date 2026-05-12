import { notFound } from 'next/navigation'
import Link from 'next/link'
import { indicators } from '@/data/indicators'
import { DifficultyBadge } from '@/components/ui/DifficultyBadge'
import { RoundedCard } from '@/components/ui/RoundedCard'
import { MiniChartPreview } from '@/components/chart/MiniChartPreview'

interface Props {
  params: { slug: string }
}

export function generateStaticParams() {
  return Object.keys(indicators).map((slug) => ({ slug }))
}

export default function IndicatorDetailPage({ params }: Props) {
  const indicator = indicators[params.slug]
  if (!indicator) notFound()

  return (
    <main className="min-h-screen px-6 py-12 max-w-lg mx-auto">
      <Link href="/chart" className="text-navi-muted text-sm hover:text-navi-text">
        ← 차트로 돌아가기
      </Link>

      <div className="mt-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-navi-text">{indicator.name}</h1>
          <DifficultyBadge level={indicator.difficulty} />
        </div>
        <p className="text-navi-accent font-medium text-sm">
          {indicator.oneLineSummary}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {/* 예시 차트 — 맨 위로 이동 */}
        <RoundedCard>
          <p className="text-xs text-navi-muted font-semibold uppercase tracking-wide mb-3">
            실제 차트 예시
          </p>
          <MiniChartPreview slug={indicator.slug} />
        </RoundedCard>

        {/* 설명 */}
        <RoundedCard>
          <p className="text-xs text-navi-muted font-semibold uppercase tracking-wide mb-2">
            이게 뭔가요?
          </p>
          <p className="text-navi-text text-sm leading-relaxed">
            {indicator.description}
          </p>
        </RoundedCard>

        {/* 읽는 법 */}
        <RoundedCard>
          <p className="text-xs text-navi-muted font-semibold uppercase tracking-wide mb-3">
            어떻게 읽어요?
          </p>
          <ul className="space-y-2">
            {indicator.howToRead.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-navi-text">
                <span className="text-navi-accent shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </RoundedCard>
      </div>

      <div className="mt-8">
        <Link
          href="/chart"
          className="w-full block text-center py-3 bg-navi-accent text-white
                     font-semibold rounded-2xl hover:bg-indigo-500 transition-colors"
        >
          차트에서 직접 확인해보기
        </Link>
      </div>
    </main>
  )
}
