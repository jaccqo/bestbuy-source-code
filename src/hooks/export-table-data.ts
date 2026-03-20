import { save } from "@tauri-apps/plugin-dialog"
import { open } from "@tauri-apps/plugin-fs"
import { toast } from "sonner"

export async function exportTableData<T>(
  rows: T[],
  columns: string[], // headers
  format: "CSV" | "JSON" | "TXT" = "CSV"
) {
  if (!rows.length) {
    toast.info("No data to export")
    return
  }

  let content = ""

  if (format === "CSV") {
    const csvRows = [columns, ...rows.map(r => columns.map(c => (r as any)[c]))]
    content = csvRows.map(r => r.join(",")).join("\n")
  } else if (format === "JSON") {
    content = JSON.stringify(rows, null, 2)
  } else if (format === "TXT") {
    content = rows.map(r => columns.map(c => `${c}: ${(r as any)[c]}`).join(" | ")).join("\n")
  }

  const extension = format.toLowerCase()
  let filePath = await save({
    defaultPath: `forensics_export.${extension}`,
    filters: [{ name: format, extensions: [extension] }],
  })

  if (!filePath) return // canceled

  if (!filePath.toLowerCase().endsWith(`.${extension}`)) {
    filePath += `.${extension}`
  }

  const file = await open(filePath, { write: true, create: true, truncate: true })

  // Convert string to Uint8Array
  const encoder = new TextEncoder()
  const bytes = encoder.encode(content)

  await file.write(bytes)
  await file.close()
  toast.success(`Exported ${rows.length} rows to ${filePath}`)
}