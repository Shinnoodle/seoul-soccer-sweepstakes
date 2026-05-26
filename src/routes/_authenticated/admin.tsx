import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { stageLabel, fmtDate, fmtTime } from "@/lib/utils";
import { WC_GROUPS } from "@/lib/wcGroups";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
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
      <p className="text-sm text-muted-foreground">Godkänn spelare, sätt lagnamn och facit. Spelarnas tips låses automatiskt vid avspark.</p>
      <ApprovalsBlock />
      <PoolsBlock />
      <SettingsBlock onSaved={() => qc.invalidateQueries({ queryKey: ["settings"] })} />
      <GroupActualsBlock />
      <div className="space-y-3">
        {matches?.map(m => (
          <AdminMatchRow key={m.id} m={m} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-matches"] })} />
        ))}
      </div>
    </div>
  );
}

function ApprovalsBlock() {
  const qc = useQueryClient();
  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, approved, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function toggle(id: string, approved: boolean) {
    const { error } = await supabase.from("profiles").update({ approved }).eq("id", id);
    if (error) alert(error.message);
    else qc.invalidateQueries({ queryKey: ["admin-profiles"] });
  }

  const pending = profiles?.filter(p => !p.approved) ?? [];
  const approved = profiles?.filter(p => p.approved) ?? [];

  return (
    <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
      <h2 className="font-semibold">Godkänn spelare</h2>
      <p className="text-xs text-muted-foreground">Endast godkända spelare syns på topplistan och kan skriva i chatten.</p>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Väntar på godkännande ({pending.length})
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Inga väntande spelare.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map(p => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border border-border p-2">
                <span className="text-sm">{p.display_name}</span>
                <button onClick={() => toggle(p.id, true)}
                  className="rounded-lg bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5">
                  Godkänn
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <details>
        <summary className="text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer">
          Godkända ({approved.length})
        </summary>
        <ul className="space-y-2 mt-2">
          {approved.map(p => (
            <li key={p.id} className="flex items-center justify-between rounded-lg border border-border p-2">
              <span className="text-sm">{p.display_name}</span>
              <button onClick={() => toggle(p.id, false)}
                className="rounded-lg border border-border text-xs px-3 py-1.5 hover:bg-muted">
                Återkalla
              </button>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function PoolRow({
  pool, members, profiles, baseUrl,
  onRemoveMember, onAddMember, onRename, onDelete,
}: {
  pool: { id: string; name: string; invite_code: string | null };
  members: { pool_id: string; user_id: string }[] | undefined;
  profiles: { id: string; display_name: string }[] | undefined;
  baseUrl: string;
  onRemoveMember: (poolId: string, userId: string) => void;
  onAddMember: (poolId: string, userId: string) => void;
  onRename: (poolId: string, name: string) => void;
  onDelete: (poolId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(pool.name);

  const poolMembers = members?.filter(m => m.pool_id === pool.id) ?? [];
  const nonMembers = profiles?.filter(p => !poolMembers.some(m => m.user_id === p.id)) ?? [];
  const nameOf = (uid: string) => profiles?.find(p => p.id === uid)?.display_name ?? "Okänd";
  const inviteUrl = pool.invite_code ? `${baseUrl}/join/${pool.invite_code}` : null;

  return (
    <div className="rounded-xl border border-border p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="flex-1 rounded-lg bg-input border border-border px-2 py-1 text-sm"
              autoFocus
            />
            <button
              onClick={() => { onRename(pool.id, editName); setEditing(false); }}
              disabled={!editName.trim()}
              className="text-xs text-primary font-semibold disabled:opacity-40"
            >
              Spara
            </button>
            <button
              onClick={() => { setEditing(false); setEditName(pool.name); }}
              className="text-xs text-muted-foreground"
            >
              Avbryt
            </button>
          </>
        ) : (
          <>
            <p className="font-semibold text-sm flex-1">{pool.name}</p>
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Byt namn
            </button>
            <button
              onClick={() => onDelete(pool.id)}
              className="text-xs text-destructive hover:underline"
            >
              Radera
            </button>
          </>
        )}
      </div>

      {/* Invite URL */}
      {inviteUrl && (
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
          <p className="text-xs text-muted-foreground flex-1 truncate">{inviteUrl}</p>
          <button
            onClick={() => navigator.clipboard.writeText(inviteUrl)}
            className="text-xs text-primary font-semibold shrink-0"
          >
            Kopiera
          </button>
        </div>
      )}

      {/* Collapsible members */}
      <details>
        <summary className="text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer select-none">
          Medlemmar ({poolMembers.length})
        </summary>
        <div className="mt-2 space-y-1">
          {poolMembers.map(m => (
            <div key={m.user_id} className="flex items-center justify-between text-sm py-1">
              <span>{nameOf(m.user_id)}</span>
              <button
                onClick={() => onRemoveMember(pool.id, m.user_id)}
                className="text-xs text-destructive hover:underline"
              >
                Ta bort
              </button>
            </div>
          ))}
          {poolMembers.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Inga medlemmar ännu.</p>
          )}
        </div>
      </details>

      {/* Collapsible add members */}
      {nonMembers.length > 0 && (
        <details>
          <summary className="text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer select-none">
            Lägg till ({nonMembers.length})
          </summary>
          <div className="mt-2 space-y-1">
            {nonMembers.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm py-1">
                <span>{p.display_name}</span>
                <button
                  onClick={() => onAddMember(pool.id, p.id)}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Lägg till
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function PoolsBlock() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { data: pools } = useQuery({
    queryKey: ["admin-pools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pools")
        .select("id, name, invite_code")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, display_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["admin-pool-members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pool_members").select("pool_id, user_id");
      if (error) throw error;
      return data;
    },
  });

  async function createPool() {
    if (!newName.trim()) return;
    setSaving(true); setMsg(null);
    const { error } = await supabase.from("pools").insert({ name: newName.trim() });
    setSaving(false);
    if (error) setMsg(error.message);
    else {
      setNewName("");
      setMsg("Pool skapad!");
      qc.invalidateQueries({ queryKey: ["admin-pools"] });
    }
  }

  async function renamePool(poolId: string, name: string) {
    const { error } = await supabase.from("pools").update({ name }).eq("id", poolId);
    if (error) alert(error.message);
    else qc.invalidateQueries({ queryKey: ["admin-pools"] });
  }

  async function deletePool(poolId: string) {
    if (!window.confirm("Radera poolen? Alla medlemskap i poolen tas bort.")) return;
    await supabase.from("pool_members").delete().eq("pool_id", poolId);
    const { error } = await supabase.from("pools").delete().eq("id", poolId);
    if (error) alert(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["admin-pools"] });
      qc.invalidateQueries({ queryKey: ["admin-pool-members"] });
    }
  }

  async function removeMember(poolId: string, userId: string) {
    const { error } = await supabase.from("pool_members").delete().eq("pool_id", poolId).eq("user_id", userId);
    if (error) alert(error.message);
    else qc.invalidateQueries({ queryKey: ["admin-pool-members"] });
  }

  async function addMember(poolId: string, userId: string) {
    const { error } = await supabase.from("pool_members").upsert({ pool_id: poolId, user_id: userId });
    if (error) alert(error.message);
    else qc.invalidateQueries({ queryKey: ["admin-pool-members"] });
  }

  const baseUrl = window.location.origin;

  return (
    <section className="rounded-2xl bg-card border border-border p-4 space-y-4">
      <h2 className="font-semibold">Pooler</h2>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Namn på ny pool..."
          className="flex-1 rounded-xl bg-input border border-border px-3 py-2 text-sm"
        />
        <button
          onClick={createPool}
          disabled={saving || !newName.trim()}
          className="rounded-xl bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 disabled:opacity-50"
        >
          Skapa
        </button>
      </div>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}

      <div className="space-y-4">
        {pools?.map(pool => (
          <PoolRow
            key={pool.id}
            pool={pool}
            members={members}
            profiles={profiles}
            baseUrl={baseUrl}
            onRemoveMember={removeMember}
            onAddMember={addMember}
            onRename={renamePool}
            onDelete={deletePool}
          />
        ))}
      </div>
    </section>
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

type GroupState = { pos1: string; pos2: string; pos3: string; advances: boolean };

function GroupActualsBlock() {
  const qc = useQueryClient();
  const [state, setState] = useState<Record<string, GroupState>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("group_actuals").select("*").then(({ data }) => {
      const map: Record<string, GroupState> = {};
      for (const g of WC_GROUPS) map[g.letter] = { pos1: "", pos2: "", pos3: "", advances: false };
      for (const row of data ?? []) {
        const g = map[row.group_letter] ?? { pos1: "", pos2: "", pos3: "", advances: false };
        if (row.position === 1) g.pos1 = row.team_name;
        if (row.position === 2) g.pos2 = row.team_name;
        if (row.position === 3) { g.pos3 = row.team_name; g.advances = row.advances_as_third; }
        map[row.group_letter] = g;
      }
      setState(map);
    });
  }, []);

  async function save() {
    setSaving(true); setMsg(null);
    const rows: { group_letter: string; position: number; team_name: string; advances_as_third: boolean }[] = [];
    for (const [letter, g] of Object.entries(state)) {
      if (g.pos1) rows.push({ group_letter: letter, position: 1, team_name: g.pos1, advances_as_third: false });
      if (g.pos2) rows.push({ group_letter: letter, position: 2, team_name: g.pos2, advances_as_third: false });
      if (g.pos3) rows.push({ group_letter: letter, position: 3, team_name: g.pos3, advances_as_third: g.advances });
    }
    const { error } = await supabase
      .from("group_actuals")
      .upsert(rows, { onConflict: "group_letter,position" });
    setSaving(false);
    if (error) setMsg(error.message);
    else { setMsg("Sparat!"); qc.invalidateQueries({ queryKey: ["leaderboard"] }); }
  }

  return (
    <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
      <h2 className="font-semibold">Grupputgångar (sextondelstips)</h2>
      <p className="text-xs text-muted-foreground">
        Sätt verkliga placeringar per grupp efter gruppspelet. Kryssa "vidare" för de 8 bästa 3:orna.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {WC_GROUPS.map(g => {
          const s = state[g.letter] ?? { pos1: "", pos2: "", pos3: "", advances: false };
          const sel = (pos: "pos1" | "pos2" | "pos3") => (
            <select
              value={s[pos]}
              onChange={e => setState(prev => ({ ...prev, [g.letter]: { ...s, [pos]: e.target.value } }))}
              className="flex-1 rounded-lg bg-input border border-border px-2 py-1 text-xs"
            >
              <option value="">–</option>
              {g.teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          );
          return (
            <div key={g.letter} className="rounded-xl border border-border p-2 space-y-1.5">
              <p className={`text-xs font-bold uppercase tracking-wide ${g.color}`}>Grupp {g.letter}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs w-5">👑</span>{sel("pos1")}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs w-5 font-semibold">2</span>{sel("pos2")}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs w-5 font-semibold">3</span>{sel("pos3")}
                <label className="flex items-center gap-1 text-xs text-muted-foreground ml-1 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={s.advances}
                    onChange={e => setState(prev => ({ ...prev, [g.letter]: { ...s, advances: e.target.checked } }))}
                  />
                  vidare
                </label>
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-2 disabled:opacity-50"
      >
        {saving ? "Sparar..." : "Spara grupputgångar"}
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
