// src/components/dashboard/LogsViewer.tsx
import { useEffect, useState, useMemo } from "react"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Pause, Play, X } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import ScrollToBottom, { useSticky, useScrollToBottom, useScrollTo } from "react-scroll-to-bottom"

interface LogEntry {
  raw: string
  timestamp: string
  level: string
  message: string
}

function parseLog(log: string): LogEntry {
  const match = log.match(/\[(.+?)\]\s*(\w+):\s*(.*)/)
  if (match) {
    return {
      raw: log,
      timestamp: match[1],
      level: match[2].toUpperCase(),
      message: match[3],
    }
  }
  return { raw: log, timestamp: "", level: "INFO", message: log }
}

interface LogsViewerProps {
  logs: string[]
  onClearLogs?: () => void | Promise<void>
}

const LogLine: React.FC<{ log: string }> = ({ log }) => {
  const parsed = parseLog(log)
  const levelColor = {
    ERROR: "text-red-400",
    WARN: "text-yellow-400",
    WARNING: "text-yellow-400",
    SUCCESS: "text-emerald-400 font-bold",
    INFO: "text-indigo-500",
    DEBUG: "text-muted-foreground",
  }[parsed.level] || "text-foreground"

  return (
    <div className="flex px-4 py-0.5 border-b border-white/10 font-mono text-sm hover:bg-white/5 transition-colors duration-100">
      {parsed.timestamp && (
        <span className="text-xs text-gray-500 mr-4 min-w-[50px] flex-shrink-0">
          {parsed.timestamp}
        </span>
      )}
      {parsed.level && (
        <span className={`text-xs font-bold mr-4 min-w-[60px] flex-shrink-0 ${levelColor}`}>
          [{parsed.level}]
        </span>
      )}
      <span className={`break-words ${levelColor}`}>
        {parsed.message || parsed.raw}
      </span>
    </div>
  )
}

export function LogsViewer({ logs, onClearLogs }: LogsViewerProps) {
  const [search, setSearch] = useState("")
  const [follow, setFollow] = useState(true) // Your manual follow toggle
  const sticky = useSticky() // true if near bottom
  const scrollToBottom = useScrollToBottom() // function to force scroll
  const { scrollTo } = useScrollTo() // for more control if needed

  const filteredLogs = useMemo(() => {
    if (!search) return logs
    const lower = search.toLowerCase()
    return logs.filter((log) => log.toLowerCase().includes(lower))
  }, [logs, search])

  // Auto-follow only when your follow is true AND sticky (near bottom)
  useEffect(() => {
    if (follow && sticky) {
      scrollToBottom()
    }
  }, [filteredLogs, follow, sticky, scrollToBottom])

  // Manual toggle: when resuming, force scroll to bottom
  const handleToggleFollow = () => {
    setFollow((prev) => {
      const newFollow = !prev
      if (newFollow) {
        scrollToBottom()
      }
      return newFollow
    })
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Live Logs ({filteredLogs.length.toLocaleString()}{" "}
            {search ? "Filtered" : "Total"} Lines)
          </CardTitle>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleToggleFollow}>
                    {follow ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{follow ? "Pause auto-scroll" : "Resume auto-scroll"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {onClearLogs && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="ring-1 ring-red-400 hover:bg-red-50"
                      onClick={onClearLogs}
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clear all logs</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
       {filteredLogs.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground rounded-b-lg">
            <p>{search ? "No logs match your search criteria." : "Waiting for logs..."}</p>
          </div>
        ) : (
          <div className="h-80 rounded-b-lg">
            <ScrollToBottom className="h-full w-full">
              <div className="pr-4">
                {filteredLogs.map((log, index) => (
                  <LogLine key={index} log={log} />
                ))}
              </div>
            </ScrollToBottom>
          </div>
        )}
      </CardContent>
    </Card>
  )
}