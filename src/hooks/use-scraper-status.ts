"use client";

import { useEffect, useRef, useState } from "react"
import type { ScraperStatus } from "@/components/sidebar/sidebar-status-config"

interface ScraperStatusResponse {
  status: ScraperStatus
  succeeded: number
  failed: number
  total: number
  sku_count: number
  started_at: string | null
  finished_at: string | null
  error?: string
}

export function useScraperStatus(runId: number | null) {
  const [status, setStatus] = useState<ScraperStatus>("idle")
  const [succeeded, setSucceeded] = useState(0)
  const [failed, setFailed] = useState(0)
  const [remainingFromServer, setRemainingFromServer] = useState(0)
  const [skuCount, setSkuCount] = useState(0)
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Use a Ref for the timer to ensure we can always kill it
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Calculations (Moved inside for clarity)
  const processed = skuCount - remainingFromServer
  const remaining = remainingFromServer
  const overall = skuCount
  const progressPercentage = overall > 0 ? Math.round((processed / overall) * 100) : 0
  const progressText = `${processed} / ${overall}`

  // 2. The Core Polling Function
  const fetchStatus = async () => {
    try {
      // If we have a specific runId, use it. Otherwise, always check /latest
      // This is key: if a run starts elsewhere, /latest will pick it up.
      const url = runId 
        ? `http://localhost:5000/scraper-status/${runId}` 
        : `http://localhost:5000/scraper-status/latest`;

      const res = await fetch(url, { cache: 'no-store' });
      
      if (!res.ok) {
        if (res.status === 404) setStatus("idle");
        return;
      }

      const data: ScraperStatusResponse = await res.json();

      // Only update if the data is actually different or exists
      setStatus(data.status || "idle");
      setSucceeded(data.succeeded ?? 0);
      setFailed(data.failed ?? 0);
      setRemainingFromServer(data.total ?? 0);
      setSkuCount(data.sku_count ?? 0);
      setStartedAt(data.started_at ? new Date(data.started_at) : null);
      setError(data.error || null);

    } catch (err) {
      console.error("Polling Error:", err);
    }
  };

  useEffect(() => {
    // Initial fetch immediately
    fetchStatus();

    // Start interval
    intervalRef.current = setInterval(fetchStatus, 2000);

    // Cleanup: This is vital. When the component unmounts or runId changes,
    // we kill the old timer before starting a new one.
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [runId]); // Re-runs if the ID changes, but stays active for /latest if runId is null

  // Helper flags
  const isRunning = ["running", "preparing", "scraping", "cleaning", "stopping"].includes(status);
  
  // Smart ETA (Simplified for the component)
  const etaTime = (() => {
    if (!startedAt || processed <= 0 || remaining <= 0) return null;
    const elapsed = Date.now() - startedAt.getTime();
    const msPerSku = elapsed / processed;
    const est = new Date(Date.now() + (msPerSku * remaining));
    return est.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  })();

  return {
    status,
    succeeded,
    failed,
    processed,
    remaining,
    skuCount: overall,
    progressPercentage,
    progressText,
    etaTime,
    startedAt,
    error,
    isRunning,
  };
}