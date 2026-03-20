import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  FileSpreadsheet,
  Loader2,
  Upload,
  ChevronsUpDown,
  FileQuestionMark,
  Trash2,
  Copy,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useState } from "react"



export interface SelectedFile {
  file: File
  path: string
}

interface UploadResponse {
  filename: string
  filepath: string
  local_filepath:string
  sku_count: number
  column_count: number
  column_names: string[]
}

interface Props {
  file: SelectedFile | null
  status: "idle" | "uploading" | "finished"
  progress: number
  onPickFile: () => void
  onStart: () => void
  uploadResponse: UploadResponse | null
  onDelete?: () => void
  isDeleting?: boolean
}

export function UploadCard({
  file,
  status,
  progress,
  onPickFile,
  onStart,
  uploadResponse,
  onDelete,
  isDeleting = false,
}: Props) {

  const [serverCopied, setServerCopied] = useState(false)
  const [localCopied, setLocalCopied] = useState(false)


  return (
    <Card className="shadow-2xl border-0 bg-gradient-to-br from-blue-600 to-purple-700 text-white">
      <CardHeader className="text-center pb-8">
        <FileSpreadsheet className="h-12 w-12 mx-auto mb-4" />
        <CardTitle className="text-2xl">Upload SKU File</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Custom compact file upload area */}
        <div className="relative">
          {/* Invisible click overlay (Tauri picker) */}
          <div
            onClick={status === "uploading" ? undefined : onPickFile}
            className="absolute inset-0 z-10 cursor-pointer"
          />

          <label
            className={`
              relative flex items-center justify-center gap-4 p-5 border-2 border-dashed rounded-lg
              transition-all duration-300
              ${
                file
                  ? "border-white/50 bg-white/20"
                  : "border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50"
              }
              ${status === "uploading" ? "opacity-75 cursor-not-allowed" : ""}
            `}
          >
            <div className="flex items-center gap-3">
              <div
                className={`${
                  file ? "bg-amber-500/20" : "bg-white/20"
                } rounded-full p-2 flex items-center justify-center`}
              >
                <Upload
                  className={`h-5 w-5 ${
                    file ? "text-amber-500" : "text-white"
                  }`}
                />
              </div>

              <div className="text-left">
                {file ? (
                  <>
                    <p className="font-medium truncate max-w-[200px]">
                      {file.file.name}
                    </p>
                    <p className="text-xs opacity-80">
                      {(file.file.size / 1024 / 1024).toFixed(1)} MB • Click to
                      replace
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">Click to upload SKU file</p>
                    <p className="text-xs opacity-80">.xlsx, .csv, .txt</p>
                  </>
                )}
              </div>
            </div>

            {!file && <FileQuestionMark className="h-4 w-4 opacity-60" />}
          </label>
        </div>

        {/* Upload Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            className="w-50 bg-white text-blue-700 hover:bg-white/90 font-bold"
            disabled={!file || status === "uploading"}
            onClick={onStart}
          >
            {status === "uploading" ? (
              <>
                Uploading <Loader2 className="ml-2 h-5 w-5 animate-spin" />
              </>
            ) : (
              <>
                Start Upload <Upload className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>

        {/* Progress Bar */}
        {status === "uploading" && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        )}

        {/* Uploaded Sheet Details Dropdown */}
        {uploadResponse && status === "finished" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="
                w-full justify-between rounded-lg px-3 py-2
                bg-white/20 border border-white/30 text-white
                backdrop-blur-md transition-all
                hover:bg-white/30
                dark:bg-neutral-900/50 dark:border-neutral-700 dark:text-neutral-200
                group
              "
            >
              <span className="truncate max-w-[220px]">
                {uploadResponse.filename}
              </span>
              <ChevronsUpDown className="h-4 w-4 opacity-80 transition-transform group-data-[state=open]:rotate-180" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            side="bottom"
            sideOffset={8}
            className="
              w-[380px] max-w-[95vw] z-50
              bg-white/80 dark:bg-neutral-900/80
              backdrop-blur-md
              border border-neutral-200 dark:border-neutral-800
              rounded-xl p-2
              shadow-xl
            "
          >
            <DropdownMenuLabel className="px-3 text-base font-semibold text-neutral-900 dark:text-neutral-200">
              Uploaded Sheet Details
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-neutral-200 dark:bg-neutral-800" />

            {/* MAIN CONTENT */}
            <div className="p-4 space-y-4 rounded-lg border">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-neutral-500 dark:text-neutral-400">SKU Count</p>
                  <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    {uploadResponse.sku_count.toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-neutral-500 dark:text-neutral-400">Column Count</p>
                  <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    {uploadResponse.column_count}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-neutral-500 dark:text-neutral-400 mb-2">Columns</p>
                <div className="flex flex-wrap gap-2">
                  {uploadResponse.column_names.map((col) => (
                    <Badge
                      key={col}
                      variant="secondary"
                      className="
                        bg-neutral-200/60 text-neutral-900 border-neutral-300
                        dark:bg-neutral-800/60 dark:text-neutral-200 dark:border-neutral-700
                      "
                    >
                      {col}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-neutral-500 dark:text-neutral-400 mb-1">Server File Path</p>

                <div className="flex items-center bg-black/10 dark:bg-black/30 px-3 py-2 rounded-md text-neutral-800 dark:text-neutral-200 text-xs font-mono overflow-hidden">
                  <span className="truncate flex-1 break-all">{uploadResponse.filepath}</span>

                  {/* Copy Icon */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(uploadResponse.filepath)
                            setServerCopied(true)
                            setTimeout(() => setServerCopied(false), 1500)
                          }}
                          className="ml-2 flex-shrink-0 text-neutral-500 hover:text-neutral-400 transition"
                        >
                          {serverCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>{serverCopied ? "Copied!" : "Copy path"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>



              <div>
                <p className="text-neutral-500 dark:text-neutral-400 mb-1">Local File Path</p>

                <div className="flex items-center bg-black/10 dark:bg-black/30 px-3 py-2 rounded-md text-neutral-800 dark:text-neutral-200 text-xs font-mono overflow-hidden">
                  <span className="truncate flex-1 break-all">{uploadResponse.local_filepath}</span>

                  {/* Copy Icon */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(uploadResponse.local_filepath)
                            setLocalCopied(true)
                            setTimeout(() => setLocalCopied(false), 1500)
                          }}
                          className="ml-2 flex-shrink-0 text-neutral-500 hover:text-neutral-400 transition"
                        >
                          {localCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>{localCopied ? "Copied!" : "Copy path"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

            </div>

            <DropdownMenuSeparator className="bg-neutral-200 dark:bg-neutral-800 my-2" />

            {/* DELETE SECTION */}
            <div className="p-4 pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full bg-red-600/80 hover:bg-red-600 text-white font-medium"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Sheet
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent className="bg-neutral-900/90 backdrop-blur-md text-white border border-neutral-800 rounded-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl">
                      Delete Uploaded Sheet?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-neutral-400">
                      This action cannot be undone. The file will be permanently
                      deleted from the server and database.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <AlertDialogFooter className="gap-3">
                    <AlertDialogCancel className="bg-white/10 border-neutral-700 text-white hover:bg-white/20">
                      Cancel
                    </AlertDialogCancel>

                    <AlertDialogAction
                      disabled={isDeleting}
                      onClick={(e) => {
                        e.preventDefault()
                        onDelete?.()
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Permanently
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        )}
      </CardContent>
    </Card>
  )
}
