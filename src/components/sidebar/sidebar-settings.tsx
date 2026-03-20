"use client"

import { Settings, ChevronsLeftRight, AlertTriangle, X,BombIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"

import { useScraperSettings } from "@/hooks/use-scraper-settings"

import { Separator } from "@radix-ui/react-separator"

import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import {toast} from "sonner"



export function SidebarSettings({ onWipeComplete }: { onWipeComplete?: () => void }) {
  const {
    headless,
    resumeSku,
    setHeadless,
    setResumeSku,
    loading,
    error,
    clearError,
    whipDatabase
  } = useScraperSettings()

  const handleConfirmWipe = async () => {
    await whipDatabase(); // Call the API
    if (onWipeComplete) {
      onWipeComplete(); 
    }
  };

  if (loading && !error) {
    return (
      <div className="h-14 mt-3 animate-pulse bg-neutral-200/60 dark:bg-neutral-800/60 rounded-lg" />
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className="
            w-full justify-between px-3 py-2 mt-3 font-medium
            border border-neutral-300/40 dark:border-neutral-700/40
            bg-white/40 dark:bg-neutral-900/40
            backdrop-blur-md
            hover:bg-white/60 dark:hover:bg-neutral-800/60
            transition-all gap-4 h-14 text-base group
          "
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
            <span className="text-sm text-neutral-800 dark:text-neutral-200">
              Scraper Settings
            </span>
          </div>
          <ChevronsLeftRight className="h-3 w-3 opacity-70 group-data-[state=open]:rotate-180 transition-transform text-neutral-600 dark:text-neutral-400" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="center"
        side="right"
        sideOffset={8}
        className="
          z-50 w-72 overflow-hidden rounded-xl p-0
          border border-neutral-400/40 dark:border-indigo-500/20
          bg-white/50 dark:bg-neutral-950/30
          backdrop-blur-2xl
          shadow-[0_0_25px_-5px_rgba(255,255,255,0.35),0_0_60px_-15px_rgba(255,255,255,0.25)]
          dark:shadow-[0_0_30px_-5px_rgba(99,102,241,0.4),0_0_70px_-15px_rgba(139,92,246,0.3)]
        "
       >
        {/* Inner glass shine – stronger in light, subtle in dark */}
        <div className="
          absolute inset-0 pointer-events-none
          bg-gradient-to-br from-white/14 via-transparent to-transparent
          dark:from-indigo-300/8 dark:via-transparent dark:to-transparent
        " />

        {/* Content wrapper */}
        <div className="relative">
          {/* Header */}
          <div className="p-4 pb-2">
            <DropdownMenuLabel className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
              <Settings className="h-4 w-4" />
              Scraper Settings
            </DropdownMenuLabel>
          </div>

          <DropdownMenuSeparator className="bg-neutral-200/40 dark:bg-neutral-700/30" />

          {/* Error Alert */}
          {error && (
            <div className="px-4 pt-3">
              <Alert
                variant="destructive"
                className="
                  relative border-red-400/40 dark:border-red-500/40
                  bg-red-50/70 dark:bg-red-950/50
                  backdrop-blur-sm pr-10
                  text-red-900 dark:text-red-100
                "
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Settings Error</AlertTitle>
                <AlertDescription className="text-red-800/90 dark:text-red-100/90">
                  {error}
                </AlertDescription>

                <button
                  onClick={clearError}
                  aria-label="Dismiss error"
                  className="
                    absolute right-3 top-3
                    text-red-700 dark:text-red-300
                    opacity-80 hover:opacity-100 transition
                  "
                >
                  <X className="h-4 w-4" />
                </button>
              </Alert>
            </div>
          )}

          {/* Settings toggles */}
          <div className="space-y-5 p-4 pt-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  Headless Mode
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Run without browser UI
                </p>
              </div>
              <Switch
                checked={headless}
                onCheckedChange={setHeadless}
                className="
                  scale-100
                  data-[state=checked]:bg-indigo-500
                  data-[state=unchecked]:bg-neutral-300 dark:data-[state=unchecked]:bg-neutral-600
                "
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  Resume Last SKU
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Continue from last processed SKU
                </p>
              </div>
              <Switch
                checked={resumeSku}
                onCheckedChange={setResumeSku}
                className="
                  scale-100
                  data-[state=checked]:bg-indigo-500
                  data-[state=unchecked]:bg-neutral-300 dark:data-[state=unchecked]:bg-neutral-600
                "
              />
            </div>

           <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                Nuke Database
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                Permanently clear all entries
              </p>
            </div>
          </div>

          <Separator className="my-3 bg-neutral-200/50 dark:bg-neutral-700/50" />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full h-9 mt-2 text-xs font-semibold border-rose-200/50 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-300 transition-all"
              >
                <BombIcon className=" animate-pulse "/>
                Nuke DB 
              </Button>
            </AlertDialogTrigger>
            
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will wipe the entire database. All Data will be permanently lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleConfirmWipe} // Calling the decoupled function
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  I'm totally sure
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
            


          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}