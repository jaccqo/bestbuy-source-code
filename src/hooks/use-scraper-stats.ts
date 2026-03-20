"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

const API_BASE = "http://localhost:5000"
const POLL_INTERVAL = 5000 // 5 seconds

export type ScraperStat = {
  day: string
  succeeded: number
  failed: number
}

export function useScraperStats() {
  const [data, setData] = useState<ScraperStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const clearError = () => setError(null)

  useEffect(() => {
    let cancelled = false
    let interval: number

    const fetchStats = async (silent = false) => {
      try {
        const res = await fetch(`${API_BASE}/stats/scraper/weekly`)
        if (!res.ok) throw new Error()

        const json = await res.json()

        if (!cancelled) {
          setData(json)
          if (!silent) {
            toast.success("Stats updated")
          }
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load scraper statistics")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    // initial load
    fetchStats(true)

    // polling
    interval = window.setInterval(() => {
      fetchStats(true)
    }, POLL_INTERVAL)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return {
    data,
    loading,
    error,
    clearError,
  }
}
