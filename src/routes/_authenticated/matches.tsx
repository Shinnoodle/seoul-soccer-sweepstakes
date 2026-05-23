import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MatchCard } from "@/components/MatchCard";
import { fmtDate, stageLabel, cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/matches")({
  component: MatchesPage,
});

const STAGES = ["all","group","r16","qf","sf","third","final"] as const;

function MatchesPage() {
  const [filter, setFilter] = useState<typeof STAGES[number]>("all");

  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches").select("*").order("match_number");
      if (error) throw error;
      return data;
    },
  });

  const filtered = matches?.filter(m => filter === "all" || m.stage === filter) ?? [];
  const groups: Record<string, typeof filtered> = {};
  filtered.forEach(m => {
    const k = new Date(m.kickoff).toDateString();
    if (!groups[k]) groups[k] = [];
    groups[k]!.push(m);
  });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Alla matcher</h1>

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
