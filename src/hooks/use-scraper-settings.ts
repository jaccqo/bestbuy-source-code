"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { toast } from "sonner"

const API_BASE = "http://localhost:5000"
const RETRY_DELAY = 3000

export function useScraperSettings() {
  const [headless, setHeadless] = useState<boolean>(true)
  const [resumeSku, setResumeSku] = useState<boolean>(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Use a Ref to track "mounted" status across async cycles
  const isMounted = useRef(true)

  // Load settings function
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/scraper`)
      
      if (!res.ok) throw new Error("Server error")
      
      const data = await res.json()

      // Only update state if the component is still in the DOM
      if (isMounted.current) {
        setHeadless(!!data.headless)
        setResumeSku(!!data.resumeSku)
        setError(null) 
        setLoading(false)
      }
    } catch (err) {
      if (isMounted.current) {
        setError("Connection Error...")
        // This is the "loop" - it schedules one future check
        setTimeout(loadSettings, RETRY_DELAY)
      }
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    loadSettings()

    return () => {
      // This kills the "loop" when the component unmounts
      isMounted.current = false
    }
  }, [loadSettings])

  const persist = useCallback(
    async (payload: Partial<{ headless: boolean; resumeSku: boolean }>, label: string) => {
      try {
        const res = await fetch(`${API_BASE}/settings/scraper`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast.success(label)
        setError(null)
      } catch {
        setError("Failed to save. Check server connection.")
      }
    },
    []
  )

  
  // --- New Whip Database Function ---
 const whipDatabase = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/wipe`, {
        method: "POST", 
      })
      
      if (!res.ok) throw new Error("Failed to wipe database")
      
      toast.success("Database has been reset to a clean slate.")
      setError(null)
    } catch (err) {
      toast.error("Failed to wipe database.")
      setError("Wipe failed. Check server connection.")
    }
  }, [])

  return {
    headless,
    resumeSku,
    loading,
    error,
    clearError: () => setError(null),
    setHeadless: (v: boolean) => { setHeadless(v); persist({ headless: v }, "Headless mode updated") },
    setResumeSku: (v: boolean) => { setResumeSku(v); persist({ resumeSku: v }, "Resume SKU updated") },
    whipDatabase 
  }
}