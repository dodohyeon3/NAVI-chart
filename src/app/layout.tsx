import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NAVI Chart — 처음 시작하는 주식 차트',
  description: '복잡한 차트, 이제 쉽게 읽어요. 초보 투자자를 위한 주식 차트 분석 서비스.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
