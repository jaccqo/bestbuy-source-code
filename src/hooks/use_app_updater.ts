import { useEffect, useCallback, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

const FASTAPI_URL = "http://127.0.0.1:5000";

export function use_app_updater() {
  const isUpdatingRef = useRef(false);
  const toastIdRef = useRef<string | number | null>(null);
  const downloadedBytesRef = useRef(0);
  const totalBytesRef = useRef(0);
  const startTimeRef = useRef<number>(0);

  const getSavedLicense = async (): Promise<string | null> => {
    try {
      const res = await fetch(`${FASTAPI_URL}/get_license`);
      if (res.ok) {
        const data = await res.json();
        return data.license_key || null;
      }
    } catch {
      return null;
    }
    return null;
  };

  const checkForUpdates = useCallback(async (manual: boolean = false) => {
    if (isUpdatingRef.current) {
      if (manual) toast.info("An update is already in progress.");
      return;
    }

    const key = await getSavedLicense();
    if (!key) {
      if (manual) toast.error("Please activate your license first.");
      return;
    }

    isUpdatingRef.current = true;

    // Reset tracking
    downloadedBytesRef.current = 0;
    totalBytesRef.current = 0;
    startTimeRef.current = Date.now();

    if (manual) {
      toastIdRef.current = toast.loading("Checking for premium updates...", { duration: 0 });
    }

    try {
      await invoke("check_for_updates_with_license", { licenseKey: key });
    } catch (error) {
      console.error("Update check failed:", error);
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
      toast.error("Update check failed");
      isUpdatingRef.current = false;
    }
  }, []);

  // AUTO-CHECK ON MOUNT + every 6 hours
  useEffect(() => {
    const runCheck = async () => {
      const key = await getSavedLicense();
      if (key && !isUpdatingRef.current) {
        checkForUpdates(false);
      }
    };

    runCheck();

    const interval = setInterval(runCheck, 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkForUpdates]);

  // Event listeners
  useEffect(() => {
    let activeToastId: string | number | null = null;

    const unlistenAvailable = listen("tauri://update-available", (event: any) => {
      totalBytesRef.current = event.payload.contentLength || 0;
      downloadedBytesRef.current = 0; // reset on new update
      startTimeRef.current = Date.now();

      activeToastId = toast.loading(`Update v${event.payload.version} available — downloading...`, {
        duration: Infinity,
      });
    });

    const unlistenProgress = listen("tauri://update-download-progress", (event: any) => {
      if (!isUpdatingRef.current) return;

      const { chunkLength, contentLength } = event.payload;
      downloadedBytesRef.current += chunkLength;
      if (contentLength) totalBytesRef.current = contentLength;

      const total = totalBytesRef.current || 1; // avoid divide by zero
      const downloaded = Math.min(downloadedBytesRef.current, total); // clamp

      const percentage = Math.min(Math.round((downloaded / total) * 100), 100); // NEVER over 100%
      const elapsed = (Date.now() - startTimeRef.current) / 1000 || 1;
      const speed = downloaded / elapsed / 1024 / 1024;
      const remaining = total - downloaded;
      const eta = speed > 0 ? Math.round(remaining / speed / 1024 / 1024) : 0;

      toast.loading("Downloading update...", {
        id: activeToastId || toastIdRef.current || undefined,
        description: `${percentage}% • ${speed.toFixed(1)} MB/s • ~${eta}s left`,
      });
    });

    const unlistenNoUpdate = listen("tauri://update-no-update", () => {
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
      if (activeToastId) toast.dismiss(activeToastId);
      toast.success("You're on the latest version! 🎉");
      isUpdatingRef.current = false;
    });

    const unlistenFinished = listen("tauri://update-install", () => {
      toast.success("Update installed! Relaunching in 5 seconds...", { duration: 6000 });
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
      if (activeToastId) toast.dismiss(activeToastId);
      
      isUpdatingRef.current = false;
    });

    const unlistenError = listen("tauri://update-error", () => {
      toast.error("Update failed — try again later");
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
      if (activeToastId) toast.dismiss(activeToastId);
      isUpdatingRef.current = false;
    });

    return () => {
      unlistenAvailable.then(f => f());
      unlistenProgress.then(f => f());
      unlistenNoUpdate.then(f => f());
      unlistenFinished.then(f => f());
      unlistenError.then(f => f());
    };
  }, []);

  return { checkForUpdates };
}