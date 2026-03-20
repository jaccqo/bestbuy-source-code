import React from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { CustomTitlebar } from "@/components/custom-titlebar";
import Dashboard from "@/pages/dashboard";
import ForensicsPage from "@/pages/ForensicsPage";
import { RightClickMenu } from "./right-click-menu";
import { useAppBoot } from "@/hooks/use-app-boot";
import { AppLoadingScreen } from "@/components/app-loading-screen";
import { LogProvider } from "@/context/log-context";
import { ScraperProvider } from "@/context/scraper-context";

export default function App() {
  const { isBooting } = useAppBoot();
  if (isBooting) return <AppLoadingScreen />;

  return (
    <>
      <RightClickMenu />
      <CustomTitlebar />
      <Toaster position="top-center" richColors closeButton expand={false} />
      
      {/* 1. Wrap the entire app so Sidebar AND Routes share the same state */}
      <LogProvider>
        <ScraperProvider>
        <div className="pt-11">
          <SidebarProvider defaultOpen={true}>
            <AppSidebar />
            <SidebarInset className="min-h-screen bg-background">
              <div className="p-4 flex items-center gap-2">
                <SidebarTrigger />
                <span className="text-xs text-muted-foreground font-mono">System Online</span>
              </div>

              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/forensics" element={<ForensicsPage />} />
              </Routes>
            </SidebarInset>
          </SidebarProvider>
        </div>
        </ScraperProvider>
      </LogProvider>
    </>
  );
}