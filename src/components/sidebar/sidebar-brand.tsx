// src/components/sidebar/SidebarBrand.tsx

import { Link } from "react-router-dom";

export function SidebarBrand() {
  return (
    <Link to="/" className="flex items-center gap-3 px-5 hover:opacity-90 transition-opacity">
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center text-white font-black text-2xl shadow-lg">
        BB
      </div>
      <div>
        <h1 className="text-lg font-black tracking-tighter">Best Buy</h1>
        <p className="text-xs text-muted-foreground font-medium">Scraper Pro</p>
      </div>
    </Link>
  );
}