import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      {/* 로고 */}
      <div className="mb-6">
        <span className="text-4xl font-extrabold tracking-tight">
          <span className="text-navi-accent">NAVI</span>
          <span className="text-navi-text"> Chart</span>
        </span>
        <p className="text-navi-muted text-sm mt-1">처음 시작하는 주식 차트</p>
      </div>

      {/* 헤드라인 */}
      <h1 className="text-3xl md:text-4xl font-bold text-navi-text leading-tight max-w-md">
        복잡한 차트,<br />
        <span className="text-navi-accent">이제 쉽게</span> 읽어요
      </h1>
      <p className="mt-4 text-navi-muted text-base max-w-sm leading-relaxed">
        RSI, MACD, 볼린저 밴드... 어렵게만 느껴지던 차트 도구를<br />
        마우스 하나로 쉽게 이해할 수 있어요.
      </p>

      {/* CTA 버튼 */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link
          href="/chart"
          className="px-6 py-3 bg-navi-accent text-white font-semibold rounded-2xl
                     hover:bg-indigo-500 transition-colors"
        >
          차트 보러 가기
        </Link>
        <Link
          href="/tutorial"
          className="px-6 py-3 bg-navi-surface border border-navi-border text-navi-text
                     font-semibold rounded-2xl hover:border-navi-accent transition-colors"
        >
          튜토리얼 먼저 해볼게요
        </Link>
      </div>

      {/* 지표 뱃지 */}
      <div className="mt-12 flex flex-wrap gap-2 justify-center max-w-xs">
        {['RSI', 'MACD', '볼린저 밴드', '이동평균선', '추세선', '피보나치'].map((label) => (
          <span
            key={label}
            className="px-3 py-1 bg-navi-surface border border-navi-border
                       text-navi-muted text-xs rounded-full"
          >
            {label}
          </span>
        ))}
      </div>
    </main>
  )
}
