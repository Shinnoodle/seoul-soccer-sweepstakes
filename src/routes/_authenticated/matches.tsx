import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MatchCard } from "@/components/MatchCard";
import { fmtDate, stageLabel, cn, seDayKey, sameSeDay } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { usePool } from "@/hooks/usePool";

export const Route = createFileRoute("/_authenticated/matches")({
  component: MatchesPage,
});

const STAGES = ["all","group","r16","r8","qf","sf","third","final"] as const;

function MatchesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<typeof STAGES[number]>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const { selectedPool } = usePool();
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
  }, []);

  const { data: poolMemberIds } = useQuery({
    queryKey: ["pool-members", selectedPool?.id],
    enabled: !!selectedPool,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pool_members").select("user_id").eq("pool_id", selectedPool!.id);
      if (error) throw error;
      return data.map(m => m.user_id);
    },
  });

  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches").select("*").order("kickoff");
      if (error) throw error;
      return data;
    },
  });

  const matchIds = useMemo(() => matches?.map(m => m.id) ?? [], [matches]);
  const matchIdsKey = matchIds.join(",");

  const lockedIds = useMemo(() => {
    const now = new Date();
    return (matches ?? [])
      .filter(m => m.finished || (m.home_score !== null && m.away_score !== null) || new Date(m.kickoff) <= now)
      .map(m => m.id);
  }, [matches]);
  const lockedIdsKey = lockedIds.join(",");

  const { data: ownPicksBulk } = useQuery({
    queryKey: ["own-picks-bulk", userId, matchIdsKey],
    enabled: !!userId && matchIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_picks")
        .select("match_id,home_score,away_score,joker")
        .eq("user_id", userId!)
        .in("match_id", matchIds).limit(10000)
      if (error) throw error;
      return data;
    },
  });

  const { data: allPicksBulk } = useQuery({
    queryKey: ["all-picks-bulk", lockedIdsKey],
    enabled: lockedIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_picks")
        .select("match_id,user_id,home_score,away_score,joker")
        .in("match_id", lockedIds).limit(10000)
      if (error) throw error;
      return data;
    },
  });

  // Auto-scroll to next upcoming match on load
  useEffect(() => {
    if (!matches || matches.length === 0) return;
    const now = new Date();
    const nextMatch = matches.find(m => new Date(m.kickoff) > now);
    const lastMatch = matches[matches.length - 1];
    const targetKey = nextMatch ? seDayKey(nextMatch.kickoff) : lastMatch ? seDayKey(lastMatch.kickoff) : null;
    if (!targetKey) return;
    setTimeout(() => {
      const el = sectionRefs.current[targetKey];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    }, [matches, allPicksBulk]);
  
  const matchDays = useMemo(() => {
    const set = new Set<string>();
    matches?.forEach(m => set.add(seDayKey(m.kickoff)));
    return set;
  }, [matches]);

  const filtered = (matches ?? []).filter(m => {
    if (filter !== "all" && m.stage !== filter) return false;
    if (selectedDate && !sameSeDay(selectedDate, m.kickoff)) return false;
    return true;
  });

  const groups: Record<string, typeof filtered> = {};
  filtered.forEach(m => {
    const k = seDayKey(m.kickoff);
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
              modifiers={{ hasMatch: (d) => matchDays.has(seDayKey(d.toISOString())) }}
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

      <p className="text-xs text-muted-foreground">Matchtips låses när matchen startar — se till att tippa i tid!</p>

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
        <section key={day} ref={(el) => { sectionRefs.current[day] = el; }} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {fmtDate(list![0].kickoff)}
          </h2>
          {list!.map(m => {
            const ownPick = ownPicksBulk
              ? (ownPicksBulk.find(p => p.match_id === m.id) ?? null)
              : undefined;
            const matchAllPicks = allPicksBulk?.filter(p => p.match_id === m.id);
            const jokerCount = ownPicksBulk?.filter(p => p.joker).length;
            return (
              <MatchCard
                key={m.id}
                match={m}
                userId={userId}
                ownPick={ownPick}
                allMatchPicks={matchAllPicks}
                jokerCount={jokerCount}
                poolMemberIds={poolMemberIds}
                onPickSaved={() => {
                  qc.invalidateQueries({ queryKey: ["own-picks-bulk", userId, matchIdsKey] });
                }}
              />
            );
          })}
        </section>
      ))}
    </div>
  );
}
