"use client";

import { useEffect, useRef } from "react"

export type AddLogFn = (message: string, level?: string) => void

export function useLogPolling(
  enabled: boolean,
  addLog: AddLogFn,
  logsCount: number,
  interval = 2000,
  max_logs=500
) {
  const lastId = useRef<number | null>(null)
  const isHydrated = useRef(false)

  // 1. Reset Cursor if logs are cleared
  useEffect(() => {
    if (logsCount === 0) {
      lastId.current = null
      isHydrated.current = false
    }
  }, [logsCount])

  useEffect(() => {
    if (!enabled) return

    const fetchLogs = async () => {
      // If we haven't hydrated, get the history (last 500). 
      // If we have, get only what's new since lastId.
      let url = `http://localhost:5000/logs?limit=${max_logs}`
      
      if (lastId.current) {
        url = `http://localhost:5000/logs?after_id=${lastId.current}`
      }

      try {
        const res = await fetch(url)
        if (!res.ok) return
        const data = await res.json()

        if (data.length > 0) {
          // Process the logs
          data.forEach((l: any) => {
             addLog(`[${l.timestamp}] ${l.message}`, l.level)
          })

          // Move the cursor to the very last log received
          lastId.current = data[data.length - 1].id
        }
        
        // Mark as hydrated so the next interval call uses 'after_id' logic
        isHydrated.current = true
      } catch (err) {
        console.error("Error fetching logs:", err)
      }
    }

    // --- EXECUTION LOGIC ---

    // 1. Immediate "Fast Fetch" on mount
    if (!isHydrated.current) {
      fetchLogs()
    }

    // 2. Start the Polling Interval
    const id = setInterval(() => {
      fetchLogs()
    }, interval)

    return () => clearInterval(id)
  }, [enabled, addLog, interval]) // isHydrated.current change won't re-trigger this
}