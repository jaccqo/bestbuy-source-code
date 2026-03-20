import React from "react";
import Lottie from "lottie-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Feature {
  id: string;
  heading: string;
  label: string;
  description: string;
  image?: string;
  lottie?: object;
  url: string;
}

interface DeveloperProps {
  title?: string;
  features: Feature[];
}

const Developer: React.FC<DeveloperProps> = ({
  features,
}) => {
  return (
    <section className="h-screen p-4 overflow-y-auto custom-scrollbar">
      <TooltipProvider>
        <div className="flex flex-col gap-4">
          {features.map((feature) => (
            <motion.div
              key={feature.id}
              whileHover={{ scale: 1.01 }}
              className="group bg-card/50 backdrop-blur-sm flex flex-col rounded-lg border p-3 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all duration-300"
            >
              <div className="flex gap-4 items-start">
                {feature.lottie || feature.image ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href={`mailto:${feature.url}`} className="relative flex-shrink-0">
                        {feature.lottie ? (
                          /* Framer Motion handling the "Neon Breath" */
                          <motion.div
                            animate={{
                              filter: [
                                "drop-shadow(0 0 2px rgba(168, 85, 247, 0.4))",
                                "drop-shadow(0 0 12px rgba(168, 85, 247, 0.7))",
                                "drop-shadow(0 0 2px rgba(168, 85, 247, 0.4))",
                              ],
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            className="h-12 w-12"
                          >
                            <Lottie
                              animationData={feature.lottie}
                              loop
                              className="h-full w-full object-contain"
                            />
                          </motion.div>
                        ) : (
                          <img
                            src={feature.image}
                            alt={feature.heading}
                            className="h-12 w-12 rounded-md object-cover transition-transform group-hover:scale-105"
                          />
                        )}
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      Contact Developer
                    </TooltipContent>
                  </Tooltip>
                ) : null}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-tighter text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">
                      {feature.label}
                    </span>
                  </div>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href={`mailto:${feature.url}`}>
                        <h3 className="text-sm font-bold mt-1 group-hover:text-primary transition-colors truncate">
                          {feature.heading}
                        </h3>
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Email: {feature.url}
                    </TooltipContent>
                  </Tooltip>
                  
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </TooltipProvider>
    </section>
  );
};

export { Developer };