"use client";

import { useState } from "react"
import { toast } from "sonner"

import type { ScraperStatus } from "@/components/sidebar/sidebar-status-config"
import type { AddLogFn } from "@/types/logs"

import { sendSystemNotification } from "@/hooks/use-system-notification"
import { useScraperContext } from "@/context/scraper-context" // New context import

interface RunScraperResponse {
  run_id: number
  status: ScraperStatus
}

export function useRunScraper(addLog: AddLogFn) {
  const [loading, setLoading] = useState(false)
  
  // Connect to the Global Scraper Context
  const { 
    status, setStatus, 
    lastRun, setLastRun, 
    skuCount, setSkuCount, 
    runId, setRunId 
  } = useScraperContext()

  const runScraper = async () => {
    if (loading) return

    setLoading(true)
    
    // Reset global state for a fresh run
    setSkuCount(null)
    setRunId(null) 

    await addLog("Scraper starting…", "INFO")
    toast.loading("Starting scraper...", { id: "scraper-toast" })

    try {
      const res = await fetch("http://localhost:5000/run-scraper", {
        method: "POST",
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || "Failed to start scraper")
      }

      const data: RunScraperResponse = await res.json()

      // Update Global Context - Now AppSidebar and Status poller see this immediately
      setRunId(data.run_id)
      setStatus(data.status)

      if (data.status === "preparing") {
        toast.success("Scraper started successfully!", {
          id: "scraper-toast",
        })
        await addLog("Scraper started", "INFO")
      }

      if (data.status === "stopping") {
        toast.info("Stopping previous scraper… Please wait", {
          id: "scraper-toast",
          duration: 8000,
        })
        await addLog(
          "Stopping previous run before starting a new one",
          "INFO"
        )
      }

    } catch (err) {
      setStatus("error")
      setRunId(null)

      const message = err instanceof Error ? err.message : "Unknown error"

      await addLog(message, "ERROR")

      toast.error(message, { id: "scraper-toast" })

      sendSystemNotification(
        "Best Buy Scraper Pro ⚠️",
        `Scraper failed to start: ${message}`
      )
    } finally {
      setLoading(false)
    }
  }

  return {
    runScraper,
    loading,
    status,
    lastRun,
    skuCount,
    runId,
    setStatus,
    setLastRun,
    setSkuCount,
  }
}