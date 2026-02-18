"use client";

import { useState, useEffect, useRef } from "react";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AgendaItem {
  id: string;
  time: string; // "HH:mm" format
  title: string;
  speaker?: string;
}

const AGENDA: AgendaItem[] =[
  {
    "id": "1",
    "time": "09:30",
    "title": "Registration & Check-in"
  },
  {
    "id": "2",
    "time": "10:30",
    "title": "Keynote and Welcome Address",
    "speaker": "Anupama Kumaraguru, Director – CIO, Corporate Bank"
  },
  {
    "id": "3",
    "time": "10:45",
    "title": "Designing a Platform-Agnostic High Availability System",
    "speaker": "Runcy Oommen, Director of Engineering, Skyhigh Security"
  },
  {
    "id": "4",
    "time": "11:15",
    "title": "Designing for Sub-Second Analytics: OutMarket.ai’s Real-Time Architecture with ClickHouse",
    "speaker": "Avitash Purohit, Principal Software Engineer, OutMarket.ai"
  },
  {
    "id": "5",
    "time": "11:45",
    "title": "Break"
  },
  {
    "id": "6",
    "time": "12:00",
    "title": "Interactive Quiz / Engagement Session"
  },
  {
    "id": "7",
    "time": "12:15",
    "title": "Elevating Banking: How Data Observability Drives Trust and Personalisation",
    "speaker": "Sateesh Kavuri, Director, CIO Investment Bank, Deutsche Bank"
  },
  {
    "id": "8",
    "time": "12:45",
    "title": "Building Self-Contained Data Agents with Agno, chDB, and Google Cloud Run",
    "speaker": "Shruti Mantri & Shuva Jyoti Kar"
  },
  {
    "id": "9",
    "time": "13:15",
    "title": "Closing Remarks"
  },
  {
    "id": "10",
    "time": "13:30",
    "title": "Networking over Lunch"
  }
];

const IST_TIMEZONE = "Asia/Kolkata";

function getISTTime(date: Date) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")!.value);
  const m = Number(parts.find((p) => p.type === "minute")!.value);
  return h * 60 + m;
}

function getStatus(index: number, now: Date): "past" | "active" | "upcoming" {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const currentMinutes = getISTTime(now);
  const itemStart = toMinutes(AGENDA[index].time);
  const nextStart = index < AGENDA.length - 1 ? toMinutes(AGENDA[index + 1].time) : itemStart + 60;

  if (currentMinutes >= nextStart) return "past";
  if (currentMinutes >= itemStart) return "active";
  return "upcoming";
}

export function Agenda() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000); // update every 30s
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-full flex flex-col bg-card rounded-xl border shadow-sm overflow-hidden">
      {/* Community Logo */}
      <div className="px-6 py-5 border-b flex items-center justify-center bg-card">
        <h1 className="text-2xl font-bold tracking-tight">Cloud Observablity Summit</h1>
      </div>

      <div className="px-5 py-3 border-b bg-muted/20 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold tracking-wider uppercase text-foreground">Schedule</h2>
        </div>
        
        <div className="flex items-center gap-3 text-sm font-mono font-medium text-muted-foreground">
          <span suppressHydrationWarning>{now.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', timeZone: IST_TIMEZONE })}</span>
          <span className="text-muted-foreground/30">•</span>
          <span suppressHydrationWarning>{now.toLocaleDateString("en-IN", { timeZone: IST_TIMEZONE })}</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1">
          {AGENDA.map((item, index) => (
            <AgendaItemRow
              key={item.id}
              item={item}
              status={getStatus(index, now)}
            />
          ))}
        </div>
      </ScrollArea>


    </div>
  );
} 

function AgendaItemRow({ item, status }: { item: AgendaItem; status: "active" | "past" | "upcoming" }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "active" && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [status]);

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-start gap-4 px-4 py-3 rounded-lg transition-all duration-300",
        status === "active" && "bg-primary/10 border border-primary/20 shadow-sm translate-x-1",
        status === "past" && "opacity-50 grayscale-[0.8]",
        status === "upcoming" && "hover:bg-muted/50"
      )}
    >
      {/* Time */}
      <span className={cn(
        "text-sm font-mono font-semibold w-14 shrink-0 pt-0.5 transition-colors",
        status === "active" ? "text-primary" : "text-muted-foreground"
      )}>
        {item.time}
      </span>

      {/* Session info */}
      <div className="min-w-0 flex-1">
        <h3 className={cn(
          "font-semibold text-sm leading-tight transition-colors",
          status === "active" && "text-primary"
        )}>
          {status === "active" && (
            <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2 animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
          )}
          {item.title}
        </h3>
        {item.speaker && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {item.speaker}
          </p>
        )}
      </div>
    </div>
  );
}
