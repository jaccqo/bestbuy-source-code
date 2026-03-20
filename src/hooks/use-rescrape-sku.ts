"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { sendSystemNotification } from "./use-system-notification";
import { useScraperContext } from "@/context/scraper-context"; // Import context

type RescrapeResult = {
  success: boolean;
  run_id?: number;
  error?: string;
};

export function useRescrapeSku() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RescrapeResult | null>(null);
  
  // Grab the global setters from context
  const { setRunId, setStatus } = useScraperContext();

  const rescrape = useCallback(async (sku: string) => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("http://localhost:5000/scrape-single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to start scrape");
      }

      // THE FIX: Sync the global state
      // This tells the Sidebar to start polling this specific run
      if (data.run_id) {
        setRunId(data.run_id);
        setStatus("running"); 
      }

      setResult({
        success: true,
        run_id: data.run_id,
      });

      // UI Feedback
      toast.info(`Re-scrape started for SKU ${sku}`, { id: "scraper-toast" });

      return data;
    } catch (err: any) {
      const errorMessage = err.message || "Unknown error occurred";
      
      setResult({ success: false, error: errorMessage });
      
      // UI Feedback
      toast.error(`Failed: ${errorMessage}`, { id: "scraper-toast" });

      // System Notification for Failure
      await sendSystemNotification(
        "Scrape Failed", 
        `Could not start scrape for ${sku}: ${errorMessage}`
      );

      return null;
    } finally {
      setLoading(false);
    }
  }, [setRunId, setStatus]); // Include setters in dependencies

  return { rescrape, loading, result };
}