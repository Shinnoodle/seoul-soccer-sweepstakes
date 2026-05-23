import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmtTime, stageLabel, cn } from "@/lib/utils";
import { Star } from "lucide-react";

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

export function MatchCard({ match }: { match: Match }) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);

  const { data: pick } = useQuery({
    queryKey: ["pick", match.id, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_picks").select("*")
        .eq("user_id", userId!).eq("match_id", match.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const locked = new Date(match.kickoff) <= new Date();

  const { data: allPicks } = useQuery({
    queryKey: ["all-picks", match.id, locked],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_picks")
        .select("user_id,home_score,away_score,joker")
        .eq("match_id", match.id);
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
  const nameOf = (uid: string) => profiles?.find(p => p.id === uid)?.display_name ?? "Okänd";

  const { data: submitterIds } = useQuery({
    queryKey: ["submitters", match.id, locked, savedAtTrigger],
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
    if (pick) {
      setHome(pick.home_score.toString());
      setAway(pick.away_score.toString());
      setJoker(pick.joker);
    }
  }, [pick]);

  // `locked` already declared above

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
    }
  }

  // result colour for own pick when finished
  let resultBadge: { color: string; label: string } | null = null;
  if (match.finished && pick && pick.home_score !== null) {
    const exact = pick.home_score === match.home_score && pick.away_score === match.away_score;
    const outcome = Math.sign(pick.home_score - pick.away_score) === Math.sign((match.home_score ?? 0) - (match.away_score ?? 0));
    if (exact) resultBadge = { color: "bg-success text-success-foreground", label: "🟩 Exakt" };
    else if (outcome) resultBadge = { color: "bg-warning text-warning-foreground", label: "🟨 Rätt vinnare" };
    else resultBadge = { color: "bg-destructive text-destructive-foreground", label: "🟥 Fel" };
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-3 space-y-2.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>#{match.match_number} · {stageLabel(match.stage)}</span>
        <span>{fmtTime(match.kickoff)}</span>
      </div>

      <div className="flex items-center gap-2 text-base font-semibold">
        <span className="flex-1 text-right truncate">{match.home_team}</span>
        {match.finished ? (
          <span className="px-2 py-1 rounded-lg bg-background min-w-[60px] text-center">
            {match.home_score}–{match.away_score}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">vs</span>
        )}
        <span className="flex-1 truncate">{match.away_team}</span>
      </div>

      {locked ? (
        <div className="pt-1">
          {pick ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Ditt tips:</span>
              <span className="font-semibold flex items-center gap-2">
                {pick.home_score}–{pick.away_score}
                {pick.joker && <Star className="size-4 text-primary fill-primary" />}
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

          {allPicks && allPicks.length > 0 && (
            <details className="mt-2 group">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground select-none">
                Allas tips ({allPicks.length}) ▾
              </summary>
              <div className="mt-2 space-y-1 border-t border-border pt-2">
                {allPicks.map(p => {
                  let badge: { color: string; label: string } | null = null;
                  if (match.finished && match.home_score !== null && match.away_score !== null) {
                    const exact = p.home_score === match.home_score && p.away_score === match.away_score;
                    const outcome = Math.sign(p.home_score - p.away_score) === Math.sign(match.home_score - match.away_score);
                    if (exact) badge = { color: "bg-success text-success-foreground", label: "🟩" };
                    else if (outcome) badge = { color: "bg-warning text-warning-foreground", label: "🟨" };
                    else badge = { color: "bg-destructive text-destructive-foreground", label: "🟥" };
                  }
                  return (
                    <div key={p.user_id} className="flex items-center justify-between text-sm">
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
            </details>
          )}
        </div>
      ) : (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
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
            <button
              onClick={() => setJoker(!joker)}
              className={cn(
                "ml-auto rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1 border",
                joker ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
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
        </div>
      )}
    </div>
  );
}
