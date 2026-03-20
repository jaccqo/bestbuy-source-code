import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSearch,FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";

export const DataForensicsButton: React.FC = () => (
  <Button
    asChild
    size="sm"
    className="flex items-center gap-2 rounded-lg px-3 py-2 transition-all bg-neutral-500/10 border border-neutral-400/30 text-neutral-900 hover:bg-neutral-500/20 dark:text-neutral-300"
  >
    <Link to="/forensics" className="flex items-center">
      <FlaskConical className="mr-2 w-4 h-4 opacity-70" />
      <span className="hidden sm:inline font-medium text-xs tracking-tight">Data Forensics</span>
      
      {/* Subtle, smaller Badge */}
      <Badge 
        variant="outline" 
        className="
          ml-2 h-4 px-1.5 
          border-blue-500/30 bg-blue-500/10 
          text-[9px] font-bold lowercase tracking-widest text-blue-600 dark:text-blue-400
          hover:bg-blue-500/10 transition-none
        "
      >
        <span className="mr-1 h-1 w-1 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
        New
      </Badge>
    </Link>
  </Button>
);