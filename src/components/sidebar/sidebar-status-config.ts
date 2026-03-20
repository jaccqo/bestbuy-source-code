// src/components/sidebar/sidebar-status-config.ts
export type ScraperStatus =
  | "idle"
  | "running"
  | "preparing"   
  | "stopping"
  | "stopped"
  | "success"
  | "error"

export const statusConfig: Record<
  ScraperStatus,
  {
    label: string
    dotColor: string
    pulse: boolean
    badgeVariant: "default" | "secondary" | "destructive" | "success" | "outline"
  }
> = {
  idle: {
    label: "Ready",
    dotColor: "bg-gray-400",
    pulse: false,
    badgeVariant: "outline",
  },
  preparing: {  
    label: "Preparing",
    dotColor: "bg-yellow-500",
    pulse: true,
    badgeVariant: "secondary",
  },
  running: {
    label: "Running",
    dotColor: "bg-blue-500",
    pulse: true,
    badgeVariant: "default",
  },
  stopping: {
    label: "Stopping",
    dotColor: "bg-yellow-500",
    pulse: true,
    badgeVariant: "secondary",
  },
  stopped: {
    label: "Stopped",
    dotColor: "bg-gray-500",
    pulse: false,
    badgeVariant: "outline",
  },
  success: {
    label: "Completed",
    dotColor: "bg-green-500",
    pulse: false,
    badgeVariant: "success",
  },
  error: {
    label: "Error",
    dotColor: "bg-red-500",
    pulse: false,
    badgeVariant: "destructive",
  },
}