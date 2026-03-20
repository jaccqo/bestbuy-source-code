"use client";

import { useEffect, useState, useRef } from "react"
import { toast } from "sonner"
import confetti from "canvas-confetti"
import { open } from "@tauri-apps/plugin-dialog"
import { readFile } from "@tauri-apps/plugin-fs"
import { useScraperContext } from "@/context/scraper-context" // Add this

import type { AddLogFn } from "@/types/logs"
import type { SelectedFile } from "@/components/dashboard/upload-card"

export function useUpload(addLog: AddLogFn) {
  // Local UI state (stays local because it's specific to the picker)
  const [file, setFile] = useState<SelectedFile | null>(null)
  const [progress, setProgress] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // Global state from Context
  const { 
    sheetData, setSheetData, 
    uploadStatus: status, setUploadStatus: setStatus,
    isSheetLoaded, setIsSheetLoaded 
  } = useScraperContext()

  const retryCountRef = useRef(0)
  const wasOfflineRef = useRef(false)

  const loadCurrentSheet = async (): Promise<boolean> => {
    // If it's already in context, don't toast/log again, just return
    if (isSheetLoaded) return true;

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)

    try {
      const res = await fetch("http://localhost:5000/current-upload", { signal: controller.signal })
      clearTimeout(timer)

      if (res.ok || res.status === 404) {
        if (res.status !== 404) {
          const data = await res.json()
          setSheetData(data)
          setStatus("finished")
          
          // ONLY Log and Toast if this is the first time
          addLog(`Loaded existing sheet: ${data.filename}`, "SUCCESS")
          toast.success("Previous sheet loaded")
        } else {
          setStatus("idle")
          // Silent failure for 404 on mount to avoid annoying the user
        }

        setIsSheetLoaded(true) // MARK AS LOADED GLOBALLY
        retryCountRef.current = 0
        return true
      }
      throw new Error("Server error")
    } catch (err: any) {
      clearTimeout(timer)
      setRetryCount(++retryCountRef.current)
      return false
    }
  }

  const retryLoadCurrentSheet = async () => {
    // Stop retrying if we've already successfully loaded it once
    if (isSheetLoaded) return;
    
    const success = await loadCurrentSheet()
    if (!success) setTimeout(retryLoadCurrentSheet, 10000)
  }

  useEffect(() => {
    retryLoadCurrentSheet()
  }, [isSheetLoaded]) // Reacts to the global flag

  //  Pick file (Simplified)
  const pickFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Sheets", extensions: ["xlsx", "csv", "txt"] }],
      })
      if (!selected) return

      const bytes = await readFile(selected)
      const name = selected.split(/[\\/]/).pop()!
      setFile({ file: new File([new Uint8Array(bytes)], name), path: selected })
      toast.success(`Selected: ${name}`)
    } catch (err) {
      toast.error("Selection failed")
    }
  }

  // ⬆ Upload file
  const uploadFile = () => {
    if (!file) return toast.error("Select a file first")

    setStatus("uploading")
    const formData = new FormData()
    formData.append("file", file.file)
    formData.append("local_path", file.path)

    const xhr = new XMLHttpRequest()
    xhr.open("POST", "http://localhost:5000/upload")

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText)
        setSheetData(data) // Push to Context
        setStatus("finished")
        addLog(`Upload completed: ${data.filename}`, "SUCCESS")
        toast.success("Upload completed!")
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } })
      } else {
        setStatus("idle")
        toast.error("Upload failed")
      }
    }
    xhr.send(formData)
  }

  // 🗑 Delete sheet
  const handleDeleteSheet = async () => {
    setIsDeleting(true)
    try {
      await fetch("http://localhost:5000/current-upload", { method: "DELETE" })
      setSheetData(null) // Clear Context
      setFile(null)
      setStatus("idle")
      setIsSheetLoaded(true) // Keep flag true so it doesn't try to "re-load"
      toast.success("Sheet deleted")
    } catch (err) {
      toast.error("Delete failed")
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    file,
    status,
    progress,
    uploadResponse: sheetData, // Use context value
    isDeleting,
    retryCount, 
    pickFile,
    uploadFile,
    handleDeleteSheet,
  }
}