/**
 * 메인 차트 ↔ 서브 차트(RSI, MACD) 타임스케일 동기화 모듈
 *
 * 사용법:
 *   - 메인 차트 생성 후: chartSync.register(chart)
 *   - 서브 차트에서:    const unsub = chartSync.subscribe(range => subChart.timeScale().setVisibleLogicalRange(range))
 *   - 정리 시:         unsub() / chartSync.unregister()
 */

import type { IChartApi, LogicalRange } from 'lightweight-charts'

type RangeHandler = (range: LogicalRange) => void

let _main: IChartApi | null = null
const _subs: RangeHandler[] = []

export const chartSync = {
  /** 메인 차트 등록 & 범위 변경 감지 시작 */
  register(chart: IChartApi) {
    _main = chart
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!range) return
      _subs.forEach((fn) => {
        try { fn(range) } catch {}
      })
    })
  },

  /** 메인 차트 해제 */
  unregister() {
    _main = null
    _subs.length = 0
  },

  /**
   * 서브 차트 등록
   * - 등록 즉시 현재 메인 차트 범위를 적용
   * - 반환값(함수)을 호출하면 구독 해제
   */
  subscribe(fn: RangeHandler): () => void {
    _subs.push(fn)

    // 이미 메인 차트가 있다면 현재 범위 즉시 동기화
    const current = _main?.timeScale().getVisibleLogicalRange()
    if (current) {
      try { fn(current) } catch {}
    }

    return () => {
      const idx = _subs.indexOf(fn)
      if (idx >= 0) _subs.splice(idx, 1)
    }
  },
}
