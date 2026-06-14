import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Star, X, ChevronDown, Search, Locate } from "lucide-react";
import { teamFlag, TeamFlag } from "@/lib/teamFlags";
import { fmtDate, fmtTime, stageLabel } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePool } from "@/hooks/usePool";
import { WC_GROUPS } from "@/lib/wcGroups";

type TabValue = "table" | "prizes" | "tips" | "stats";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  component: LeaderboardPage,
  validateSearch: (search: Record<string, unknown>): { tab?: TabValue } => {
    const t = search.tab;
    return t === "prizes" || t === "tips" || t === "stats" || t === "table" ? { tab: t } : {};
  },
});

function LeaderboardPage() {
  const navigate = Route.useNavigate();
  const { tab } = Route.useSearch();
  const { user } = useAuth();
  const [openUser, setOpenUser] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const { data: rows, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .order("total_points", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: allProfiles } = useQuery({
    queryKey: ["profiles-approved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name,approved");
      if (error) throw error;
      return data;
    },
  });

const { selectedPool } = usePool();

  const { data: poolMembers } = useQuery({
    queryKey: ["pool-members", selectedPool?.id],
    enabled: !!selectedPool,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pool_members")
        .select("user_id")
        .eq("pool_id", selectedPool!.id);
      if (error) throw error;
      return data.map((m) => m.user_id);
    },
  });

    const { data: finishedMatches } = useQuery({
    queryKey: ["lb-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("id,home_score,away_score,finished")
        .eq("finished", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: allPicks } = useQuery({
    queryKey: ["lb-picks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_picks")
        .select("user_id,match_id,home_score,away_score");
      if (error) throw error;
      return data;
    },
  });

  // Upset bonus per pool: +1 for correct outcome when fewer than half of the pool picked the same outcome
  const upsetByUser = useMemo(() => {
    const result = new Map<string, number>();
    if (!finishedMatches || !allPicks) return result;
    const poolSetLocal = poolMembers ? new Set(poolMembers) : null;
    const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);
    const matchById = new Map(finishedMatches.map(m => [m.id, m]));

    const picksInPool = poolSetLocal
      ? allPicks.filter(p => poolSetLocal.has(p.user_id))
      : allPicks;

    const picksPerMatch = new Map<string, typeof picksInPool>();
    for (const p of picksInPool) {
      if (!matchById.has(p.match_id)) continue;
      const arr = picksPerMatch.get(p.match_id) ?? [];
      arr.push(p);
      picksPerMatch.set(p.match_id, arr);
    }

    for (const p of picksInPool) {
      const m = matchById.get(p.match_id);
      if (!m || m.home_score === null || m.away_score === null) continue;
      const outcome = sign(p.home_score - p.away_score) === sign(m.home_score - m.away_score);
      if (!outcome) continue;
      const all = picksPerMatch.get(p.match_id) ?? [];
      const actualOutcome = sign(m.home_score - m.away_score);
      const sameOutcome = all.filter(x => sign(x.home_score - x.away_score) === actualOutcome).length;
      if (sameOutcome * 2 < all.length) {
        result.set(p.user_id, (result.get(p.user_id) ?? 0) + 1);
      }
    }
    return result;
  }, [finishedMatches, allPicks, poolMembers]);

  
  const isFreePool = (selectedPool?.entry_fee ?? -1) === 0;
  const approvedSet = new Set((allProfiles ?? []).filter((p) => p.approved || isFreePool).map((p) => p.id));
  const poolSet = new Set(poolMembers ?? []);

    const approvedRows = (rows ?? [])
    .filter((r) =>
      r.user_id &&
      approvedSet.has(r.user_id) &&
      (poolMembers === undefined || poolSet.has(r.user_id))
    )
    .map((r) => {
      const upset = upsetByUser.get(r.user_id!) ?? 0;
      return {
        ...r,
        match_points: (r.match_points ?? 0) + upset,
        total_points: (r.total_points ?? 0) +   upset,
      }
    })
        .sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0));
  

  
  const unapproved = isFreePool ? [] : (allProfiles ?? [])
    .filter((p) => !p.approved && (poolMembers === undefined || poolSet.has(p.id)));
    
  // Delad placering (1224 style)
  const ranked = useMemo(() => {
    let lastScore: number | null = null;
    let lastRank = 0;
    return approvedRows.map((r, i) => {
      const score = r.total_points ?? 0;
      if (score !== lastScore) {
        lastRank = i + 1;
        lastScore = score;
      }
      return { ...r, rank: lastRank };
    });
  }, [approvedRows]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? ranked.filter((r) => (r.display_name ?? "").toLowerCase().includes(q))
    : ranked;

  const scrollToMe = () => {
    if (!user) return;
    const el = rowRefs.current[user.id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2000);
    }
  };

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="size-5 mx-auto text-primary" />;
    if (rank === 2) return <Medal className="size-5 mx-auto text-muted-foreground" />;
    if (rank === 3) return <Star className="size-5 mx-auto text-muted-foreground" />;
    return <span>{rank}</span>;
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Leaderboard</h1>

      {isLoading && <p className="text-muted-foreground">Laddar...</p>}

      <Tabs
        value={tab ?? "table"}
        onValueChange={(v) => navigate({ search: { tab: v === "table" ? undefined : (v as TabValue) }, replace: true })}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="table">Tabell</TabsTrigger>
          <TabsTrigger value="prizes">Priser</TabsTrigger>
          <TabsTrigger value="tips">Allas tips</TabsTrigger>
          <TabsTrigger value="stats">Statistik</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-3">
          <p className="text-xs text-muted-foreground">Klicka på ett namn för att se personens tips.</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Hitta spelare..."
                className="pl-8"
              />
            </div>
            {user && (
              <Button variant="outline" size="sm" onClick={scrollToMe} className="gap-1.5">
                <Locate className="size-4" /> Visa mig
              </Button>
            )}
          </div>

          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            {filtered.map((r) => {
              const isMe = user?.id === r.user_id;
              return (
                <button
                  key={r.user_id}
                  ref={(el) => { rowRefs.current[r.user_id!] = el; }}
                  onClick={() => setOpenUser({ id: r.user_id!, name: r.display_name! })}
                  className={`w-full flex items-center gap-3 p-3 border-b border-border last:border-b-0 hover:bg-accent text-left transition-colors ${isMe ? "bg-accent/40" : ""}`}
                >
                  <div className="w-8 text-center font-bold text-muted-foreground">
                    {rankIcon(r.rank)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {r.display_name}
                      {isMe && <span className="ml-1.5 text-[10px] text-primary">(du)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Match {r.match_points}p · Grupp {r.r16_points ?? 0}p · Turnering {r.longterm_points}p
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-primary">{r.total_points}</div>
                </button>
              );
            })}
            {!q && unapproved.map((p) => (
              <div key={p.id} className="w-full flex items-center gap-3 p-3 border-b border-border last:border-b-0 opacity-80">
                <div className="w-8 text-center font-bold text-muted-foreground">–</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{p.display_name}</div>
                  <div className="text-xs font-semibold text-destructive">Betala!!</div>
                </div>
                <div className="text-2xl font-bold text-muted-foreground">–</div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="p-6 text-center text-muted-foreground text-sm">
                {q ? "Ingen spelare matchade." : "Inga spelare ännu."}
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="prizes">
          <PrizeLeaderSection approvedRows={approvedRows} poolMemberIds={poolMembers} entryFee={selectedPool?.entry_fee} />
        </TabsContent>

        <TabsContent value="tips">
          <LongTermPicksSection onPick={(id, name) => setOpenUser({ id, name })} poolMemberIds={poolMembers} />
        </TabsContent>

        <TabsContent value="stats">
          <StatsSection poolMemberIds={poolMembers} />
        </TabsContent>
      </Tabs>

      {openUser && (
        <UserPicksModal userId={openUser.id} name={openUser.name} onClose={() => setOpenUser(null)} />
      )}
    </div>
  );
}

function PrizeLeaderSection({ approvedRows, poolMemberIds, entryFee }: { approvedRows: any[]; poolMemberIds?: string[]; entryFee?: number }) {
  const { data: matches } = useQuery({
    queryKey: ["stats-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("id,stage,kickoff,home_score,away_score,finished")
        .eq("finished", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: picks } = useQuery({
    queryKey: ["stats-picks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_picks")
        .select("user_id,match_id,home_score,away_score,joker");
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

  if (!matches || !picks || !profiles || approvedRows.length === 0) return null;

  const nameById = new Map(profiles.map((p) => [p.id, p.display_name]));
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);

  const visiblePicks = poolMemberIds ? picks.filter(p => poolMemberIds.includes(p.user_id)) : picks;

  const picksPerMatch = new Map<string, typeof picks>();
  for (const p of visiblePicks) {
    if (!matchById.has(p.match_id)) continue;
    const arr = picksPerMatch.get(p.match_id) ?? [];
    arr.push(p);
    picksPerMatch.set(p.match_id, arr);
  }

  // Beräkna matchpoints och upsets per användare
  const matchPts = new Map<string, number>();
  const upsets = new Map<string, number>();

  for (const p of visiblePicks) {
    const m = matchById.get(p.match_id);
    if (!m || m.home_score === null || m.away_score === null) continue;
    const exact = p.home_score === m.home_score && p.away_score === m.away_score;
    const outcome = sign(p.home_score - p.away_score) === sign(m.home_score - m.away_score);
    if (!outcome) continue;

    const stagePoints = (stage: string) => {
      if (stage === "group") return exact ? 4 : 2;
      if (stage === "r16") return exact ? 4 : 2;
      if (stage === "r8") return exact ? 6 : 3;
      if (stage === "qf") return exact ? 8 : 4;
      if (stage === "sf" || stage === "third") return exact ? 10 : 5;
      if (stage === "final") return exact ? 12 : 6;
      return 0;
    };

    const pts = stagePoints(m.stage) * (p.joker ? 2 : 1);
    matchPts.set(p.user_id, (matchPts.get(p.user_id) ?? 0) + pts);

    const all = picksPerMatch.get(p.match_id) ?? [];
    const actualOutcome = sign(m.home_score - m.away_score);
    const sameOutcome = all.filter((x) => sign(x.home_score - x.away_score) === actualOutcome).length;
    if (all.length >= 3 && sameOutcome * 2 < all.length) {
      upsets.set(p.user_id, (upsets.get(p.user_id) ?? 0) + 1);
    }
  }

  // Hjälpare: hämta alla som delar topp-värdet
  const topTied = <T,>(items: T[], val: (x: T) => number): T[] => {
    if (items.length === 0) return [];
    const sorted = [...items].sort((a, b) => val(b) - val(a));
    const top = val(sorted[0]);
    return sorted.filter((x) => val(x) === top);
  };
  const bottomTied = <T,>(items: T[], val: (x: T) => number): T[] => {
    if (items.length === 0) return [];
    const sorted = [...items].sort((a, b) => val(a) - val(b));
    const bot = val(sorted[0]);
    return sorted.filter((x) => val(x) === bot);
  };

  // Sortera unika poängnivåer för 1:a/2:a
  const totalSorted = [...approvedRows].sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0));
  const firstScore = totalSorted[0]?.total_points ?? null;
  const firstPlace = totalSorted.filter((r) => r.total_points === firstScore);
  // Andraplats = nästa unika poängnivå
  const secondScore = totalSorted.find((r) => r.total_points !== firstScore)?.total_points ?? null;
  const secondPlace = secondScore !== null ? totalSorted.filter((r) => r.total_points === secondScore) : [];

  const matchLeaders = topTied(approvedRows, (r) => r.match_points ?? 0);
  const oracleLeaders = topTied(approvedRows, (r) => r.longterm_points ?? 0);

  const upsetPool = (profiles ?? [])
    .map((p) => ({ id: p.id, display_name: p.display_name, upsets: upsets.get(p.id) ?? 0 }))
    .filter((p) => approvedRows.some((r) => r.user_id === p.id));
  const upsetLeaders = topTied(upsetPool, (p) => p.upsets);
  const upsetLeadersFiltered = upsetLeaders.length > 0 && upsetLeaders[0].upsets > 0 ? upsetLeaders : [];

  const lastPlace = bottomTied(approvedRows, (r) => r.total_points ?? 0);

  type Entry = { name: string; detail: string };
  type Prize = { key: string; emoji: string; label: string; entries: Entry[]; suffix?: string };

  const pot = entryFee != null && poolMemberIds != null ? approvedRows.length * entryFee : null;

  const prizes: Prize[] = [
    {
      key: "first", emoji: "🥇", label: "Totalsegrare",
      entries: firstPlace.map((r) => ({ name: r.display_name ?? "–", detail: `${r.total_points}p` })),
    },
    {
      key: "second", emoji: "🥈", label: "Tvåa",
      entries: secondPlace.map((r) => ({ name: r.display_name ?? "–", detail: `${r.total_points}p` })),
    },
    {
      key: "match", emoji: "🎯", label: "Matchtips-kungen",
      entries: matchLeaders.map((r) => ({ name: r.display_name ?? "–", detail: `${r.match_points}p` })),
    },
    {
      key: "oracle", emoji: "🔮", label: "VM-Oraklet",
      entries: oracleLeaders.map((r) => ({ name: r.display_name ?? "–", detail: `${r.longterm_points}p` })),
    },
    {
      key: "upset", emoji: "💥", label: "VM skrällen",
      entries: upsetLeadersFiltered.map((p) => ({ name: p.display_name ?? "–", detail: `${p.upsets} skrällar` })),
    },
    {
      key: "last", emoji: "🤡", label: "Jumbopriset",
      entries: lastPlace.map((r) => ({ name: r.display_name ?? "–", detail: `${r.total_points}p` })),
    },
  ];

  const prize1 = pot != null ? Math.round((pot - 300 - 200 - 300 - 200) * 0.7) : null;
  const prize2 = pot != null ? Math.round((pot - 300 - 200 - 300 - 200) * 0.3) : null;
  const fmt = (n: number) => n.toLocaleString("sv-SE");

  return (
    <div className="space-y-4">
      {pot != null && (
        <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div>
            <h2 className="font-semibold text-lg">💰 Prispott</h2>
          </div>
          <div className="rounded-xl bg-muted p-3 text-center space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total prispott</p>
            <p className="text-3xl font-bold text-primary">{fmt(pot)} kr</p>
            <p className="text-xs text-muted-foreground">{approvedRows.length} deltagare × {entryFee} kr</p>
          </div>
          <div className="space-y-0">
            {[
              { emoji: "🥇", label: "Totalsegrare", amount: prize1 != null ? `${fmt(prize1)} kr` : "–", note: "70% av rörlig pott" },
              { emoji: "🥈", label: "Tvåa",          amount: prize2 != null ? `${fmt(prize2)} kr` : "–", note: "30% av rörlig pott" },
              { emoji: "🎯", label: "Matchtips-kungen", amount: "300 kr", note: "Fast pris" },
              { emoji: "💥", label: "VM skrällen",   amount: "200 kr",  note: "Fast pris" },
              { emoji: "🔮", label: "VM-Oraklet",    amount: "300 kr",     note: "Fast pris" },
              { emoji: "🤡", label: "Jumbopriset",   amount: "200 kr",  note: "Pengarna tillbaka" },
            ].map(({ emoji, label, amount, note }) => (
              <div key={label} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <span>{emoji} {label}</span>
                <div className="text-right">
                  <span className="font-semibold">{amount}</span>
                  <span className="text-muted-foreground text-xs ml-2">{note}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div>
          <h2 className="font-semibold text-lg">🏅 Aktuellt prisläge</h2>
          <p className="text-xs text-muted-foreground">Uppdateras i realtid — vem leder just nu?</p>
        </div>
        <div className="space-y-0">
          {prizes.map((p) => <PrizeRow key={p.key} prize={p} />)}
        </div>
      </section>
    </div>
  );
}

function PrizeRow({ prize }: { prize: { emoji: string; label: string; entries: { name: string; detail: string }[] } }) {
  const [open, setOpen] = useState(false);
  const { emoji, label, entries } = prize;
  const tied = entries.length > 1;

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
        <span className="text-muted-foreground">{emoji} {label}</span>
        <span className="font-semibold text-muted-foreground">–</span>
      </div>
    );
  }

  if (!tied) {
    const e = entries[0];
    return (
      <div className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
        <span className="text-muted-foreground">{emoji} {label}</span>
        <span className="font-semibold flex items-center gap-1.5">
          {e.name}
          <span className="text-xs text-muted-foreground font-normal">({e.detail})</span>
        </span>
      </div>
    );
  }

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-2 text-sm text-left hover:bg-accent/30 -mx-2 px-2 rounded-md transition-colors"
      >
        <span className="text-muted-foreground">{emoji} {label}</span>
        <span className="font-semibold flex items-center gap-1.5">
          <span>Delad plats ({entries.length})</span>
          <span className="text-xs text-muted-foreground font-normal">({entries[0].detail})</span>
          <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <ul className="pb-2 pl-6 space-y-1">
          {entries.map((e, i) => (
            <li key={i} className="text-sm flex items-center justify-between">
              <span>• {e.name}</span>
              <span className="text-xs text-muted-foreground">{e.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UserPicksModal({ userId, name, onClose }: { userId: string; name: string; onClose: () => void }) {
  const { user } = useAuth();
  const isSelf = user?.id === userId;

  const { data: picks, isLoading } = useQuery({
    queryKey: ["user-picks", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_picks")
        .select("home_score,away_score,joker,matches(id,match_number,stage,kickoff,home_team,away_team,home_score,away_score,finished)")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
  });

  const { data: lt } = useQuery({
    queryKey: ["user-longterm", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("long_term_picks").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: r16rows } = useQuery({
    queryKey: ["user-r16", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("r16_picks").select("group_letter,team_name,position").eq("user_id", userId).order("group_letter");
      if (error) throw error;
      return data;
    },
  });

  const r16ByGroup = useMemo(() => {
    const map: Record<string, { 1?: string; 2?: string; 3?: string }> = {};
    for (const r of r16rows ?? []) {
      map[r.group_letter] ??= {};
      map[r.group_letter][r.position as 1 | 2 | 3] = r.team_name;
    }
    return map;
  }, [r16rows]);

  const now = Date.now();
  const sorted = (picks ?? [])
    .filter((p) => p.matches)
    .filter((p) => isSelf || new Date(p.matches!.kickoff).getTime() <= now)
    .sort((a, b) => (a.matches!.match_number ?? 0) - (b.matches!.match_number ?? 0));

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-bold text-lg">{name}</h2>
            <p className="text-xs text-muted-foreground">Alla tips som är synliga för dig</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent">
            <X className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Turneringstips</h3>
            {(isSelf || now >= new Date("2026-06-11").getTime()) && lt ? (
              <div className="rounded-xl bg-background/50 border border-border p-3 text-sm space-y-1">
                <div>🏆 Vinnare: <span className="font-semibold"><TeamFlag name={lt.champion} /> {lt.champion}</span></div>
                <div>🥈 Finalist: <span className="font-semibold"><TeamFlag name={lt.runner_up} /> {lt.runner_up}</span></div>
                <div>🥉 Semi: <span className="font-semibold"><TeamFlag name={lt.semi1} /> {lt.semi1}, <TeamFlag name={lt.semi2} /> {lt.semi2}</span></div>
                <div>⚽ Skyttekung: <span className="font-semibold">{lt.top_scorer}</span></div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic rounded-xl bg-background/50 border border-border p-3">
                Dolt fram till VM-start (11 juni 2026).
              </p>
            )}
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Slutspelslag</h3>
            {(isSelf || now >= new Date("2026-06-11").getTime()) && r16rows && r16rows.length > 0 ? (
              <div className="rounded-xl bg-background/50 border border-border p-3 text-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {WC_GROUPS.map(g => {
                    const sel = r16ByGroup[g.letter];
                    if (!sel) return null;
                    return (
                      <div key={g.letter} className="flex items-start gap-1.5">
                        <span className="text-muted-foreground w-4 shrink-0">{g.letter}</span>
                        <span className="flex gap-0.5 flex-wrap">
                          {([1, 2, 3] as const).map(pos => sel[pos] ? (
                            <span key={pos} title={sel[pos]} className="text-base">{teamFlag(sel[pos]!)}</span>
                          ) : null)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic rounded-xl bg-background/50 border border-border p-3">
                Dolt fram till VM-start (11 juni 2026).
              </p>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Matchtips {sorted.length > 0 && `(${sorted.length})`}
            </h3>
            {isLoading && <p className="text-sm text-muted-foreground">Laddar...</p>}
            {!isLoading && sorted.length === 0 && (
              <p className="text-sm text-muted-foreground italic rounded-xl bg-background/50 border border-border p-3">
                Inga matchtips synliga ännu — varje persons tips visas först efter respektive matchstart.
              </p>
            )}
            <div className="space-y-1.5">
              {sorted.map((p) => {
                const m = p.matches!;
                let badge: { color: string; label: string } | null = null;
                if (m.finished && m.home_score !== null && m.away_score !== null) {
                  const exact = p.home_score === m.home_score && p.away_score === m.away_score;
                  const outcome = Math.sign(p.home_score - p.away_score) === Math.sign(m.home_score - m.away_score);
                  if (exact) badge = { color: "bg-success text-success-foreground", label: "🟩" };
                  else if (outcome) badge = { color: "bg-warning text-warning-foreground", label: "🟨" };
                  else badge = { color: "bg-destructive text-destructive-foreground", label: "🟥" };
                }
                return (
                  <div key={m.id} className="rounded-lg border border-border p-2 text-sm">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>#{m.match_number} · {stageLabel(m.stage as never)}</span>
                      <span>{fmtDate(m.kickoff)} {fmtTime(m.kickoff)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex-1 text-right truncate">{m.home_team} <TeamFlag name={m.home_team} /></span>
                      <span className="font-bold tabular-nums px-2 py-0.5 rounded bg-background min-w-[50px] text-center">
                        {p.home_score}–{p.away_score}
                      </span>
                      <span className="flex-1 truncate"><TeamFlag name={m.away_team} /> {m.away_team}</span>
                    </div>
                    {(p.joker || badge || m.finished) && (
                      <div className="flex items-center justify-end gap-2 mt-1 text-[10px]">
                        {m.finished && (
                          <span className="text-muted-foreground">Facit: {m.home_score}–{m.away_score}</span>
                        )}
                        {p.joker && <span className="text-primary font-semibold">★ Joker</span>}
                        {badge && <span className={`px-1.5 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function LongTermPicksSection({ onPick, poolMemberIds }: { onPick: (id: string, name: string) => void; poolMemberIds?: string[] }) {
  const { data: picks, isLoading } = useQuery({
    queryKey: ["all-longterm"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("long_term_picks")
        .select("user_id,champion,runner_up,semi1,semi2,top_scorer");
      if (error) throw error;
      return data;
    },
  });

  const { data: r16picks } = useQuery({
    queryKey: ["all-r16picks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("r16_picks")
        .select("user_id,group_letter,team_name,position")
        .order("group_letter");
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

  const r16ByUser = useMemo(() => {
    const map = new Map<string, Record<1 | 2 | 3, { team: string; group: string }[]>>();
    for (const r of r16picks ?? []) {
      if (!map.has(r.user_id)) map.set(r.user_id, { 1: [], 2: [], 3: [] });
      map.get(r.user_id)![r.position as 1 | 2 | 3].push({ team: r.team_name, group: r.group_letter });
    }
    return map;
  }, [r16picks]);

  const posFlags = (uid: string, pos: 1 | 2 | 3) => {
    const teams = r16ByUser.get(uid)?.[pos] ?? [];
    if (teams.length === 0) return <span className="text-muted-foreground">–</span>;
    return (
      <span className="flex flex-wrap gap-0.5">
        {teams.map(({ team, group }) => (
          <span key={group} title={`${group}: ${team}`} className="cursor-default text-base">
            {teamFlag(team)}
          </span>
        ))}
      </span>
    );
  };

  return (
    <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
      <div>
        <h2 className="font-semibold text-lg">Turneringstips</h2>
        <p className="text-xs text-muted-foreground">
          Allas tips på vinnare, finalist, semifinalister & skyttekung, slutspelslag. Visas för alla efter VM-start (11 juni).
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laddar...</p>
      ) : !picks || picks.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Inga tips att visa ännu.</p>
      ) : (
        <div className="space-y-3">
          {(poolMemberIds ? picks.filter(p => poolMemberIds.includes(p.user_id)) : picks).map(p => (
            <div key={p.user_id} className="rounded-xl border border-border p-3 space-y-2">
              <button
                onClick={() => onPick(p.user_id, nameOf(p.user_id))}
                className="font-semibold text-sm hover:text-primary underline-offset-2 hover:underline text-left"
              >
                {nameOf(p.user_id)}
              </button>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div>
                  <span className="text-muted-foreground">🏆 Vinnare</span>
                  <div className="font-semibold"><TeamFlag name={p.champion} /> {p.champion}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">🥈 Finalist</span>
                  <div className="font-semibold"><TeamFlag name={p.runner_up} /> {p.runner_up}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">🥉 Semifinalister</span>
                  <div className="font-semibold"><TeamFlag name={p.semi1} /> {p.semi1}, <TeamFlag name={p.semi2} /> {p.semi2}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">⚽ Skyttekung</span>
                  <div className="font-semibold">{p.top_scorer}</div>
                </div>
              </div>
              <div className="border-t border-border pt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground block">👑 Gruppvinnare</span>
                  <div className="mt-0.5">{posFlags(p.user_id, 1)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground block">2:or</span>
                  <div className="mt-0.5">{posFlags(p.user_id, 2)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground block">3:or</span>
                  <div className="mt-0.5">{posFlags(p.user_id, 3)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

type StatRow = {
  user_id: string;
  name: string;
  exact: number;
  outcome: number;
  miss: number;
  bestDay: number;
  bestDayDate: string | null;
  upset: number;
  jokerWins: number;
};

function StatsSection({ poolMemberIds }: { poolMemberIds?: string[] }) {
  const { data: matches } = useQuery({
    queryKey: ["stats-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("id,stage,kickoff,home_score,away_score,finished")
        .eq("finished", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: picks } = useQuery({
    queryKey: ["stats-picks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_picks")
        .select("user_id,match_id,home_score,away_score,joker");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["stats-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,display_name");
      if (error) throw error;
      return data;
    },
  });

  if (!matches || !picks || !profiles) {
    return (
      <section className="rounded-2xl bg-card border border-border p-4">
        <p className="text-sm text-muted-foreground">Laddar statistik...</p>
      </section>
    );
  }

  const matchById = new Map(matches.map((m) => [m.id, m]));
  const nameById = new Map(profiles.map((p) => [p.id, p.display_name]));

  const visiblePicks = poolMemberIds ? picks.filter(p => poolMemberIds.includes(p.user_id)) : picks;

  const picksPerMatch = new Map<string, typeof picks>();
  for (const p of visiblePicks) {
    if (!matchById.has(p.match_id)) continue;
    const arr = picksPerMatch.get(p.match_id) ?? [];
    arr.push(p);
    picksPerMatch.set(p.match_id, arr);
  }

  const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);

  const stagePoints = (stage: string, exact: boolean, outcome: boolean) => {
    if (stage === "group") return exact ? 4 : outcome ? 2 : 0;
    if (stage === "r16") return exact ? 4 : outcome ? 2 : 0;
    if (stage === "r8") return exact ? 6 : outcome ? 3 : 0;
    if (stage === "qf") return exact ? 8 : outcome ? 4 : 0;
    if (stage === "sf" || stage === "third") return exact ? 10 : outcome ? 5 : 0;
    if (stage === "final") return exact ? 12 : outcome ? 6 : 0;
    return 0;
  };

  const stats = new Map<string, StatRow>();
  const dayPoints = new Map<string, Map<string, number>>();

  for (const p of visiblePicks) {
    const m = matchById.get(p.match_id);
    if (!m || m.home_score === null || m.away_score === null) continue;

    const exact = p.home_score === m.home_score && p.away_score === m.away_score;
    const outcome = sign(p.home_score - p.away_score) === sign(m.home_score - m.away_score);

    let s = stats.get(p.user_id);
    if (!s) {
      s = {
        user_id: p.user_id,
        name: nameById.get(p.user_id) ?? "Okänd",
        exact: 0,
        outcome: 0,
        miss: 0,
        bestDay: 0,
        bestDayDate: null,
        upset: 0,
        jokerWins: 0,
      };
      stats.set(p.user_id, s);
    }

    if (exact) {
      s.exact++;
      s.outcome++;
    } else if (outcome) {
      s.outcome++;
    } else {
      s.miss++;
    }

    if (outcome) {
      const all = picksPerMatch.get(p.match_id) ?? [];
      const actualOutcome = sign(m.home_score - m.away_score);
      const sameOutcome = all.filter((x) => sign(x.home_score - x.away_score) === actualOutcome).length;
      if (all.length >= 3 && sameOutcome * 2 < all.length) s.upset++;
    }

    const pts = stagePoints(m.stage as string, exact, outcome);
    if (p.joker && pts > 0) s.jokerWins++;

    const dateKey = new Date(m.kickoff).toISOString().slice(0, 10);
    const userDays = dayPoints.get(p.user_id) ?? new Map<string, number>();
    userDays.set(dateKey, (userDays.get(dateKey) ?? 0) + pts);
    dayPoints.set(p.user_id, userDays);
  }

  for (const [uid, days] of dayPoints) {
    const s = stats.get(uid);
    if (!s) continue;
    let best = 0;
    let bestDate: string | null = null;
    for (const [d, pts] of days) {
      if (pts > best) { best = pts; bestDate = d; }
    }
    s.bestDay = best;
    s.bestDayDate = bestDate;
  }

  const rows = Array.from(stats.values()).sort((a, b) => b.exact - a.exact || b.outcome - a.outcome);

  return (
    <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
      <div>
        <h2 className="font-semibold text-lg">Statistik</h2>
        <p className="text-xs text-muted-foreground">
          Sammanställning från färdigspelade matcher. Skrällbonus = rätt utgång där färre än hälften tippade samma.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Statistiken fylls på när matcher börjar spelas (11 juni 2026).
        </p>
      ) : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left">
                <th className="px-1 py-1.5 font-medium">Namn</th>
                <th className="px-1 py-1.5 font-medium text-center">🎯 Exakt</th>
                <th className="px-1 py-1.5 font-medium text-center">✅ Rätt</th>
                <th className="px-1 py-1.5 font-medium text-center">❌ Miss</th>
                <th className="px-1 py-1.5 font-medium text-center">🔥 Bästa dag</th>
                <th className="px-1 py-1.5 font-medium text-center">💥 Skräll</th>
                <th className="px-1 py-1.5 font-medium text-center">★ Joker</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id} className="border-t border-border">
                  <td className="px-1 py-1.5 font-semibold truncate max-w-[100px]">{r.name}</td>
                  <td className="px-1 py-1.5 text-center tabular-nums">{r.exact}</td>
                  <td className="px-1 py-1.5 text-center tabular-nums">{r.outcome}</td>
                  <td className="px-1 py-1.5 text-center tabular-nums text-muted-foreground">{r.miss}</td>
                  <td className="px-1 py-1.5 text-center tabular-nums">{r.bestDay > 0 ? `${r.bestDay}p` : "–"}</td>
                  <td className="px-1 py-1.5 text-center tabular-nums">{r.upset}</td>
                  <td className="px-1 py-1.5 text-center tabular-nums">{r.jokerWins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
