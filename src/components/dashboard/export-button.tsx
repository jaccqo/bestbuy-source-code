// src/components/ExportButton.tsx
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { Download, FileText, FileSpreadsheet, FileJson, ChevronDown, ChevronUp } from "lucide-react"
import { useExportMenu } from "@/hooks/use-export-menu"
import type { ExportFormat } from "@/hooks/use-export-menu"

const formatIcons: Record<ExportFormat, React.ReactNode> = {
  CSV: <FileText className="w-4 h-4 mr-2" />,
  XLSX: <FileSpreadsheet className="w-4 h-4 mr-2" />,
  JSON: <FileJson className="w-4 h-4 mr-2" />,
  TXT: <FileText className="w-4 h-4 mr-2" />,
}

const formatLabels: Record<ExportFormat, string> = {
  CSV: "CSV",
  XLSX: "XLSX (Excel)",
  JSON: "JSON",
  TXT: "TXT (Plain Text)",
}

export function ExportButton() {
  const { isOpen, setIsOpen, isDataReady, handleExport } = useExportMenu()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                disabled={!isDataReady}
                className={`
                  flex items-center gap-2 rounded-lg px-3 py-2 transition-all
                  ${isDataReady
                    ? "bg-emerald-500/20 border border-emerald-400/50 text-emerald-900 hover:bg-emerald-500/30 dark:text-emerald-300"
                    : "bg-neutral-200/50 border border-neutral-300 text-neutral-600 cursor-not-allowed dark:bg-neutral-800/50 dark:border-neutral-700 dark:text-neutral-400"}
                `}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {isDataReady ? "Export Data" : "Nothing To Export"}
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </DropdownMenuTrigger>

            {/* INCREASED WIDTH TO w-80 */}
            <DropdownMenuContent
              align="center"
              className="w-80 bg-white/80 backdrop-blur-md border border-neutral-200 dark:bg-neutral-900/80 dark:border-neutral-800 rounded-xl p-2 shadow-xl"
            >
              <DropdownMenuLabel className="px-3">Export Options</DropdownMenuLabel>
              <p className="text-xs text-muted-foreground mb-2 px-3">
                Choose a format to download your scraped results.
              </p>
              
              <DropdownMenuSeparator />

              {(["CSV", "XLSX", "JSON", "TXT"] as ExportFormat[]).map((format) => (
                <DropdownMenuItem
                  key={format}
                  onClick={() => handleExport(format)}
                  className="cursor-pointer py-2.5 px-3 focus:bg-neutral-100 dark:focus:bg-neutral-800 rounded-lg"
                >
                  {formatIcons[format]}
                  <span className="font-medium">{formatLabels[format]}</span>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator /> 

              {/* TIPS SECTION */}
              <div className="mx-1 mt-2 space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
                <div className="flex gap-3">
                  <div className="mt-0.5">
                     <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-600">i</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-200">Analysis:</span> XLSX & JSON preserve data structures for clean analysis in BI tools.
                  </p>
                </div>

                <div className="flex gap-3">
                  <div className="mt-0.5">
                     <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/10 text-[10px] font-bold text-amber-600">!</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-200">Deep Data:</span> JSON includes the full raw schema and nested technical metadata.
                  </p>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipTrigger>

        {!isDataReady && (
          <TooltipContent>
            <p>Run the scraper first to enable export</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}