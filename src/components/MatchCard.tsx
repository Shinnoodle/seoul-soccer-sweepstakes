import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmtTime, stageLabel, cn } from "@/lib/utils";
import { TeamFlag } from "@/lib/teamFlags";
import { Star } from "lucide-react";

type PickRow = { user_id: string; home_score: number; away_score: number; joker: boolean };

type AllPicksPanelProps = {
  picks: PickRow[];
  match: { finished: boolean; home_score: number | null; away_score: number | null };
  nameOf: (uid: string) => string;
};

function AllPicksPanel({ picks, match, nameOf }: AllPicksPanelProps) {
  const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);
  const finished = match.finished && match.home_score !== null && match.away_score !== null;
  const actualSign = finished ? sign(match.home_score! - match.away_score!) : null;

  type Tier = 0 | 1 | 2; // 0=exact, 1=correct, 2=wrong
  const tier = (p: PickRow): Tier => {
    if (!finished) return 2;
    const exact = p.home_score === match.home_score && p.away_score === match.away_score;
    if (exact) return 0;
    if (sign(p.home_score - p.away_score) === actualSign) return 1;
    return 2;
  };

  const sorted = finished ? [...picks].sort((a, b) => tier(a) - tier(b)) : picks;

  // Outcome distribution
  const homeWins = picks.filter(p => sign(p.home_score - p.away_score) === 1).length;
  const draws = picks.filter(p => sign(p.home_score - p.away_score) === 0).length;
  const awayWins = picks.filter(p => sign(p.home_score - p.away_score) === -1).length;
  const total = picks.length;

  const pct = (n: number) => Math.round((n / total) * 100);

  const segColors = {
    home: actualSign === 1 ? "bg-success" : "bg-muted-foreground/40",
    draw: actualSign === 0 ? "bg-success" : "bg-muted-foreground/40",
    away: actualSign === -1 ? "bg-success" : "bg-muted-foreground/40",
  };

  return (
    <div className="mt-2 pt-2 border-t border-border space-y-2">
      {/* Distribution bar */}
      <div className="space-y-1">
        <div className="flex rounded-full overflow-hidden h-2 gap-0.5">
          {homeWins > 0 && <div className={cn("h-full transition-all", segColors.home)} style={{ width: `${pct(homeWins)}%` }} />}
          {draws > 0 && <div className={cn("h-full transition-all", segColors.draw)} style={{ width: `${pct(draws)}%` }} />}
          {awayWins > 0 && <div className={cn("h-full transition-all", segColors.away)} style={{ width: `${pct(awayWins)}%` }} />}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Hemma {homeWins} ({pct(homeWins)}%)</span>
          <span>Oavgjort {draws} ({pct(draws)}%)</span>
          <span>Borta {awayWins} ({pct(awayWins)}%)</span>
        </div>
      </div>

      {/* Picks list */}
      <div className="space-y-1">
        {sorted.map(p => {
          const t = tier(p);
          const rowColor = finished
            ? t === 0 ? "text-success" : t === 1 ? "text-warning" : "text-muted-foreground"
            : "";
          return (
            <div key={p.user_id} className={cn("flex items-center justify-between text-sm", rowColor)}>
              <span className="truncate flex items-center gap-1">
                {nameOf(p.user_id)}
                {p.joker && <Star className="size-3 text-primary fill-primary shrink-0" />}
              </span>
              <span className="font-semibold tabular-nums shrink-0 ml-2">
                {p.home_score}–{p.away_score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Match = {
  id: string;
  match_number: number;
  stage: "group" | "r16" | "r8" | "qf" | "sf" | "third" | "final";
  kickoff: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  finished: boolean;
};

type OwnPick = { home_score: number; away_score: number; joker: boolean };

export function MatchCard({
  match,
  userId: propUserId,
  ownPick: propOwnPick,
  allMatchPicks: propAllPicks,
  onPickSaved,
  jokerCount,
  poolMemberIds,
}: {
  match: Match;
  /** Provide from parent to skip per-card getUser() calls */
  userId?: string | null;
  /** Provide from parent bulk fetch. undefined = use internal query; null = confirmed no pick */
  ownPick?: OwnPick | null;
  /** Provide from parent bulk fetch to skip per-card allPicks query */
  allMatchPicks?: PickRow[];
  /** Called after a successful save so parent can refresh its bulk cache */
  onPickSaved?: () => void;
  /** Total saved jokers across all matches — used to enforce the 3-joker limit */
  jokerCount?: number;
  /** When provided, tippstatus and picks are scoped to these user IDs */
  poolMemberIds?: string[];
}) {
  const qc = useQueryClient();

  const [internalUserId, setInternalUserId] = useState<string | null>(null);
  useEffect(() => {
    if (propUserId !== undefined) return;
    supabase.auth.getSession().then(({ data }) => setInternalUserId(data.session?.user.id ?? null));
  }, [propUserId]);
  const userId = propUserId !== undefined ? propUserId : internalUserId;

  const { data: pick } = useQuery({
    queryKey: ["pick", match.id, userId],
    enabled: !!userId && propOwnPick === undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_picks").select("*")
        .eq("user_id", userId!).eq("match_id", match.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const effectivePick: OwnPick | null | undefined =
    propOwnPick !== undefined ? propOwnPick : pick;

  const hasResult = match.home_score !== null && match.away_score !== null;
  const locked = match.finished || hasResult || new Date(match.kickoff) <= new Date();

  const { data: allPicksQuery } = useQuery({
    queryKey: ["all-picks", match.id, locked],
    enabled: locked && propAllPicks === undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_picks")
        .select("user_id,home_score,away_score,joker")
        .eq("match_id", match.id);
      if (error) throw error;
      return data;
    },
  });

  const allPicks = propAllPicks ?? allPicksQuery;

  const { data: profiles } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,display_name");
      if (error) throw error;
      return data;
    },
  });
  const nameOf = (uid: string) => profiles?.find(p => p.id === uid)?.display_name ?? "Okänd";

  const { data: submitterIds } = useQuery({
    queryKey: ["submitters", match.id, locked],
    enabled: !locked,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("picked_user_ids", { _match_id: match.id });
      if (error) throw error;
      return (data ?? []) as unknown as string[];
    },
  });

  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [joker, setJoker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number>(0);

  useEffect(() => {
    if (effectivePick) {
      setHome(effectivePick.home_score.toString());
      setAway(effectivePick.away_score.toString());
      setJoker(effectivePick.joker);
    }
  }, [effectivePick]);

  async function save() {
    if (!userId || home === "" || away === "") return;
    setSaving(true); setErr(null);
    const { error } = await supabase.from("match_picks").upsert({
      user_id: userId,
      match_id: match.id,
      home_score: parseInt(home),
      away_score: parseInt(away),
      joker,
    });
    setSaving(false);
    if (error) setErr(error.message);
    else {
      setSavedAt(Date.now());
      qc.invalidateQueries({ queryKey: ["pick", match.id, userId] });
      qc.invalidateQueries({ queryKey: ["my-picks", userId] });
      qc.invalidateQueries({ queryKey: ["submitters", match.id, locked] });
      onPickSaved?.();
    }
  }

  // result colour for own pick when finished
  let resultBadge: { color: string; label: string } | null = null;
  if (match.finished && effectivePick && effectivePick.home_score !== null) {
    const exact = effectivePick.home_score === match.home_score && effectivePick.away_score === match.away_score;
    const outcome = Math.sign(effectivePick.home_score - effectivePick.away_score) === Math.sign((match.home_score ?? 0) - (match.away_score ?? 0));
    if (exact) resultBadge = { color: "bg-success text-success-foreground", label: "Exakt" };
    else if (outcome) resultBadge = { color: "bg-warning text-warning-foreground", label: "Rätt vinnare" };
    else resultBadge = { color: "bg-destructive text-destructive-foreground", label: "Fel" };
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-3 space-y-2.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>#{match.match_number} · {stageLabel(match.stage)}</span>
        <span>{fmtTime(match.kickoff)}</span>
      </div>

      <div className="flex items-center gap-2 text-base font-semibold">
        <span className="flex-1 text-right truncate flex items-center justify-end gap-1.5">
          <span className="truncate">{match.home_team}</span>
          <TeamFlag name={match.home_team} className="text-xl leading-none shrink-0" />
        </span>
        {hasResult ? (
          <span className="px-2 py-1 rounded-lg bg-background min-w-[60px] text-center">
            {match.home_score}–{match.away_score}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">vs</span>
        )}
        <span className="flex-1 truncate flex items-center gap-1.5">
          <TeamFlag name={match.away_team} className="text-xl leading-none shrink-0" />
          <span className="truncate">{match.away_team}</span>
        </span>
      </div>

      {locked ? (
        <div className="pt-1">
          {effectivePick ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Ditt tips:</span>
              <span className="font-semibold flex items-center gap-2">
                {effectivePick.home_score}–{effectivePick.away_score}
                {effectivePick.joker && <Star className="size-4 text-primary fill-primary" />}
                {resultBadge && (
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full", resultBadge.color)}>
                    {resultBadge.label}
                  </span>
                )}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Inget tips inlämnat – 0p</p>
          )}

          {allPicks && profiles && (() => {
            const knownPicks = allPicks.filter(p =>
              profiles.some(pr => pr.id === p.user_id) &&
              (!poolMemberIds || poolMemberIds.includes(p.user_id))
            );
            return knownPicks.length > 0 && <AllPicksPanel picks={knownPicks} match={match} nameOf={nameOf} />;
          })()}
        </div>
      ) : (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-center gap-2">
            <input
              inputMode="numeric" maxLength={2}
              placeholder="0" value={home}
              onChange={(e) => setHome(e.target.value.replace(/\D/g, ""))}
              className="w-14 rounded-xl bg-input border border-border px-3 py-2 text-center text-lg font-semibold outline-none focus:border-primary"
            />
            <span className="text-muted-foreground">–</span>
            <input
              inputMode="numeric" maxLength={2}
              placeholder="0" value={away}
              onChange={(e) => setAway(e.target.value.replace(/\D/g, ""))}
              className="w-14 rounded-xl bg-input border border-border px-3 py-2 text-center text-lg font-semibold outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setJoker(!joker)}
              disabled={!joker && jokerCount !== undefined && jokerCount >= 3}
              title={!joker && jokerCount !== undefined && jokerCount >= 3 ? "Du har redan använt 3 jokrar" : undefined}
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1 border",
                joker ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground",
                "disabled:opacity-40"
              )}
            >
              <Star className={cn("size-4", joker && "fill-current")} />
              Joker
            </button>
            <button
              onClick={save}
              disabled={saving || home === "" || away === ""}
              className="rounded-xl bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 disabled:opacity-50"
            >
              {saving ? "..." : "Spara"}
            </button>
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
          {savedAt > 0 && !err && <p className="text-xs text-muted-foreground">Sparat ✓</p>}

          {profiles && profiles.length > 0 && submitterIds && (() => {
            const visibleProfiles = poolMemberIds
              ? profiles.filter(p => poolMemberIds.includes(p.id))
              : profiles;
            const done = visibleProfiles.filter(p => submitterIds.includes(p.id));
            const missing = visibleProfiles.filter(p => !submitterIds.includes(p.id));
            return (
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
            );
          })()}
        </div>
      )}
    </div>
  );
}
