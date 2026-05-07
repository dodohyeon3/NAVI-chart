// 12주차 구현 예정 — 현재는 Coming Soon 플레이스홀더
import Link from 'next/link'

export default function PracticePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-6">🧪</div>
      <h1 className="text-2xl font-bold text-navi-text">퀴즈 모드</h1>
      <p className="text-navi-muted text-sm mt-3 max-w-xs leading-relaxed">
        실제 차트를 보고 분석 도구를 활용해 매수/매도 타이밍을 맞혀보는 퀴즈예요.
        12주차에 오픈해요!
      </p>
      <div className="mt-6">
        <Link
          href="/chart"
          className="text-navi-accent text-sm hover:underline"
        >
          ← 차트로 돌아가기
        </Link>
      </div>
    </main>
  )
}
