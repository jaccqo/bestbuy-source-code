"use client"

import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { save, confirm } from "@tauri-apps/plugin-dialog"
import { open, exists } from "@tauri-apps/plugin-fs"
import { useScrapedDataStatus } from "@/hooks/use-scraped-data-status"

export type ExportFormat = "CSV" | "XLSX" | "JSON" | "TXT"

// === SHARED STATE (singleton) ===
let _isOpen = false
let _isDataReady = false
const listeners: Array<() => void> = []

function emitChange() {
  listeners.forEach((listener) => listener())
}

// === EXPORT FUNCTION ===
export async function exportViaTauri(format: ExportFormat) {
  const res = await fetch(`http://localhost:5000/export/${format.toLowerCase()}`)

  if (!res.ok) {
    let msg = "Export failed"
    try {
      const data = await res.json()
      if (data?.detail) msg = data.detail
    } catch {}
    throw new Error(msg)
  }

  const arrayBuffer = await res.arrayBuffer()
  const data = new Uint8Array(arrayBuffer)

  const extension = format.toLowerCase()
  const defaultFilename = `scraped_data.${extension}`

  // Save dialog
  const filePath = await save({
    defaultPath: defaultFilename,
    filters: [{ name: format, extensions: [extension] }],
  })

  if (!filePath) return null // user canceled

  let finalPath = filePath
  if (!filePath.toLowerCase().endsWith(`.${extension}`)) {
    finalPath += `.${extension}`
    toast.info(
      `File saved as "${finalPath.split(/[\\/]/).pop()}" to match ${format} format`
    )
  }

  // Overwrite confirmation
  const fileExists = await exists(finalPath)
  if (fileExists) {
    const shouldOverwrite = await confirm(
      `Replace existing file "${finalPath.split(/[\\/]/).pop()}"?`,
      { title: "Confirm Overwrite", kind: "warning" }
    )
    if (!shouldOverwrite) {
      toast.info("Export canceled")
      return null
    }
  }

  const file = await open(finalPath, { write: true, create: true, truncate: true })
  try {
    await file.write(data)
    await file.close()
    return finalPath
  } catch (err) {
    await file.close()
    throw err
  }
}

// === THE HOOK ===
export function useExportMenu() {
  const [, setTick] = useState(0)

  const forceUpdate = useCallback(() => setTick((t) => t + 1), [])

  // Subscribe to singleton state
  useEffect(() => {
    listeners.push(forceUpdate)
    return () => {
      const idx = listeners.indexOf(forceUpdate)
      if (idx > -1) listeners.splice(idx, 1)
    }
  }, [forceUpdate])

  // 🔹 Sync _isDataReady with scraped data from DB
  const { hasData, loading } = useScrapedDataStatus()

  useEffect(() => {
    if (!loading) {
      _isDataReady = hasData
      emitChange()
    }
  }, [hasData, loading])

  const setIsOpen = useCallback((open: boolean) => {
    _isOpen = open
    emitChange()
  }, [])

  const setIsDataReady = useCallback((ready: boolean) => {
    _isDataReady = ready
    emitChange()
  }, [])

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!_isDataReady) {
      toast.error("Run the scraper before exporting data")
      return
    }

    try {
      const savedPath = await exportViaTauri(format)
      if (savedPath) {
        toast.success(`${format} saved successfully!`)
      }
    } catch (err) {
      console.error("Export error:", err)
      toast.error(`Export failed: ${err instanceof Error ? err.message : err}`)
    }
  }, [])

  return {
    isOpen: _isOpen,
    setIsOpen,
    isDataReady: _isDataReady,
    setIsDataReady,
    handleExport,
  }
}
