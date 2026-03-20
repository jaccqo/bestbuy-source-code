// src/hooks/use-logs.ts
import { useState, useCallback } from "react"

export type AddLogFn = (msg: string | string[], level?: string, persist?: boolean) => void

export function useLogs(limit = 500) {
  const [logs, setLogs] = useState<string[]>([])

  const addLog: AddLogFn = useCallback((msg, level = "INFO", persist = false) => {
    const time = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    
    })

    const formatLog = (m: string) => `[${time}] ${level.toUpperCase()}: ${m}`

    setLogs((prev) => {
      const prevLimited = prev.slice(-limit + 1)

      if (Array.isArray(msg)) {
        const newLogs = msg.map(formatLog)
        return [...prevLimited, ...newLogs]
      } else {
        return [...prevLimited, formatLog(msg)]
      }
    })
  }, [limit])

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:5000/logs?limit=${limit}`)
      if (!res.ok) return
      const data: string[] = await res.json()
      setLogs(data.slice(-limit)) // respect limit on full load
    } catch (err) {
      console.error("Failed to fetch logs:", err)
    }
  }, [limit])

  const clearLogs = useCallback(() => setLogs([]), [])

  return { logs, addLog, refetch, clearLogs }
}