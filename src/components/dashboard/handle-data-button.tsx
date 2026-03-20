"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DatabaseZap,
  Filter,
  RefreshCw,
  ChevronDown,
  AlertTriangle,
  X,
} from "lucide-react"

import { useState } from "react"
import { useHandleDataSettings } from "@/hooks/use-handle-data"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

export function HandleDataButton() {
  const {
    filter,
    updateOriginal,
    loading,
    error,
    clearError,
    setFilter,
    toggleUpdateOriginal,
    getStatusSnippet,
  } = useHandleDataSettings()

  const [open, setOpen] = useState(false)

  // Same pattern as SidebarSettings
  if (loading) return null

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className="
            flex items-center gap-2
            rounded-lg px-3 py-2
            transition-all
            bg-indigo-500/20
            border border-indigo-400/50
            text-indigo-900
            hover:bg-indigo-500/30
            dark:text-indigo-300
          "
        >
          <DatabaseZap className="w-4 h-4" />
          <span className="hidden sm:inline">Handle Data</span>
          <span className="text-xs opacity-70 hidden md:inline">
            {getStatusSnippet()}
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="center"
        className="
          w-64
          bg-white/20
          backdrop-blur-md
          border border-white/25
          rounded-xl
          p-3
          shadow-lg
        "
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* 🔔 Error Alert (same UX as SidebarSettings) */}
        {error && (
          <div className="mb-3">
            <Alert variant="destructive" className="relative pr-10">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Handle Data Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>

              <button
                onClick={clearError}
                aria-label="Dismiss error"
                className="
                  absolute right-3 top-3
                  opacity-80
                  transition
                  hover:opacity-100
                "
              >
                <X className="h-4 w-4" />
              </button>
            </Alert>
          </div>
        )}

        <DropdownMenuLabel className="flex items-center gap-2 text-sm">
          <Filter className="w-4 h-4" />
          Filters
        </DropdownMenuLabel>

        <p className="text-xs text-muted-foreground mb-2 px-1">
          Applied to next export
        </p>

        <div className="space-y-1.5">
          <DropdownMenuItem
            className="flex items-center gap-3 cursor-pointer"
            onSelect={(e) => e.preventDefault()}
            onClick={() => setFilter("all")}
          >
            <Checkbox checked={filter === "all"} />
            <span>All Items</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="flex items-center gap-3 cursor-pointer"
            onSelect={(e) => e.preventDefault()}
            onClick={() => setFilter("in_stock")}
          >
            <Checkbox checked={filter === "in_stock"} />
            <span>In Stock Only</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="flex items-center gap-3 cursor-pointer"
            onSelect={(e) => e.preventDefault()}
            onClick={() => setFilter("out_of_stock")}
          >
            <Checkbox checked={filter === "out_of_stock"} />
            <span>Out of Stock Only</span>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="my-3" />

        <div className="px-1">
          <DropdownMenuItem
            className="flex items-center gap-3 cursor-pointer"
            onSelect={(e) => e.preventDefault()}
            onClick={toggleUpdateOriginal}
          >
            <Checkbox checked={updateOriginal} />
            <RefreshCw className="w-4 h-4 mr-2" />
            <span>Update Original Sheet</span>
          </DropdownMenuItem>
        </div>

        <p className="text-xs text-center mt-3 px-1 text-neutral-800 dark:text-muted-foreground">
          Settings apply instantly • Use Export button to download
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
