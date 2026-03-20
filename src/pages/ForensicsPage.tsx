import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ForensicsTable } from "@/components/dashboard/forensics-table";
import { FileDown, Zap } from "lucide-react";
import Lottie from "lottie-react";
import { motion } from "framer-motion";
import labLottie from "/src/lotties/lab-effect.json";

export default function ForensicsPage() {
  return (
    <div className="container py-10 space-y-10 relative min-h-screen">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Data Forensics</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Hero Card Section with LOCAL lava lamp background */}
      <div className="relative rounded-3xl overflow-hidden isolate">
        {/* Lava lamp blobs – positioned relative to this container, behind the card */}
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
          <motion.div
            animate={{
              x: ["-30%", "50%", "-20%", "60%", "-30%"],
              y: ["-40%", "30%", "-60%", "20%", "-40%"],
              scale: [1, 1.5, 0.9, 1.6, 1],
            }}
            transition={{ duration: 20, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-indigo-600/25 rounded-full blur-[140px]"
          />

          <motion.div
            animate={{
              x: ["20%", "-40%", "30%", "-50%", "20%"],
              y: ["30%", "-30%", "50%", "-20%", "30%"],
              scale: [1.1, 1.7, 1.0, 1.8, 1.1],
            }}
            transition={{ duration: 24, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 4 }}
            className="absolute bottom-[-15%] right-[-15%] w-[130%] h-[130%] bg-purple-600/25 rounded-full blur-[160px]"
          />

          <motion.div
            animate={{
              x: ["-10%", "70%", "10%", "80%", "-10%"],
              y: ["10%", "-50%", "40%", "-30%", "10%"],
              scale: [0.9, 1.6, 1.05, 1.5, 0.9],
            }}
            transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 8 }}
            className="absolute top-[20%] left-[15%] w-[110%] h-[110%] bg-cyan-500/20 rounded-full blur-[150px]"
          />
        </div>

        {/* Hero Card – very transparent so blobs are visible behind */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className={`
            relative 
            rounded-3xl
            border border-white/10 dark:border-white/8
            bg-white/20 dark:bg-black/40
            backdrop-blur-xl
            shadow-2xl shadow-black/10 dark:shadow-black/30
            p-8 md:p-12
          `}
        >
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 dark:bg-black/20 border border-white/20 backdrop-blur-md">
                <Lottie animationData={labLottie} className="w-14 h-14" />
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                  Forensics Lab
                </h1>
                <p className="text-muted-foreground max-w-xl">
                  Deep Data analysis • integrity Check and reruns
                </p>

                  <p className="text-muted-foreground text-xs">
                    Explore detailed product insights, track historical changes, and ensure data accuracy . Our lab provides actionable reports and quick exports to help teams make informed decisions efficiently.
                </p>

              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="backdrop-blur-md bg-white/8 dark:bg-black/20 border-white/20 hover:bg-white/15 dark:hover:bg-black/30 text-foreground"
              >
                <FileDown className="mr-2 h-4 w-4" /> Export Reports
              </Button>
              <Button
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-700/30"
              >
                <Zap className="mr-2 h-4 w-4" /> Super Fast
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Table container – no lava lamp here */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="rounded-2xl border bg-card/70 backdrop-blur-md shadow-md overflow-hidden"
      >
        <ForensicsTable />
      </motion.div>
    </div>
  );
}