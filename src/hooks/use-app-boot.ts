import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

export function useAppBoot() {
  const [isBooting, setIsBooting] = useState(true)
  const retryRef = useRef(0)
  const wasOfflineRef = useRef(false)

  const checkServer = async (): Promise<boolean> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    try {
      const res = await fetch("http://localhost:5000/current-upload", {
        signal: controller.signal,
      })
      clearTimeout(timer)

      // Server reachable (even 404 means API is alive)
      if (res.ok || res.status === 404) {
        if (wasOfflineRef.current) {
          toast.success("🎉 Back online! Connected to server")
        }

        retryRef.current = 0
        wasOfflineRef.current = false
        return true
      }

      throw new Error("Bad response")
    } catch (err) {
      retryRef.current += 1
      wasOfflineRef.current = true

      toast.error(`Backend offline • Retry ${retryRef.current}`)
      return false
    }
  }

  useEffect(() => {
    let mounted = true

    const boot = async () => {
      const ok = await checkServer()
      if (!mounted) return

      if (ok) {
        setIsBooting(false)
      } else {
        setTimeout(boot, 3000)
      }
    }

    boot()

    return () => {
      mounted = false
    }
  }, [])

  return { isBooting }
}
