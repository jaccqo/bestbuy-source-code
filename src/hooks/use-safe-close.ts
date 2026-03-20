"use client"

import { useState } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { toast } from "sonner"

const API_BASE = "http://localhost:5000"
const appWindow = getCurrentWindow()

type PollResult = "success" | "timeout"

export function useSafeClose() {
  const [isClosing, setIsClosing] = useState(false)

  const pollUntilStopped = async (): Promise<PollResult> => {
    const maxAttempts = 30
    let attempts = 0

    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        attempts++

        try {
          const res = await fetch(`${API_BASE}/scraper-status/latest`)
          if (res.ok) {
            const data = await res.json()
            const finishedStates = ["stopped", "success", "error", "idle"]

            if (finishedStates.includes(data.status)) {
              clearInterval(interval)
              resolve("success")
              return
            }
          }
        } catch (err) {
          console.warn("Polling failed:", err)
        }

        if (attempts >= maxAttempts) {
          clearInterval(interval)
          resolve("timeout")
        }
      }, 1000)
    })
  }

  const forceStopStatus = async () => {
    try {
      await fetch(`${API_BASE}/force-stop`, { method: "POST" })
    } catch (err) {
      console.warn("Force stop failed:", err)
    }
  }

  const closeApp = async (isRunning: boolean, currentStatus: string) => {
    if (isClosing) return

    if (!isRunning) {
      await appWindow.close()
      return
    }

    setIsClosing(true)

    const loadingMsg =
      currentStatus === "stopping"
        ? "Finishing current task..."
        : "Stopping scraper and saving data..."

    const toastId = toast.loading(loadingMsg, {
      description: "App will close automatically when the browser exits.",
    })

    try {
      await fetch(`${API_BASE}/stop`, { method: "POST" })

      const result = await pollUntilStopped()

      if (result === "success") {
        toast.success("Cleanup complete. Closing...", { id: toastId })
      } else {
        toast.error("Shutdown timed out. Forcing stop and closing...", { id: toastId })
        await forceStopStatus()
      }

      setTimeout(async () => {
        await appWindow.close()
      }, 800)

    } catch (err) {
      toast.error("Connection lost. Forcing close...", { id: toastId })
      await forceStopStatus()

      setTimeout(async () => {
        await appWindow.close()
      }, 2000)

    } finally {
      setIsClosing(false)
    }
  }

  return { closeApp, isClosing }
}
