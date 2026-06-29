import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const SE_TZ = "Europe/Stockholm";

export function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short", timeZone: SE_TZ });
}

export function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: SE_TZ }) + " (sv tid)";
}

// Returns a stable per-day key in Swedish time, e.g. "2026-06-12"
export function seDayKey(iso: string) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: SE_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);
  const y = parts.find(p => p.type === "year")!.value;
  const m = parts.find(p => p.type === "month")!.value;
  const day = parts.find(p => p.type === "day")!.value;
  return `${y}-${m}-${day}`;
}

export function sameSeDay(a: Date, iso: string) {
  return seDayKey(a.toISOString()) === seDayKey(iso);
}

export function stageLabel(s: string) {
  switch (s) {
    case "group": return "Gruppspel";
    case "r16": return "16-delsfinal";
    case "qf": return "Åttondelsfinal";
    case "sf": return "Semifinal";
    case "third": return "Bronsmatch";
    case "final": return "Final";
    default: return s;
  }
}
