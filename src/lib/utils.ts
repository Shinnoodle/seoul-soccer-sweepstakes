import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" });
}

export function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

export function stageLabel(s: string) {
  switch (s) {
    case "group": return "Gruppspel";
    case "r16": return "Åttondel";
    case "qf": return "Kvartsfinal";
    case "sf": return "Semifinal";
    case "third": return "Bronsmatch";
    case "final": return "Final";
    default: return s;
  }
}
