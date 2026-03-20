import { DataTable } from "@/components/data-table";
import { useForensics } from "@/hooks/use-forensics";

export function ForensicsTable() {
  const { data, isLoading, error } = useForensics();

  if (isLoading) {
    return <div className="p-8 text-center">Loading forensics data...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="p-3 space-y-3">
      <DataTable  />
    </div>
  );
}