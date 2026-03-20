import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function AppLoadingScreen() {
  const [dots, setDots] = useState("...");

  // Animate the dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-screen w-screen flex items-center justify-center overflow-hidden bg-background">

      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 blur-3xl" />

      {/* Center card */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-10 py-12 rounded-2xl border bg-card/60 backdrop-blur-xl shadow-2xl">

        {/* Animated Logo Spinner */}
        <div className="relative flex items-center justify-center">
          <div className="absolute h-20 w-20 rounded-full bg-indigo-500/20 blur-xl animate-pulse" />
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>

        {/* Text */}
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">
            Starting Workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            Connecting to backend services{dots}
          </p>
        </div>

      </div>
    </div>
  );
}
