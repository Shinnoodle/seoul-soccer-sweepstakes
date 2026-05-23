import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MatchCard } from "@/components/MatchCard";
import { fmtDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/today")({
  component: TodayPage,
});

function TodayPage() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches", "window"],
    queryFn: async () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).toISOString();
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .gte("kickoff", from)
        .lt("kickoff", to)
        .order("kickoff");
      if (error) throw error;
      return data;
    },
  });

  const today = new Date();
  const groups: Record<string, typeof matches> = {};
  matches?.forEach(m => {
    const key = new Date(m.kickoff).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key]!.push(m);
  });

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Idag</h1>
        <p className="text-sm text-muted-foreground">{fmtDate(today.toISOString())}</p>
      </div>

      {isLoading && <p className="text-muted-foreground">Laddar matcher...</p>}

      {!isLoading && (!matches || matches.length === 0) && (
        <div className="rounded-2xl bg-card border border-border p-6 text-center">
          <p className="text-muted-foreground">Inga matcher idag eller imorgon.</p>
        </div>
      )}

      {Object.entries(groups).map(([day, list]) => (
        <section key={day} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {fmtDate(list![0].kickoff)}
          </h2>
          <div className="space-y-2">
            {list!.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
