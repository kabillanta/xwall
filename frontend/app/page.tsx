"use client";

import { Agenda } from "@/components/Agenda";
import { XWall } from "@/components/XWall";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6 font-sans h-screen overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-6 px-2">
        <img
          src="/logo.png"
          alt="Community Logo"
          className="max-h-10 object-contain"
        />
        <div className="hidden md:flex items-center gap-3 bg-white/95 backdrop-blur px-5 py-2.5 rounded-full border border-border/40 shadow-sm hover:shadow-md transition-all">
          <span className="text-sm font-medium text-muted-foreground">Tag</span>
          <div className="flex items-center gap-1 font-bold text-sm">
            <span>
              <span className="text-black/80">@gdgcblr</span>
              <span className="text-muted-foreground/40 font-normal">,</span>
            </span>
            <span>
              <span className="text-black/80">@DeutscheBank</span>
              <span className="text-muted-foreground/40 font-normal">,</span>
            </span>
            <span className="text-black/80">@ClickHouseDB</span>
          </div>
          <span className="text-sm font-medium text-muted-foreground">on X to get featured here  !</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Left Column - Agenda (Scrollable) */}
        <div className="lg:col-span-4 h-full flex flex-col min-h-0">
          <Agenda />
        </div>

        {/* Right Column - Social Wall (Fixed/Animated) */}
        <div className="lg:col-span-8 h-full flex flex-col min-h-0">
          <XWall />
        </div>
      </div>

      {/* Footer Attribution */}
      <footer className="mt-4 w-full bg-white text-muted-foreground py-2 px-4 rounded-lg text-xs font-mono text-center shrink-0 border border-border shadow-sm">
Made with ❤️ for the GDG Cloud Bengaluru community - Kabillan T A      </footer>
    </div>
  );
}