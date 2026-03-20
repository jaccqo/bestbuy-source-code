import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { ScraperStatus, statusConfig } from "./sidebar-status-config"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getVersion } from "@tauri-apps/api/app"
import { RefreshCw, Key, Loader2,LoaderPinwheel,Rocket } from "lucide-react"

import { use_app_updater } from "@/hooks/use_app_updater"
import { LicenseActivationDialog } from "./License_activation_dialog"

const FASTAPI_URL = "http://127.0.0.1:5000"

export function SidebarFooterStatus({ status }: { status: ScraperStatus }) {
  const current = statusConfig[status]
  const [version, setVersion] = useState("—")
  const [hasLicense, setHasLicense] = useState<boolean | null>(null) // null = loading, false = no key, true = has key
  const [showLicenseDialog, setShowLicenseDialog] = useState(false)
  const [backendLoading, setBackendLoading] = useState(true)

  const { checkForUpdates } = use_app_updater()

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion("unknown"))
  }, [])

  // Poll backend until it responds
  useEffect(() => {
    let mounted = true
    let interval: NodeJS.Timeout

    const checkLicense = async () => {
      try {
        const res = await fetch(`${FASTAPI_URL}/get_license`, { method: "GET" })
        if (!mounted) return

        if (res.ok) {
          const data = await res.json()
          const exists = !!data.license_key
          setHasLicense(exists)
          setBackendLoading(false)
          if (!exists) {
            setShowLicenseDialog(true)
          }
        } else {
          // Non-200 — keep trying
          console.log("Backend responded but error — retrying")
        }
      } catch (err) {
        // Network error or backend down — retry
        console.log("Backend not ready yet — retrying in 2s")
      }
    }

    checkLicense() // first try
    interval = setInterval(checkLicense, 2000) // every 2 seconds

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const handleManualAction = () => {
    if (hasLicense === false) {
      setShowLicenseDialog(true)
    } else {
      checkForUpdates(true)
    }
  }

  const handleLicenseSuccess = () => {
    setShowLicenseDialog(false)
    setHasLicense(true)
    checkForUpdates(false)
  }

  // Loading backend — show spinner
  if (backendLoading || hasLicense === null) {
    return (
      <div className="px-5 py-4 border-t bg-background/60 backdrop-blur flex items-center justify-between rounded-lg">
        <div className="flex items-center gap-3">
          <LoaderPinwheel className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm font-medium tracking-tight text-muted-foreground">
            Validating keys...
          </span>
        </div>
        <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-mono">
          v{version}
        </Badge>
      </div>
    )
  }

  return (
    <>
      <LicenseActivationDialog
        open={showLicenseDialog}
        onClose={() => setShowLicenseDialog(false)}
        onSuccess={handleLicenseSuccess}
      />

      <div className="px-5 py-4 border-t bg-background/60 backdrop-blur flex items-center justify-between rounded-lg">
        <div className="flex items-center gap-3">
          <Rocket className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium tracking-tight text-muted-foreground">
            Happy scraping!
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Badge
              variant="outline"
              className="cursor-pointer select-none rounded-full px-3 py-1 text-xs font-mono bg-blue-500/20 border border-blue-400/50 text-blue-900 hover:bg-blue-500/30 dark:text-blue-300 transition"
            >
              v{version}
            </Badge>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" alignOffset={-9} className="w-56 rounded-xl p-2 shadow-xl">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Application
            </div>

            <DropdownMenuItem disabled className="flex justify-between">
              <span>Version</span>
              <span className="font-mono">v{version}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleManualAction} className="cursor-pointer gap-2">
              {hasLicense ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Check for updates
                </>
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  Activate license
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}