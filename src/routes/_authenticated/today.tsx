import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MatchCard } from "@/components/MatchCard";
import { fmtDate, fmtTime, seDayKey } from "@/lib/utils";
import { teamFlag } from "@/lib/teamFlags";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/today")({
  component: TodayPage,
});

type Match = {
  id: string;
  match_number: number;
  stage: "group" | "r16" | "qf" | "sf" | "third" | "final";
  kickoff: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  finished: boolean;
};

function useCountdown(target: Date | null) {
  const [diff, setDiff] = useState(() => target ? target.getTime() - Date.now() : null);
  useEffect(() => {
    if (!target) return;
    setDiff(target.getTime() - Date.now());
    const interval = setInterval(() => setDiff(target.getTime() - Date.now()), 1000);
    return () => clearInterval(interval);
  }, [target]);
  if (diff === null || diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl font-bold tabular-nums text-primary">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  );
}

function NextMatchCountdown({ match }: { match: Match }) {
  const countdown = useCountdown(new Date(match.kickoff));

  const { data: submitterIds } = useQuery({
    queryKey: ["submitters", match.id, false],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("picked_user_ids", { _match_id: match.id });
      if (error) throw error;
      return (data ?? []) as unknown as string[];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,display_name");
      if (error) throw error;
      return data;
    },
  });

  if (!countdown) return null;
  const done = profiles?.filter(p => submitterIds?.includes(p.id)) ?? [];
  const missing = profiles?.filter(p => !submitterIds?.includes(p.id)) ?? [];

  return (
  <>
    {/* Match- och nedräkningskort */}
    <div className="rounded-2xl bg-card border border-border p-5 space-y-3">
      <p className="text-sm font-semibold text-center">⚽ Nästa match om</p>
      <div className="flex justify-center gap-5">
        <CountdownUnit value={countdown.days} label="dagar" />
        <CountdownUnit value={countdown.hours} label="tim" />
        <CountdownUnit value={countdown.minutes} label="min" />
        <CountdownUnit value={countdown.seconds} label="sek" />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {teamFlag(match.home_team)} {match.home_team} 🆚 {match.away_team} {teamFlag(match.away_team)} · {fmtDate(match.kickoff)} {fmtTime(match.kickoff)}
      </p>
      {profiles && profiles.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border text-xs space-y-1">
          <div className="flex items-start gap-1.5">
            <span className="text-muted-foreground shrink-0">Tippat ({done.length}):</span>
            <span className="text-foreground">{done.map(p => p.display_name).join(", ") || "—"}</span>
          </div>
          {missing.length > 0 && (
            <div className="flex items-start gap-1.5">
              <span className="text-warning shrink-0">Saknas ({missing.length}):</span>
              <span className="text-warning">{missing.map(p => p.display_name).join(", ")}</span>
            </div>
          )}
        </div>
      )}
    </div>

    {/* Länk till VM-trädet */}
    <div className="rounded-2xl bg-card border border-border p-5">
      <Link
        to="/bracket"
        className="flex items-center justify-between w-full text-sm font-semibold hover:text-accent transition-colors"
      >
        <span>🏆 Se VM-trädet 🪾</span>
        <span className="text-muted-foreground text-xs">→</span>
      </Link>
    </div>
  </>
);

}

function TodayPage() {
  const today = new Date();
  const todayKey = seDayKey(today.toISOString());

  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches", "today", todayKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches").select("*").order("kickoff");
      if (error) throw error;
      return (data as Match[]).filter(m => seDayKey(m.kickoff) === todayKey);
    },
  });

  const { data: nextMatch } = useQuery({
    queryKey: ["next-match"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .gt("kickoff", new Date().toISOString())
        .order("kickoff")
        .limit(1)
        .single();
      if (error) return null;
      return data as Match;
    },
  });

  const noMatchesToday = !isLoading && (!matches || matches.length === 0);

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Idag</h1>
        <p className="text-sm text-muted-foreground">{fmtDate(today.toISOString())}</p>
      </div>

      {noMatchesToday && nextMatch && <NextMatchCountdown match={nextMatch} />}

      {isLoading && <p className="text-muted-foreground">Laddar matcher...</p>}

      {noMatchesToday && !nextMatch && (
        <div className="rounded-2xl bg-card border border-border p-6 text-center">
          <p className="text-muted-foreground">Inga fler matcher.</p>
        </div>
      )}

      {matches?.map(m => (
        <section key={m.id}>
          <MatchCard match={m} />
        </section>
      ))}
    </div>
  );
}
