"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCcw, Database, Copy, Check, Brush } from "lucide-react"; // Added Brush icon
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";

import { useRescrapeSku } from "@/hooks/use-rescrape-sku";

// --- Updated Status Themes ---
const statusStyles = {
  success: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500"
  },
  error: {
    bg: "bg-rose-500/10",
    text: "text-rose-500",
    border: "border-rose-500/20",
    dot: "bg-rose-500"
  },
  scraping: {
    bg: "bg-fuchsia-500/10",
    text: "text-fuchsia-500",
    border: "border-fuchsia-500/20",
    dot: "bg-fuchsia-500 animate-pulse"
  },
  queued: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500/20",
    dot: "bg-amber-500 animate-bounce [animation-duration:2s]"
  },
  // 1. Added Cleaning Style
  cleaning: {
    bg: "bg-sky-500/10",
    text: "text-sky-500",
    border: "border-sky-500/20",
    dot: "bg-sky-500 animate-spin [animation-duration:3s]" 
  },
  default: {
    bg: "bg-slate-500/10",
    text: "text-slate-500",
    border: "border-slate-500/20",
    dot: "bg-slate-500"
  }
};

export function ScraperDetailSheet({ item }: { item: ScraperEntry }) {
  const [copied, setCopied] = useState(false);
  const { rescrape, loading } = useRescrapeSku();

  const statusLower = item.status.toLowerCase();
  
  // 2. Updated status mapping logic
  const statusKey = 
    statusLower.includes("success") ? "success" : 
    statusLower.includes("fail") || statusLower.includes("error") ? "error" : 
    statusLower.includes("scraping") || statusLower.includes("preparing") || statusLower.includes("running") ? "scraping" : 
    statusLower.includes("queued") || statusLower.includes("pending") ? "queued" : 
    statusLower.includes("cleaning") ? "cleaning" : 
    "default";

  const styles = statusStyles[statusKey];

  // 3. Lock button for Scraping, Queued, OR Cleaning
  const isLocked = statusKey === "scraping" || statusKey === "queued" || statusKey === "cleaning" || loading;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(item, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SheetContent className="p-0 flex flex-col w-full sm:max-w-md border-l border-border/40 shadow-2xl bg-background/95 backdrop-blur-xl">
      <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 flex-shrink-0" />

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
        <SheetHeader className="text-left">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className={cn("gap-2 font-bold uppercase tracking-wider text-[10px]", styles.bg, styles.text, styles.border)}>
              <div className={cn("size-1.5 rounded-full", styles.dot)} />
              {item.status}
            </Badge>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/50">
              {item.sku}
            </span>
          </div>

          <SheetTitle className="text-xl font-bold leading-tight mt-4">
            {item.title}
          </SheetTitle>

          <SheetDescription className="text-xs text-muted-foreground">
            Details and raw payload for SKU {item.sku}.
          </SheetDescription>
        </SheetHeader>
        
        <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

        <section className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/30 space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Price</div>
            <p className="text-2xl font-black text-indigo-500">${item.price}</p>
          </div>
          <div className="p-4 rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/30 space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Brand</div>
            <p className="text-lg font-semibold truncate">{item.brand}</p>
          </div>
        </section>

        <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Database className="h-3 w-3" /> Raw Payload
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={handleCopy}>
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
          
          <div className="relative rounded-xl border border-border/40 bg-zinc-950 overflow-hidden shadow-inner">
            <div className="absolute top-0 left-0 right-0 h-6 bg-zinc-900/80 flex items-center px-3 gap-1.5 border-b border-border/20">
              <div className="size-2 rounded-full bg-rose-500/50" />
              <div className="size-2 rounded-full bg-amber-500/50" />
              <div className="size-2 rounded-full bg-emerald-500/50" />
            </div>
            <pre className="p-4 pt-8 text-[10px] font-mono text-emerald-500/80 leading-relaxed overflow-x-auto h-[230px]">
              {JSON.stringify(item, null, 2)}
            </pre>
          </div>
        </section>

        <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

        <Button 
          disabled={isLocked}
          onClick={() => rescrape(item.sku)}
          className={cn(
            "w-full h-10 text-white shadow-lg shadow-indigo-900/20 transition-all duration-300",
            isLocked
              ? "bg-neutral-900 cursor-not-allowed opacity-70"
              : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          )}
        >
          <RefreshCcw className={cn("mr-2 h-4 w-4", isLocked && "animate-spin")} />
          {statusKey === "scraping" ? "Scraping in Progress..." : 
           statusKey === "queued" ? "Waiting in Queue..." : 
           statusKey === "cleaning" ? "Cleaning up Scraper Engine..." :
           loading ? "Re-scraping..." : "Run Manual Re-scrape"}
        </Button>
      </div>
    </SheetContent>
  );
}