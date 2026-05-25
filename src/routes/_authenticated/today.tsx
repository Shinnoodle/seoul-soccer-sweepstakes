import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
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
        <div className="mt-2 pt-3 border-t border-border space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Tippstatus</span>
            <span className="ml-auto rounded-full bg-success/15 text-success px-2 py-0.5">{done.length} klara</span>
            {missing.length > 0 && (
              <span className="rounded-full bg-warning/15 text-warning px-2 py-0.5">{missing.length} kvar</span>
            )}
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">✅ </span>
            <span className="text-foreground">{done.map(p => p.display_name).join(", ") || "—"}</span>
          </div>
          {missing.length > 0 && (
            <div className="text-sm">
              <span className="text-warning">⏳ </span>
              <span className="text-warning font-medium">{missing.map(p => p.display_name).join(", ")}</span>
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
  const qc = useQueryClient();
  const today = new Date();
  const todayKey = seDayKey(today.toISOString());
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
  }, []);

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
        .in("match_id", matchIds);
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
        .in("match_id", lockedIds);
      if (error) throw error;
      return data;
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

      {matches?.map(m => {
        const ownPick = ownPicksBulk
          ? (ownPicksBulk.find(p => p.match_id === m.id) ?? null)
          : undefined;
        const matchAllPicks = allPicksBulk?.filter(p => p.match_id === m.id);
        const jokerCount = ownPicksBulk?.filter(p => p.joker).length;
        return (
          <section key={m.id}>
            <MatchCard
              match={m}
              userId={userId}
              ownPick={ownPick}
              allMatchPicks={matchAllPicks}
              jokerCount={jokerCount}
              onPickSaved={() => {
                qc.invalidateQueries({ queryKey: ["own-picks-bulk", userId, matchIdsKey] });
              }}
            />
          </section>
        );
      })}
    </div>
  );
}
