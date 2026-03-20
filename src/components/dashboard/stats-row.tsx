// src/components/dashboard/StatsRow.tsx
import { Card } from "@/components/ui/card"
import { Zap, Timer, TrendingUp, FileSpreadsheet } from "lucide-react"

interface Props {
  currentSpeed: number
  eta: number
  processed: number
  total: number
}

export function StatsRow({ currentSpeed, eta, processed, total }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card className="text-center p-4">
        <Zap className="h-7 w-7 text-yellow-500 mx-auto mb-2" />
        <p className="text-2xl font-bold">{currentSpeed}</p>
        <p className="text-xs text-muted-foreground">SKUs/sec</p>
      </Card>

      <Card className="text-center p-4">
        <Timer className="h-7 w-7 text-orange-500 mx-auto mb-2" />
        <p className="text-2xl font-bold">~{eta}s</p>
        <p className="text-xs text-muted-foreground">ETA</p>
      </Card>

      <Card className="text-center p-4">
        <TrendingUp className="h-7 w-7 text-blue-600 mx-auto mb-2" />
        <p className="text-2xl font-bold">{processed}</p>
        <p className="text-xs text-muted-foreground">Processed</p>
      </Card>

      <Card className="text-center p-4">
        <FileSpreadsheet className="h-7 w-7 text-purple-600 mx-auto mb-2" />
        <p className="text-2xl font-bold">{total || "?"}</p>
        <p className="text-xs text-muted-foreground">Total</p>
      </Card>
    </div>
  )
}
