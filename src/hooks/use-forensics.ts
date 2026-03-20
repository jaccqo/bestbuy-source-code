import { useState, useEffect } from "react";
import { toast } from "sonner"; 
import { type ScraperEntry } from "@/components/data-table";

export function useForensics() {
  const [data, setData] = useState<ScraperEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function fetchData() {
    try {
      const response = await fetch("http://localhost:5000/forensics/");
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const result = await response.json();
      
      // OPTIMIZATION: Only update state if the stringified data is different
      // This prevents React Table from re-calculating everything if nothing changed
      setData(prev => {
        if (JSON.stringify(prev) === JSON.stringify(result)) return prev;
        return result;
      });
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }
  async function clearTable() {
    try {
      const response = await fetch("http://localhost:5000/forensics/clear", {
        method: "DELETE",
      });
      
      if (!response.ok) throw new Error("Failed to clear data");
      
      setData([]);
      toast.success("Table cleared successfully");
    } catch (err) {
      toast.error("Failed to clear table");
      setError(err instanceof Error ? err : new Error("Failed to clear"));
    }
  }

  async function removeItem(sku: string) {
    try {
      const response = await fetch(`http://localhost:5000/forensics/${sku}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Backend deletion failed");

      setData((prev) => prev.filter((item) => item.sku !== sku));
      toast.success(`Item ${sku} removed`);
    } catch (err) {
      toast.error(`Failed to remove SKU: ${sku}`);
      setError(err instanceof Error ? err : new Error("Failed to remove item"));
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return { data, isLoading, error, clearTable, removeItem };
}