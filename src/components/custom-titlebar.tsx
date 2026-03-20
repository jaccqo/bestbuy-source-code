// src/components/CustomTitlebar.tsx
import { Button } from "@/components/ui/button"
import { Minus, Square, X } from "lucide-react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { ModeToggle } from "@/components/mode-toggle"
import { ExportButton } from "@/components/dashboard/export-button"
import { HandleDataButton } from "@/components/dashboard/handle-data-button"  // ← New component we'll create
import { useScraperStatus } from "@/hooks/use-scraper-status"

import { DataForensicsButton } from "@/components/dashboard/forensics-data-button"

import { useSafeClose } from "@/hooks/use-safe-close"

const appWindow = getCurrentWindow()

export function CustomTitlebar() {
 const { isRunning, status } = useScraperStatus(null) 
  const { closeApp, isClosing } = useSafeClose()
  return (
    <div
      data-tauri-drag-region
      className="fixed inset-x-0 top-0 z-[9999] h-11 flex items-center justify-between px-4 bg-background/80 backdrop-blur-xl border-b border-border/50 select-none"
    >
      {/* Left */}
      <div className="flex items-center gap-3" data-tauri-drag-region>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center text-white font-bold text-xs">
          BB
        </div>
        <span className="font-semibold text-sm">Best Buy Scraper Pro</span>
      </div>

   

      {/* Center - Three buttons side by side */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
        <ExportButton />
        <HandleDataButton />
        <DataForensicsButton />
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        <ModeToggle />
        <Button variant="ghost" size="icon" onClick={() => appWindow.minimize()}>
          <Minus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => appWindow.toggleMaximize()}>
          <Square className="h-3.5 w-3.5" />
        </Button>
        

        <Button
          variant="ghost"
          size="icon"
          disabled={isClosing}
          className="hover:bg-red-500/20 hover:text-red-500 transition-colors"
          onClick={() => closeApp(isRunning, status)}
        >
          {isClosing ? (
            <div className="h-4 w-4 border-2 border-red-500 border-t-transparent animate-spin rounded-full" />
          ) : (
            <X className="h-4 w-4" />
          )}
          
        </Button>

      </div>
    </div>
  )
}