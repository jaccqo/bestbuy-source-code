"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import type { ScraperStatus } from "@/components/sidebar/sidebar-status-config";

interface ScraperContextType {
  // --- Scraper Run State ---
  runId: number | null;
  setRunId: (id: number | null) => void;
  status: ScraperStatus;
  setStatus: (status: ScraperStatus) => void;
  lastRun: string | null;
  setLastRun: (time: string | null) => void;
  skuCount: number | null;
  setSkuCount: (count: number | null) => void;

  // --- Sheet / Upload State ---
  sheetData: any | null;
  setSheetData: (data: any | null) => void;
  uploadStatus: "idle" | "uploading" | "finished";
  setUploadStatus: (status: "idle" | "uploading" | "finished") => void;
  isSheetLoaded: boolean;
  setIsSheetLoaded: (loaded: boolean) => void;
}

const ScraperContext = createContext<ScraperContextType | undefined>(undefined);

export function ScraperProvider({ children }: { children: ReactNode }) {
  // Scraper State
  const [runId, setRunId] = useState<number | null>(null);
  const [status, setStatus] = useState<ScraperStatus>("idle");
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [skuCount, setSkuCount] = useState<number | null>(null);

  // Sheet State
  const [sheetData, setSheetData] = useState<any | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "finished">("idle");
  const [isSheetLoaded, setIsSheetLoaded] = useState(false);

  return (
    <ScraperContext.Provider 
      value={{ 
        // Scraper
        runId, setRunId, 
        status, setStatus, 
        lastRun, setLastRun, 
        skuCount, setSkuCount,
        // Sheet
        sheetData, setSheetData,
        uploadStatus, setUploadStatus,
        isSheetLoaded, setIsSheetLoaded
      }}
    >
      {children}
    </ScraperContext.Provider>
  );
}

export const useScraperContext = () => {
  const context = useContext(ScraperContext);
  if (!context) {
    throw new Error("useScraperContext must be used within a ScraperProvider");
  }
  return context;
};