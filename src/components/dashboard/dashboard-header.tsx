// src/components/dashboard/DashboardHeader.tsx
import { motion } from "framer-motion"

export function DashboardHeader() {
  return (
    <div className="text-center">
      <motion.h1
        className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 6,
          ease: "easeInOut",
          repeat: Infinity,
        }}
        style={{ backgroundSize: "200% 200%" }}
      >
        Best Buy Scraper Pro
      </motion.h1>

      <p className="mt-2 text-muted-foreground">
        Upload • Live scraping • auto update sheet • Export and confettis
      </p>
    </div>
  )
}
