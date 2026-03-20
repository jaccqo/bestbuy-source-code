"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useScraperContext } from "@/context/scraper-context"; // Import the context

export function useRescrapeFailed() {
  const [loading, setLoading] = useState(false);
  const { setRunId, setStatus } = useScraperContext(); // Grab the setters

  const rescrapeFailed = useCallback(async () => {
    // 🚫 Prevent double trigger
    if (loading) return null;

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/scrape-failed", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();

      // THE FIX: If the backend started a run, sync it to the global context
      // This causes useScraperStatus(runId) in the sidebar to restart polling immediately
      if (data.run_id) {
        setRunId(data.run_id);
        setStatus("running"); 
      }

      toast.success(`Queued ${data.count} failed SKUs `);

      return data;
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
      return null;
    } finally {
      // 🧠 Prevent flicker (very important for fast APIs)
      setTimeout(() => {
        setLoading(false);
      }, 400); // sweet spot: 300–500ms
    }
  }, [loading, setRunId, setStatus]); // Add context setters to dependencies

  return {
    rescrapeFailed,
    loading,
  };
}