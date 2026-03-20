"use client";

import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { PlayCircle, StopCircle, Loader2, Sparkles, Brush } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  loading: boolean
  status: string
  onClick: () => void
}

export function SidebarRunButton({ loading, status, onClick }: Props) {
  const s = (status || "").toLowerCase();
  
  const isPreparing = s === "preparing";
  const isRunning = s === "running" || s === "scraping" || isPreparing;
  const isStopping = s === "stopping" || s === "cleaning";

  const getStatusStyles = () => {
    if (loading) return "from-slate-700 to-slate-900 border-slate-700 text-slate-300 opacity-80 cursor-not-allowed";
    
    if (isStopping) {
      return "from-sky-600 via-blue-700 to-indigo-800 border-sky-500 text-white shadow-sky-900/20";
    }

    if (isRunning) {
      return cn(
        "from-fuchsia-600 via-purple-600 to-indigo-600 border-purple-500 text-white shadow-purple-900/40",
        isPreparing && "animate-pulse" // Only pulse during preparing
      );
    }

    return "from-emerald-500 via-teal-600 to-cyan-600 border-emerald-400 text-white hover:shadow-emerald-900/30";
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild className="h-14">
          <Button
            size="lg"
            className={cn(
              "w-full justify-start gap-3 h-14 text-sm font-medium tracking-tight uppercase border shadow-lg transition-all duration-500 bg-gradient-to-br",
              getStatusStyles()
            )}
            onClick={onClick}
            disabled={loading || isStopping}
          >
            <div className="flex items-center justify-center size-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : isStopping ? (
                <Brush className="h-5 w-5 animate-bounce text-white" />
              ) : isRunning ? (
                <StopCircle className="h-5 w-5 text-white" />
              ) : (
                <PlayCircle className="h-5 w-5 text-white" />
              )}
            </div>

            <div className="flex flex-col items-start gap-0">
              <span className="text-[10px] opacity-70 tracking-widest font-medium leading-none mb-1">
                {isPreparing ? "Initializing" : isRunning ? "Engine Active" : isStopping ? "Finalizing" : "System Ready"}
              </span>
              <span className="text-[13px] font-bold leading-none tracking-normal">
                {loading
                  ? "Loading..."
                  : isStopping
                  ? "Cleaning Up..."
                  : isPreparing
                  ? "Preparing..." 
                  : isRunning
                  ? "Stop Scraper"
                  : "Start Engine"}
              </span>
            </div>

            {!loading && !isStopping && !isRunning && (
              <Sparkles className="ml-auto h-4 w-4 opacity-50 animate-pulse" />
            )}
            
            {(loading || isRunning || isStopping) && (
              <div className="ml-auto flex gap-1">
                <span className="size-1 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
                <span className="size-1 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                <span className="size-1 rounded-full bg-white animate-bounce" />
              </div>
            )}
          </Button>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}