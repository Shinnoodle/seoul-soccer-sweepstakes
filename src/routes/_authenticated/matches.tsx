import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MatchCard } from "@/components/MatchCard";
import { fmtDate, stageLabel, cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/matches")({
  component: MatchesPage,
});

const STAGES = ["all","group","r16","qf","sf","third","final"] as const;

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function MatchesPage() {
  const [filter, setFilter] = useState<typeof STAGES[number]>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches").select("*").order("match_number");
      if (error) throw error;
      return data;
    },
  });

  // Set of days that have matches (for highlighting the calendar)
  const matchDays = useMemo(() => {
    const set = new Set<string>();
    matches?.forEach(m => set.add(new Date(m.kickoff).toDateString()));
    return set;
  }, [matches]);

  const filtered = (matches ?? []).filter(m => {
    if (filter !== "all" && m.stage !== filter) return false;
    if (selectedDate && !sameDay(new Date(m.kickoff), selectedDate)) return false;
    return true;
  });

  const groups: Record<string, typeof filtered> = {};
  filtered.forEach(m => {
    const k = new Date(m.kickoff).toDateString();
    if (!groups[k]) groups[k] = [];
    groups[k]!.push(m);
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Matcher</h1>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm">
              <CalendarIcon className="size-4" />
              {selectedDate ? fmtDate(selectedDate.toISOString()) : "Välj datum"}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0 pointer-events-auto">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => { setSelectedDate(d); setPopoverOpen(false); }}
              defaultMonth={new Date(2026, 5, 11)}
              modifiers={{ hasMatch: (d) => matchDays.has(d.toDateString()) }}
              modifiersClassNames={{ hasMatch: "font-bold text-primary underline" }}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {selectedDate && (
        <button
          onClick={() => setSelectedDate(undefined)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" /> Rensa datumfilter
        </button>
      )}

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        {STAGES.map(s => (
          <button key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border",
              filter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
            )}
          >
            {s === "all" ? "Alla" : stageLabel(s)}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-muted-foreground">Laddar...</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="rounded-2xl bg-card border border-border p-6 text-center text-muted-foreground">
          Inga matcher matchar dina filter.
        </div>
      )}

      {Object.entries(groups).map(([day, list]) => (
        <section key={day} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {fmtDate(list![0].kickoff)}
          </h2>
          {list!.map(m => <MatchCard key={m.id} match={m} />)}
        </section>
      ))}
    </div>
  );
}
