import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MatchCard } from "@/components/MatchCard";
import { fmtDate, fmtTime, stageLabel, seDayKey, cn } from "@/lib/utils";
import { Star } from "lucide-react";

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
  if (!countdown) return null;
  return (
    <div className="rounded-2xl bg-card border border-border p-5 text-center space-y-3">
      <p className="text-sm font-semibold">⚽ Nästa match om</p>
      <div className="flex justify-center gap-5">
        <CountdownUnit value={countdown.days} label="dagar" />
        <CountdownUnit value={countdown.hours} label="tim" />
        <CountdownUnit value={countdown.minutes} label="min" />
        <CountdownUnit value={countdown.seconds} label="sek" />
      </div>
      <p className="text-xs text-muted-foreground">
        {match.home_team} 🆚 {match.away_team} · {fmtDate(match.kickoff)} {fmtTime(match.kickoff)}
      </p>
    </div>
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

  const matchIds = matches?.map(m => m.id) ?? [];

  const { data: picks } = useQuery({
    queryKey: ["picks-today", todayKey, matchIds.join(",")],
    enabled: matchIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_picks")
        .select("match_id,user_id,home_score,away_score,joker")
        .in("match_id", matchIds);
      if (error) throw error;
      return data;
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

  const nameOf = (uid: string) =>
    profiles?.find(p => p.id === uid)?.display_name ?? "Okänd";

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

      {matches?.map(m => {
        const kickoffPassed = new Date(m.kickoff) <= new Date();
        const matchPicks = (picks ?? []).filter(p => p.match_id === m.id);

        return (
          <section key={m.id} className="space-y-2">
            {!kickoffPassed ? (
              <MatchCard match={m} />
            ) : (
              <div className="rounded-2xl bg-card border border-border p-3 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>#{m.match_number} · {stageLabel(m.stage)}</span>
                  <span>{fmtTime(m.kickoff)}</span>
                </div>
                <div className="flex items-center gap-2 text-base font-semibold">
                  <span className="flex-1 text-right truncate">{m.home_team}</span>
                  {m.finished ? (
                    <span className="px-2 py-1 rounded-lg bg-background min-w-[60px] text-center">
                      {m.home_score}–{m.away_score}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-lg bg-background text-sm text-muted-foreground">pågår</span>
                  )}
                  <span className="flex-1 truncate">{m.away_team}</span>
                </div>

                <div className="border-t border-border pt-2 space-y-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    Tips ({matchPicks.length})
                  </div>
                  {matchPicks.length === 0 && (
                    <p className="text-xs text-muted-foreground">Inga tips inlämnade.</p>
                  )}
                  {matchPicks.map(p => {
                    let badge: { color: string; label: string } | null = null;
                    if (m.finished && m.home_score !== null && m.away_score !== null) {
                      const exact = p.home_score === m.home_score && p.away_score === m.away_score;
                      const outcome = Math.sign(p.home_score - p.away_score) === Math.sign(m.home_score - m.away_score);
                      if (exact) badge = { color: "bg-success text-success-foreground", label: "🟩" };
                      else if (outcome) badge = { color: "bg-warning text-warning-foreground", label: "🟨" };
                      else badge = { color: "bg-destructive text-destructive-foreground", label: "🟥" };
                    }
                    return (
                      <div key={p.user_id} className="flex items-center justify-between text-sm py-1">
                        <span className="truncate flex items-center gap-1.5">
                          {nameOf(p.user_id)}
                          {p.joker && <Star className="size-3.5 text-primary fill-primary" />}
                        </span>
                        <span className="font-semibold flex items-center gap-2">
                          {p.home_score}–{p.away_score}
                          {badge && (
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", badge.color)}>
                              {badge.label}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
