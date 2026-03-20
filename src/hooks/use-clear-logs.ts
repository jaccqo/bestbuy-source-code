// src/hooks/useClearLogs.ts
import { useState, useCallback } from "react"
import { toast } from "sonner"

export function useClearLogs(onCleared?: () => void) {
  const [clearing, setClearing] = useState(false)

  const clearLogs = useCallback(async () => {
    if (clearing) return
    setClearing(true)

    try {
      const res = await fetch("http://localhost:5000/logs", {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to clear logs")

      toast.success("Logs cleared successfully")
      if (onCleared) onCleared()
    } catch (err: any) {
      toast.error(err.message || "Error clearing logs")
    } finally {
      setClearing(false)
    }
  }, [clearing, onCleared])

  return { clearing, clearLogs }
}
