"use client"

import { useEffect } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

import { AlertTriangle, X } from "lucide-react"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { useScraperStats } from "@/hooks/use-scraper-stats"

const config = {
  succeeded: {
    label: "Success SKUs ",
    color: "hsl(259 100% 60%)",
  },
  failed: {
    label: "Failed skus ",
    color: "hsl(359 82.6% 59.4%)",
  },
}

export function MyChart() {
  const { data, loading, error, clearError } = useScraperStats()

  // Clear error automatically if data exists
  useEffect(() => {
    if (data && data.length > 0 && error) {
      clearError()
    }
  }, [data, error, clearError])

  if (loading) return null

  return (
    <ChartContainer config={config} className="min-h-[300px] w-full">
      <div className="flex h-full w-full flex-col">
        {error && (
          <div className="mb-3">
            <Alert variant="destructive" className="relative pr-10">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Chart Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>

              <button
                onClick={clearError}
                className="absolute right-3 top-3 opacity-80 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </Alert>
          </div>
        )}

        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend />

              <Bar
                dataKey="succeeded"
                fill="var(--color-succeeded)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="failed"
                fill="var(--color-failed)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartContainer>
  )
}
