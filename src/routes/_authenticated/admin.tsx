import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { stageLabel, fmtDate, fmtTime } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate({ to: "/login" }); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (!data?.some(r => r.role === "admin")) { navigate({ to: "/today" }); return; }
      setChecked(true);
    })();
  }, [navigate]);

  const { data: matches } = useQuery({
    queryKey: ["admin-matches"],
    enabled: checked,
    queryFn: async () => {
      const { data, error } = await supabase.from("matches").select("*").order("match_number");
      if (error) throw error;
      return data;
    },
  });

  if (!checked) return <div className="p-6 text-muted-foreground">Kontrollerar behörighet...</div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="text-sm text-muted-foreground">Sätt lagnamn och facit. Spelarnas tips låses automatiskt vid avspark.</p>
      <SettingsBlock onSaved={() => qc.invalidateQueries({ queryKey: ["settings"] })} />
      <div className="space-y-3">
        {matches?.map(m => (
          <AdminMatchRow key={m.id} m={m} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-matches"] })} />
        ))}
      </div>
    </div>
  );
}

function SettingsBlock({ onSaved }: { onSaved: () => void }) {
  const [s, setS] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("tournament_settings").select("*").single().then(({ data }) => setS(data));
  }, []);

  async function save() {
    setMsg(null);
    const { error } = await supabase.from("tournament_settings").update(s).eq("id", 1);
    if (error) setMsg(error.message); else { setMsg("Sparat!"); onSaved(); }
  }

  if (!s) return null;
  return (
    <section className="rounded-2xl bg-card border border-border p-4 space-y-2">
      <h2 className="font-semibold">Turneringsinställningar</h2>
      <label className="text-xs text-muted-foreground">VM-start (låser långtidstips)</label>
      <input type="datetime-local"
        value={s.start_at?.slice(0,16) ?? ""}
        onChange={(e) => setS({ ...s, start_at: e.target.value })}
        className="w-full rounded-xl bg-input border border-border px-3 py-2" />
      <div className="grid grid-cols-1 gap-2 mt-2">
        {[
          ["actual_champion","Verklig vinnare"],
          ["actual_runner_up","Verklig finalist"],
          ["actual_semi1","Semifinalist 1"],
          ["actual_semi2","Semifinalist 2"],
          ["actual_top_scorer","Skyttekung"],
        ].map(([k,l]) => (
          <input key={k} placeholder={l}
            value={s[k] ?? ""}
            onChange={(e) => setS({ ...s, [k]: e.target.value || null })}
            className="rounded-xl bg-input border border-border px-3 py-2" />
        ))}
      </div>
      <button onClick={save} className="rounded-xl bg-primary text-primary-foreground font-semibold py-2 px-4 mt-2">
        Spara
      </button>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </section>
  );
}

function AdminMatchRow({ m, onSaved }: { m: any; onSaved: () => void }) {
  const [home, setHome] = useState(m.home_team);
  const [away, setAway] = useState(m.away_team);
  const [hs, setHs] = useState<string>(m.home_score?.toString() ?? "");
  const [as_, setAs] = useState<string>(m.away_score?.toString() ?? "");
  const [finished, setFinished] = useState<boolean>(m.finished);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const payload: any = {
      home_team: home, away_team: away, finished,
      home_score: hs === "" ? null : parseInt(hs),
      away_score: as_ === "" ? null : parseInt(as_),
    };
    const { error } = await supabase.from("matches").update(payload).eq("id", m.id);
    setSaving(false);
    if (error) alert(error.message); else onSaved();
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-3 space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>#{m.match_number} · {stageLabel(m.stage)}</span>
        <span>{fmtDate(m.kickoff)} {fmtTime(m.kickoff)}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] gap-2 items-center">
        <input value={home} onChange={(e) => setHome(e.target.value)}
          className="rounded-lg bg-input border border-border px-2 py-1.5 text-sm" />
        <input value={hs} onChange={(e) => setHs(e.target.value.replace(/\D/g,""))}
          inputMode="numeric" maxLength={2}
          className="w-10 rounded-lg bg-input border border-border px-2 py-1.5 text-center text-sm" />
        <span className="text-muted-foreground">–</span>
        <input value={as_} onChange={(e) => setAs(e.target.value.replace(/\D/g,""))}
          inputMode="numeric" maxLength={2}
          className="w-10 rounded-lg bg-input border border-border px-2 py-1.5 text-center text-sm" />
        <input value={away} onChange={(e) => setAway(e.target.value)}
          className="rounded-lg bg-input border border-border px-2 py-1.5 text-sm" />
      </div>
      <div className="flex items-center justify-between">
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={finished} onChange={(e) => setFinished(e.target.checked)} />
          Klar (räkna poäng)
        </label>
        <button onClick={save} disabled={saving}
          className="rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-3 py-1.5 disabled:opacity-50">
          {saving ? "..." : "Spara"}
        </button>
      </div>
    </div>
  );
}
