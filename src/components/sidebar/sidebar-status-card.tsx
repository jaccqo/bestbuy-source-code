"use client";

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { ScraperStatus, statusConfig } from "./sidebar-status-config"
import { Clock, Activity, Brush, Database, Timer } from "lucide-react"

interface Props {
  status: string
  lastRun: string | null
  skuCount: number | null
  progressText: string | null
  progressPercentage?: number
  etaTime?: string | null // Ensure this is in the interface
  isRunning?: boolean
}

export function SidebarStatusCard({
  status,
  lastRun,
  skuCount,
  progressText,
  progressPercentage = 0,
  etaTime,
  isRunning = false,
}: Props) {
  const s = (status || "idle").toLowerCase();
  const isCleaning = s.includes("cleaning") || s.includes("stopping");
  
  const effectiveStatus = (isCleaning ? "stopping" : s) as ScraperStatus;
  const current = statusConfig[effectiveStatus] || statusConfig.idle;

  const syncLabel = isRunning ? "Writing to DB..." : "DB Connected";

  return (
    <div className="relative overflow-hidden rounded-xl bg-slate-50/80 dark:bg-card/40 backdrop-blur-md border border-border/40 p-5 transition-colors duration-500">
      
      {isRunning && (
        <div className="absolute -right-8 -top-8 size-32 bg-indigo-500/[0.08] dark:bg-indigo-500/5 blur-[50px] pointer-events-none" />
      )}

      <div className="space-y-6">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={cn(
                "h-2 w-2 rounded-full ring-offset-2 ring-offset-card ring-1 shadow-sm",
                current.dotColor
              )} />
            </div>
            
            <div>
              <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                {isCleaning ? "Finalizing Session" : current.label}
              </h4>
              {isRunning && (
                <p className="text-[9px] text-indigo-600 dark:text-indigo-400/80 tracking-tight mt-0.5 font-medium">
                  Worker Instance Active
                </p>
              )}
            </div>
          </div>

          <div className="text-muted-foreground/30">
             {isCleaning ? <Brush className="size-3.5" /> : <Activity className="size-3.5" />}
          </div>
        </div>

        {/* Progress Logic (Active State) */}
        {(isRunning || isCleaning) && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-500">
            <div className="flex items-end justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-light tracking-tighter tabular-nums text-foreground">
                  {progressText?.split('/')[0] || "0"}
                </span>
                <span className="text-xs text-muted-foreground/40 font-medium">/ {progressText?.split('/')[1] || "0"}</span>
              </div>
              
              {/* ETA & Percentage Group */}
              <div className="flex flex-col items-end gap-1">
                {etaTime && !isCleaning && (
                   <div className="flex items-center gap-1 text-[9px] font-medium text-amber-600 dark:text-amber-400/80 uppercase tracking-tighter">
                      <Timer className="size-2.5" />
                      <span>{etaTime} ETA</span>
                   </div>
                )}
                <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400/70 bg-indigo-500/[0.08] dark:bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10">
                  {progressPercentage}%
                </span>
              </div>
            </div>

            <div className="relative h-[2px] w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-1000 ease-in-out shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* SKU Count Summary (Completed/Idle State) */}
        {!isRunning && !isCleaning && (
          <div className="space-y-1 animate-in fade-in zoom-in-95 duration-500">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">Last Session Yield</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-light tracking-tighter tabular-nums text-foreground">
                {skuCount || 0}
              </span>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400/80 uppercase tracking-tighter">
                SKUs succeeded 
              </span>
            </div>
          </div>
        )}

        {/* Footer Meta */}
        <div className="flex items-center justify-between pt-3 border-t border-border/30">
          <div className="flex items-center gap-1.5">
              <Database className={cn("size-2.5", isRunning ? "text-indigo-500 animate-pulse" : "text-muted-foreground/40")} />
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50 font-medium">
                Sync State
              </span>
          </div>
          <span className={cn(
            "text-[10px] font-mono",
            isRunning ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground/70"
          )}>
            {syncLabel}
          </span>
        </div>
      </div>
    </div>
  )
}