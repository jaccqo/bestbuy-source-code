"use client"

import { useEffect, useState } from "react"

const API_BASE = "http://localhost:5000"

export function useScrapedDataStatus(pollInterval = 3000) {
  const [hasData, setHasData] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    async function check() {
      try {
        const res = await fetch(`${API_BASE}/meta/has-scraped-data`)
        if (!res.ok) {
          if (!cancelled) setLoading(false)
          return
        }

        const data = await res.json()

        if (!cancelled) {
          setHasData(Boolean(data?.hasData))
          setLoading(false)
        }
      } catch {
        // silent fail — don’t block UI forever
        if (!cancelled) setLoading(false)
      }
    }

    // initial check
    check()

    // polling
    timer = setInterval(check, pollInterval)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [pollInterval])

  return { hasData, loading }
}
