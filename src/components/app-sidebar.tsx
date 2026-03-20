"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { SidebarBrand } from "@/components/sidebar/sidebar-brand"
import { SidebarRunButton } from "@/components/sidebar/sidebar-run-button"
import { SidebarSettings } from "@/components/sidebar/sidebar-settings"
import { SidebarStatusCard } from "@/components/sidebar/sidebar-status-card"
import { SidebarFooterStatus } from "@/components/sidebar/sidebar-footer-status"
import { Developer } from "@/components/creator-feature"

import lightningLottie from "/src/lotties/too-fast.json"

import { useRunScraper } from "@/hooks/use-run-scraper"
import { useScraperStatus } from "@/hooks/use-scraper-status"
import { useLogContext } from "@/context/log-context";
import { sendSystemNotification } from "@/hooks/use-system-notification"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import type { ScraperStatus } from "@/components/sidebar/sidebar-status-config"

const features = [
  {
    id: "feature-1",
    heading: "Lightning Fast Scraping",
    label: "Bestbuy Scraper",
    description: "Developed by Jacko.",
    lottie: lightningLottie,
    url: "kinginjack@gmail.com",
  },
]

export function AppSidebar() {
  const { logs, addLog, clearLogs } = useLogContext();

  const {
    runScraper,
    loading,
    status: buttonStatus,
    lastRun,
    skuCount: finalSkuCount,
    runId,
    setStatus: setButtonStatus,
    setLastRun,
    setSkuCount: setFinalSkuCount,
  } = useRunScraper(addLog)

  const {
    status: liveStatus,
    succeeded,
    processed,
    progressText,
    progressPercentage,
    eta,
    etaTime,
    etaRelative,
    isRunning,
    error,
  } = useScraperStatus(runId)

  /**
   * Guards
   */
  const hasFinalizedRef = useRef(false)
  const hasSeenRunningRef = useRef(false)

  /**
   * Reset guards on NEW run
   */
  useEffect(() => {
    hasFinalizedRef.current = false
    hasSeenRunningRef.current = false
  }, [runId])

  /**
   * Handle lifecycle transitions
   */
  useEffect(() => {
    if (!runId || !liveStatus) return

    // FIX: If the backend says we are "running", "preparing", or "scraping",
    // we MUST trip the guard immediately so the rest of the logic works.
    const isActuallyRunning = ["running", "preparing", "scraping"].includes(liveStatus.toLowerCase());

    if (!hasSeenRunningRef.current && !isActuallyRunning) {
      return
    }

    if (isActuallyRunning) {
      hasSeenRunningRef.current = true
      // Synchronize the button status if it hasn't switched yet
      if (buttonStatus !== liveStatus) {
        setButtonStatus(liveStatus as any);
      }
      return
    }

    // Prevent double finalization
    if (hasFinalizedRef.current) return

    if (liveStatus === "success") {
      hasFinalizedRef.current = true

      setButtonStatus("success")
      setFinalSkuCount(succeeded)
      setLastRun(new Date().toLocaleTimeString())

      addLog(
        "SUCCESS",
        `Scraper finished successfully — ${succeeded} SKUs scraped`
      )

      toast.success(`Scraping completed! ${succeeded} SKUs`, {
        id: "scraper-toast",
      })

      sendSystemNotification(
        "Best Buy Scraper Pro 🎉",
        `Scraping completed! Loaded ${succeeded} SKUs`
      )
      return
    }

    if (liveStatus === "error") {
      hasFinalizedRef.current = true

      setButtonStatus("error")
      const message = error || "Scraper failed unexpectedly"

      addLog("ERROR", message)
      toast.error(message, { id: "scraper-toast" })

      sendSystemNotification("Best Buy Scraper Pro ⚠️", message)
      return
    }

    if (liveStatus === "stopped") {
      hasFinalizedRef.current = true

      setButtonStatus("idle")
      addLog("INFO", "Scraper stopped by user")
      toast.info("Scraper stopped", { id: "scraper-toast" })

      sendSystemNotification(
        "Best Buy Scraper Pro",
        "Scraper was stopped by user"
      )
    }
  }, [
    runId,
    liveStatus,
    succeeded,
    error,
    addLog,
    setButtonStatus,
    setLastRun,
    setFinalSkuCount,
    buttonStatus
  ])

  /**
   * aside UI 
   */
  const displayStatus: ScraperStatus =
    (liveStatus as ScraperStatus) || (buttonStatus as ScraperStatus) || "idle"

  return (
    <Sidebar
      collapsible="icon"
      className="pt-11"
      style={{
        "--sidebar-width-icon": "3rem",
      } as React.CSSProperties}
    >
      <SidebarHeader className="py-7 border-b border-border/40">
        <SidebarBrand />
      </SidebarHeader>

      <SidebarContent className="pt-6">
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Run Scraper">
                <SidebarRunButton
                  loading={loading}
                  status={displayStatus}
                  onClick={runScraper}
                />
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings">
               <SidebarSettings onWipeComplete={clearLogs} />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <div className="px-6 mt-10">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-4">
            Live Status
          </p>

          <SidebarStatusCard
            status={displayStatus}
            lastRun={lastRun}
            skuCount={finalSkuCount || succeeded}
            progressText={progressText}
            progressPercentage={progressPercentage}
            eta={eta}
            etaTime={etaTime}
            etaRelative={etaRelative}
            isRunning={isRunning}
          />
        </div>

        <Developer features={features} />
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 py-6">
        <SidebarFooterStatus status={displayStatus} />
      </SidebarFooter>
    </Sidebar>
  )
}