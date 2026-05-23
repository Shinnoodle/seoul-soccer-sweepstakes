import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  // long-term form
  const [lt, setLt] = useState({ champion: "", runner_up: "", semi1: "", semi2: "", top_scorer: "" });
  const [savingLt, setSavingLt] = useState(false);
  const [ltMsg, setLtMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tournament_settings").select("*").single();
      if (error) throw error;
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: longterm } = useQuery({
    queryKey: ["longterm", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("long_term_picks").select("*").eq("user_id", userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: myPicks } = useQuery({
    queryKey: ["my-picks", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_picks")
        .select("*, matches(*)")
        .eq("user_id", userId!);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => { if (profile) setDisplayName(profile.display_name); }, [profile]);
  useEffect(() => {
    if (longterm) setLt({
      champion: longterm.champion, runner_up: longterm.runner_up,
      semi1: longterm.semi1, semi2: longterm.semi2, top_scorer: longterm.top_scorer,
    });
  }, [longterm]);

  const started = settings ? new Date(settings.start_at) <= new Date() : false;
  const jokerCount = myPicks?.filter(p => p.joker).length ?? 0;

  async function saveName() {
    if (!userId || displayName.trim().length < 2) return;
    setSavingName(true); setNameMsg(null);
    const { error } = await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("id", userId);
    setSavingName(false);
    if (error) setNameMsg(error.message); else {
      setNameMsg("Sparat!");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    }
  }

  async function saveLt(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSavingLt(true); setLtMsg(null);
    const payload = { user_id: userId, ...lt };
    const { error } = await supabase.from("long_term_picks").upsert(payload);
    setSavingLt(false);
    if (error) setLtMsg(error.message); else {
      setLtMsg("Långtidstips sparade!");
      qc.invalidateQueries({ queryKey: ["longterm"] });
    }
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Min profil</h1>

      <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <h2 className="font-semibold">Namn (visas i leaderboard)</h2>
        <div className="flex gap-2">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            className="flex-1 rounded-xl bg-input border border-border px-3 py-2 outline-none focus:border-primary"
          />
          <button onClick={saveName} disabled={savingName}
            className="rounded-xl bg-primary text-primary-foreground font-semibold px-4 disabled:opacity-50">
            Spara
          </button>
        </div>
        {nameMsg && <p className="text-sm text-muted-foreground">{nameMsg}</p>}
      </section>

      <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Långtidstips</h2>
          {started && <span className="text-xs text-warning">Låst (VM har startat)</span>}
        </div>
        <p className="text-xs text-muted-foreground">
          Vinnare 10p · Finalist 5p · Semifinalist 3p · Skyttekung 5p
        </p>
        <form onSubmit={saveLt} className="space-y-2">
          {[
            ["champion","VM-vinnare"],
            ["runner_up","Finalist"],
            ["semi1","Semifinalist 1"],
            ["semi2","Semifinalist 2"],
            ["top_scorer","Skyttekung"],
          ].map(([key, label]) => (
            <input key={key}
              required maxLength={50}
              placeholder={label}
              value={lt[key as keyof typeof lt]}
              disabled={started}
              onChange={(e) => setLt(prev => ({ ...prev, [key]: e.target.value }))}
              className="w-full rounded-xl bg-input border border-border px-3 py-2 outline-none focus:border-primary disabled:opacity-60"
            />
          ))}
          <button type="submit" disabled={savingLt || started}
            className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-2.5 disabled:opacity-50">
            {savingLt ? "Sparar..." : "Spara"}
          </button>
          {ltMsg && <p className="text-sm text-muted-foreground">{ltMsg}</p>}
        </form>
      </section>

      <section className="rounded-2xl bg-card border border-border p-4 space-y-2">
        <h2 className="font-semibold">Mina jokrar</h2>
        <p className="text-sm text-muted-foreground">
          {jokerCount} / 2 jokrar använda. Sätt joker via knappen på matchkortet (innan avspark).
        </p>
        {myPicks?.filter(p => p.joker).map(p => (
          <div key={p.match_id} className="text-sm flex justify-between">
            <span>{p.matches!.home_team} – {p.matches!.away_team}</span>
            <span className="text-primary font-semibold">★ Joker</span>
          </div>
        ))}
      </section>
    </div>
  );
}
