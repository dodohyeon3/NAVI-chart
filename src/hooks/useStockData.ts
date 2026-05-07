import { useEffect } from 'react'
import { useChartStore } from '@/stores/chartStore'

export function useStockData(symbol = 'NVDA') {
  const { period, timeUnit, setCandleData, setLoading, setError } = useChartStore()

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/candles?symbol=${symbol}&period=${period}&timeUnit=${timeUnit}`
        )
        if (!res.ok) throw new Error('API 오류')
        const data = await res.json()
        if (!cancelled) setCandleData(data)
      } catch (e) {
        if (!cancelled) setError('데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [symbol, period, timeUnit, setCandleData, setLoading, setError])
}
