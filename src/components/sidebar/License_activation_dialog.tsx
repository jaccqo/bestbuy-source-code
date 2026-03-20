import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fetch } from '@tauri-apps/plugin-http';
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { relaunch } from "@tauri-apps/plugin-process";

const FASTAPI_URL = "http://127.0.0.1:5000";
const PROXY_URL = "https://bbscraper-proxy.vercel.app/latest.json";

interface LicenseActivationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LicenseActivationDialog({ open, onClose, onSuccess }: LicenseActivationDialogProps) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [updateToastId, setUpdateToastId] = useState<string | number | null>(null);

  const activate = async () => {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      toast.error("Please enter a license key");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(PROXY_URL, {
        headers: { "x-license-key": trimmedKey },
      });

      if (res.ok) {
        await fetch(`${FASTAPI_URL}/save_license`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ license_key: trimmedKey }),
        });

        const toastId = toast.info("License verified. Checking for updates...", { duration: Infinity });
        setUpdateToastId(toastId);

        // Listen for update progress
        const unlistenProgress = await listen("tauri://update-download-progress", (event: any) => {
          const { chunkLength, contentLength } = event.payload;
          const percentage = contentLength ? Math.round((chunkLength / contentLength) * 100) : 0;
          toast.loading(`Downloading update... ${percentage}%`, { id: toastId });
        });

        const unlistenFinished = await listen("tauri://update-install", () => {
          toast.success("Update installed! Relaunching...", { id: toastId, duration: 6000 });
          setTimeout(() => relaunch(), 5000);
          unlistenProgress();
          unlistenFinished();
        });

        // Trigger Rust updater
        await invoke("check_for_updates_with_license", { licenseKey: trimmedKey });

        toast.success("License activated! Auto-updates enabled 🎉");
        onSuccess();
      } else {
        toast.error("Invalid license key — please check and try again.");
      }
    } catch (err) {
      toast.error("Validation failed — check internet");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    toast.info("Running in limited mode — auto-updates disabled");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Activate Best Buy Scraper Pro</DialogTitle>
         <DialogDescription>
            Enter your license key to enable auto-updates and full features.
            <br />
            <a
              href="mailto:kinginjack@gmail.com"
              className="text-primary underline hover:opacity-80 transition-opacity"
            >
              Contact support
            </a>
          </DialogDescription>

        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="license">License Key</Label>
            <Input
              id="license"
              placeholder="BBSP-XXXX-XXXX-XXXX-XXXX"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={loading}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && activate()}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Continue without activation
          </Button>
          <Button onClick={activate} disabled={loading}>
            {loading ? "Activating..." : "Activate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}