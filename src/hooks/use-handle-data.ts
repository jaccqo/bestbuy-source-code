"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"

const API_BASE = "http://localhost:5000"

export type FilterOption = "all" | "in_stock" | "out_of_stock"

export function useHandleDataSettings() {
  const [filter, setFilter] = useState<FilterOption>("all")
  const [updateOriginal, setUpdateOriginal] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const clearError = () => setError(null)

  // 🔹 Load settings
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`${API_BASE}/handle-data`)
        if (!res.ok) throw new Error()

        const data = await res.json()

        if (!cancelled) {
          setFilter(data.filter ?? "all")
          setUpdateOriginal(!!data.updateOriginal)
        }
      } catch {
        if (!cancelled) setError("Failed to load handle data settings")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // 🔹 Persist helper (same pattern as scraper)
  const persist = useCallback(
    async (
      payload: Partial<{
        filter: FilterOption
        updateOriginal: boolean
      }>,
      label: string
    ) => {
      try {
        const res = await fetch(`${API_BASE}/handle-data`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!res.ok) throw new Error()

        toast.success("Handle data updated", {
          description: label,
        })
      } catch {
        setError("Failed to save handle data settings")
      }
    },
    []
  )

  // 🔹 Intent-based setters
  const changeFilter = (value: FilterOption) => {
    setFilter(value)
    persist({ filter: value }, `Filter set to ${value.replace("_", " ")}`)
  }

  const toggleUpdateOriginal = () => {
    setUpdateOriginal((prev) => {
      persist(
        { updateOriginal: !prev },
        !prev ? "Original sheet will be updated" : "Original sheet unchanged"
      )
      return !prev
    })
  }

  const getStatusSnippet = () => {
    const parts: string[] = []

    if (filter === "in_stock") parts.push("In Stock")
    if (filter === "out_of_stock") parts.push("Out of Stock")
    if (updateOriginal) parts.push("Update Sheet")

    return parts.length ? `(${parts.join(" • ")})` : ""
  }

  return {
    filter,
    updateOriginal,
    loading,
    error,
    clearError,

    setFilter: changeFilter,
    toggleUpdateOriginal,
    getStatusSnippet,
  }
}
