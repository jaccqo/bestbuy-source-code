export type LogLevel = "INFO" | "SUCCESS" | "ERROR" | "WARN"

export type AddLogFn = (msg: string, level?: string) => void
