import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { UploadCard } from "@/components/dashboard/upload-card"
import { LogsViewer } from "@/components/dashboard/logs-viewer"

import { useClearLogs } from "@/hooks/use-clear-logs"
import { ChartSection } from "@/components/dashboard/chart-section"
import { Separator } from "@/components/ui/separator"
import { useUpload } from "@/hooks/use-upload"
import { useLogPolling } from "@/hooks/use-log-polling"
import { useLogContext } from "@/context/log-context";
export default function Dashboard() {



  const { logs, addLog, refetch: refetchLogs } = useLogContext();
  const { clearLogs } = useClearLogs(refetchLogs)

    useLogPolling(true, addLog, logs.length)

  const {
    file,
    status,
    progress,
    uploadResponse,
    isDeleting,
    pickFile,
    uploadFile,
    handleDeleteSheet,
  } = useUpload(addLog)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-background to-orange-50/20 dark:from-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <DashboardHeader />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-5">
            <UploadCard
              file={file}
              status={status}
              progress={progress}
              onPickFile={pickFile}
              onStart={uploadFile}
              uploadResponse={uploadResponse}
              onDelete={handleDeleteSheet}
              isDeleting={isDeleting}
            />
          </div>

          <div className="xl:col-span-7 space-y-6">
            <ChartSection />
          </div>
        </div>

        <Separator className="my-8" />

        <LogsViewer logs={logs} onClearLogs={clearLogs} />
      </div>
    </div>
  )
}
