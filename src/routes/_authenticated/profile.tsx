import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WC_GROUPS } from "@/lib/wcGroups";
import { teamFlag, TeamFlag } from "@/lib/teamFlags";


export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

const VALID_TEAMS = new Set(
  WC_GROUPS.flatMap(g => [...g.teams, ...g.teamsEn]).map(t => t.toLowerCase())
);

function isValidTeam(name: string) {
  return !name.trim() || VALID_TEAMS.has(name.trim().toLowerCase());
}

function ProfilePage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  // long-term form
  const [lt, setLt] = useState({ champion: "", runner_up: "", semi1: "", semi2: "", top_scorer: "" });
  const [savingLt, setSavingLt] = useState(false);
  const [ltMsg, setLtMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUserId(data.session.user.id);
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

  // r16: { [letter]: { 1?: team, 2?: team, 3?: team } }
  const [r16, setR16] = useState<Record<string, { 1?: string; 2?: string; 3?: string }>>({});
  const [savingR16, setSavingR16] = useState(false);
  const [r16Msg, setR16Msg] = useState<string | null>(null);

  const { data: r16Rows } = useQuery({
    queryKey: ["r16", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("r16_picks").select("*").eq("user_id", userId!);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!r16Rows) return;
    const map: Record<string, { 1?: string; 2?: string; 3?: string }> = {};
    for (const r of r16Rows) {
      map[r.group_letter] ??= {};
      map[r.group_letter][r.position as 1 | 2 | 3] = r.team_name;
    }
    setR16(map);
  }, [r16Rows]);

  const r16Done = useMemo(
    () => WC_GROUPS.filter(g => r16[g.letter]?.[1] && r16[g.letter]?.[2] && r16[g.letter]?.[3]).length,
    [r16]
  );
  const teamsSelected = useMemo(
    () => Object.values(r16).reduce((sum, g) => {
      return sum + ([1, 2, 3] as const).filter(p => g[p]).length;
    }, 0),
    [r16]
  );

  const thirdsSelected = useMemo(
    () => Object.values(r16).filter(g => g[3]).length,
    [r16]
  );

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setFullName(profile.full_name ?? "");
    }
  }, [profile]);
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
    const { error } = await supabase.from("profiles").update({
      display_name: displayName.trim(),
      full_name: fullName.trim() || null,
    }).eq("id", userId);
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
      setLtMsg("Turneringstips sparade!");
      qc.invalidateQueries({ queryKey: ["longterm"] });
      qc.invalidateQueries({ queryKey: ["all-longterm"] });
    }
  }

function pickTeam(letter: string, team: string, pos: 1 | 2 | 3) {
    setR16(prev => {
      const cur = { ...(prev[letter] ?? {}) };
      
      // om laget redan är valt på den positionen, avmarkera det
      if (cur[pos] === team) { 
        delete cur[pos]; 
        return { ...prev, [letter]: cur }; 
      }

      // räkna totalt antal valda lag (exkl. eventuell befintlig på denna position i denna grupp)
      const currentTotal = Object.entries(prev).reduce((sum, [l, g]) => {
        return sum + ([1, 2, 3] as const).filter(p => {
          if (l === letter && p === pos) return false; // ignorera positionen vi håller på att fylla
          return !!g[p];
        }).length;
      }, 0);

      // blockera om vi redan har 32 lag
      if (currentTotal >= 32) return prev;

      // blockera om vi redan har 8 tredjeplatser och försöker lägga till en ny (inte ersätta befintlig)
      if (pos === 3) {
        const otherThirds = Object.entries(prev).reduce((sum, [l, g]) => {
          if (l === letter) return sum;
          return sum + (g[3] ? 1 : 0);
        }, 0);
        if (otherThirds >= 8 && !cur[3]) return prev;
      }

      // ta bort laget från andra positioner i samma grupp
      ([1, 2, 3] as const).forEach(p => { if (p !== pos && cur[p] === team) delete cur[p]; });
      cur[pos] = team;
      return { ...prev, [letter]: cur };
    });
  }

  async function saveR16() {
    if (!userId) return;
    setSavingR16(true); setR16Msg(null);
    const rows: { user_id: string; group_letter: string; team_name: string; position: number }[] = [];
    for (const g of WC_GROUPS) {
      const sel = r16[g.letter];
      ([1, 2, 3] as const).forEach(p => {
        if (sel?.[p]) rows.push({ user_id: userId, group_letter: g.letter, team_name: sel[p]!, position: p });
      });
    }
    // ersätt alla
    const del = await supabase.from("r16_picks").delete().eq("user_id", userId);
    if (del.error) { setSavingR16(false); setR16Msg(del.error.message); return; }
    if (rows.length) {
      const ins = await supabase.from("r16_picks").insert(rows);
      if (ins.error) { setSavingR16(false); setR16Msg(ins.error.message); return; }
    }
    setSavingR16(false);
    setR16Msg("Sextondelstips sparade!");
    qc.invalidateQueries({ queryKey: ["r16"] });
  }


  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Turnering</h1>

      {!started && (
        <div className="rounded-2xl border border-warning/40 bg-warning/5 p-4 text-sm text-warning">
          Turneringstips och slutspelslag låses när VM startar. Se till att spara dina val innan dess!
        </div>
      )}

      <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <h2 className="font-semibold">Profil</h2>
        <div className="space-y-2">
          <label className="block text-xs text-muted-foreground">Visningsnamn (syns i leaderboard)</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            className="w-full rounded-xl bg-input border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-xs text-muted-foreground">Fullständigt namn (syns när någon öppnar din profil)</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={80}
            placeholder="Förnamn Efternamn"
            className="w-full rounded-xl bg-input border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </div>
        <button onClick={saveName} disabled={savingName}
          className="rounded-xl bg-primary text-primary-foreground font-semibold px-4 py-2 disabled:opacity-50">
          {savingName ? "Sparar..." : "Spara"}
        </button>
        {nameMsg && <p className="text-sm text-muted-foreground">{nameMsg}</p>}
      </section>

      <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Turneringstips</h2>
          {started && <span className="text-xs text-warning">Låst (VM har startat)</span>}
        </div>
        <p className="text-xs text-muted-foreground">
          Vinnare 10p · Finalist 5p · Semifinalist 3p/st · Skyttekung 5p
        </p>

        {longterm && (
          <div className="rounded-xl border border-success/40 bg-success/5 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-success">Sparat tips</p>
              <span className="ml-auto text-xs text-success">✓</span>
            </div>
            {([
              ["🏆", "VM-vinnare", longterm.champion, true],
              ["🥈", "Finalist", longterm.runner_up, true],
              ["🥉", "Semifinalist 1", longterm.semi1, true],
              ["🥉", "Semifinalist 2", longterm.semi2, true],
              ["⚽", "Skyttekung", longterm.top_scorer, false],
            ] as [string, string, string, boolean][]).map(([icon, label, value, showFlag]) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-center">{icon}</span>
                <span className="text-muted-foreground w-28 shrink-0">{label}</span>
                <span className="font-semibold truncate">
                  {value ? <>{showFlag && <TeamFlag name={value} />} {value}</> : "—"}
                </span>
              </div>
            ))}
          </div>
        )}

        {!started && (
          <>
            {longterm && (
              <p className="text-xs text-muted-foreground pt-1 border-t border-border">Ändra ditt tips nedan</p>
            )}
            <div className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground">
              Du sätter <strong className="text-foreground">4 lag i semifinal</strong>: VM-vinnaren, finalisten
              (förloraren i finalen) och de <strong className="text-foreground">2 lag som åker ut i semifinal</strong>.
            </div>
            <form onSubmit={saveLt} className="space-y-2">
              {[
                ["champion","🏆 VM-vinnare", true],
                ["runner_up","🥈 Finalist (förlorare i finalen)", true],
                ["semi1","🥉 Semifinalist 1 (åker ut i semi)", true],
                ["semi2","🥉 Semifinalist 2 (åker ut i semi)", true],
                ["top_scorer","⚽ Skyttekung", false],
              ].map(([key, label, isTeam]) => {
                const val = lt[key as keyof typeof lt];
                const invalid = isTeam && val.trim() !== "" && !isValidTeam(val);
                return (
                  <div key={key} className="space-y-0.5">
                    <input
                      required maxLength={50}
                      placeholder={label as string}
                      value={val}
                      onChange={(e) => setLt(prev => ({ ...prev, [key]: e.target.value }))}
                      className={`w-full rounded-xl bg-input border px-3 py-2 outline-none focus:border-primary ${invalid ? "border-destructive" : "border-border"}`}
                    />
                    {invalid && (
                      <p className="text-xs text-destructive px-1">Laget är inte med i VM</p>
                    )}
                  </div>
                );
              })}
              <button type="submit"
                disabled={savingLt}
                className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-2.5 disabled:opacity-50">
                {savingLt ? "Sparar..." : longterm ? "Uppdatera" : "Spara"}
              </button>
              {ltMsg && <p className="text-sm text-muted-foreground">{ltMsg}</p>}
            </form>
          </>
        )}
      </section>

      <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Slutspelslag</h2>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className={thirdsSelected === 8 ? "text-primary" : "text-muted-foreground"}>
              {thirdsSelected}/8 tredjor
            </span>
            <span className="text-border">·</span>
            <span className={teamsSelected === 32 ? "text-primary" : "text-muted-foreground"}>
              {teamsSelected}/32 lag
            </span>
          </div>
        </div>
<p className="text-xs text-muted-foreground">
          Markera per grupp: <strong className="text-foreground">👑 gruppvinnare</strong>, <strong className="text-foreground">2:a</strong> och <strong className="text-foreground">3:a</strong>.
        </p>
        <div className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground space-y-1">
          <p>32 lag går till slutspelet: <strong className="text-foreground">1:a och 2:a från alla 12 grupper</strong> (24 lag) + <strong className="text-foreground">8 bästa 3:orna</strong> — inte alla 12!</p>
          <p>Poäng: 2p per rätt lag · +1p bonus om gruppvinnaren stämmer · +1p bonus om 3:an stämmer.</p>
        </div>
        {started && <p className="text-xs text-warning">Låst (VM har startat)</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WC_GROUPS.map(g => {
            const sel = r16[g.letter] ?? {};
            return (
              <div key={g.letter} className="rounded-xl border border-border bg-background/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-bold uppercase tracking-wide ${g.color}`}>Grupp {g.letter}</p>
                  <div className="flex gap-2 text-[10px] text-muted-foreground">
                    <span>👑 1:a</span><span>2:a</span><span>3:a</span>
                  </div>
                </div>
                {g.teams.map(t => {
                  const isFirst = sel[1] === t;
                  const isSecond = sel[2] === t;
                  const isThird = sel[3] === t;
                  const btn = (pos: 1 | 2 | 3, active: boolean, label: string, activeCls: string) => (
                    <button
                      type="button"
                      disabled={started}
                      onClick={() => pickTeam(g.letter, t, pos)}
                      className={`h-8 w-8 rounded-lg border text-sm font-bold transition ${
                        active ? activeCls : "border-border text-muted-foreground hover:border-primary"
                      } disabled:opacity-50`}
                      aria-label={`Position ${pos}`}
                    >{label}</button>
                  );
                  return (
                    <div key={t} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-sm min-w-0">
                        <TeamFlag name={t} />
                        <span className="truncate">{t}</span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {btn(1, isFirst, "👑", "bg-amber-500/20 text-amber-400 border-amber-400/70")}
                        {btn(2, isSecond, "2", "bg-slate-400/20 text-slate-300 border-slate-400/70")}
                        {btn(3, isThird, "3", "bg-orange-700/20 text-orange-500 border-orange-600/70")}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>


        <button
          onClick={saveR16}
          disabled={savingR16 || started}
          className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-2.5 disabled:opacity-50"
        >
  {savingR16 ? "Sparar..." : "Spara slutspelslag"}
        </button>
        {r16Msg && <p className="text-sm text-muted-foreground">{r16Msg}</p>}
      </section>


      <section className="rounded-2xl bg-card border border-border p-4 space-y-2">
        <h2 className="font-semibold">Mina jokrar</h2>
        <p className="text-sm text-muted-foreground">
          {jokerCount} / 3 jokrar använda. Sätt joker via knappen på matchkortet (innan avspark).
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
