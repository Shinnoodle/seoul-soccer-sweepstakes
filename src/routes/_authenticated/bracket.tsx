import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WC_GROUPS, TEAM_EN_TO_GROUP, TEAM_EN_TO_SV } from "@/lib/wcGroups";
import { TeamFlag } from "@/lib/teamFlags";

export const Route = createFileRoute("/_authenticated/bracket")({
  component: BracketPage,
});

type Team = { name: string; flag: string };
type SlotProps = { label: string; sub?: string };

function Slot({ label, sub }: SlotProps) {
  return (
    <div className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-semibold leading-tight min-w-[90px]">
      <span className="text-foreground">{label}</span>
      {sub && <span className="block text-[10px] text-muted-foreground font-normal">{sub}</span>}
    </div>
  );
}

function Matchup({ top, bottom }: { top: SlotProps; bottom: SlotProps }) {
  return (
    <div className="flex flex-col gap-0.5">
      <Slot {...top} />
      <Slot {...bottom} />
    </div>
  );
}

function Round({ title, matchups }: { title: string; matchups: { top: SlotProps; bottom: SlotProps }[] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-center">{title}</p>
      <div className="flex flex-col gap-4">
        {matchups.map((m, i) => <Matchup key={i} {...m} />)}
      </div>
    </div>
  );
}

function GroupCard({ name, teams, color }: { name: string; teams: Team[]; color: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-3 space-y-1.5 min-w-[140px]`}>
      <p className={`text-[10px] font-bold uppercase tracking-wide ${color}`}>{name}</p>
      {teams.map((t) => (
        <div key={t.name} className="flex items-center gap-1.5 text-xs">
          <span>{t.flag}</span>
          <span className="text-foreground">{t.name}</span>
        </div>
      ))}
    </div>
  );
}

const GROUPS: { name: string; color: string; teams: Team[] }[] = [
  {
    name: "Grupp A", color: "text-green-500",
    teams: [
      { name: "Mexiko", flag: "🇲🇽" },
      { name: "Sydafrika", flag: "🇿🇦" },
      { name: "Sydkorea", flag: "🇰🇷" },
      { name: "Tjeckien", flag: "🇨🇿" },
    ],
  },
  {
    name: "Grupp B", color: "text-red-500",
    teams: [
      { name: "Kanada", flag: "🇨🇦" },
      { name: "Bosnien", flag: "🇧🇦" },
      { name: "Qatar", flag: "🇶🇦" },
      { name: "Schweiz", flag: "🇨🇭" },
    ],
  },
  {
    name: "Grupp C", color: "text-yellow-500",
    teams: [
      { name: "Brasilien", flag: "🇧🇷" },
      { name: "Marocko", flag: "🇲🇦" },
      { name: "Haiti", flag: "🇭🇹" },
      { name: "Skottland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
    ],
  },
  {
    name: "Grupp D", color: "text-blue-500",
    teams: [
      { name: "USA", flag: "🇺🇸" },
      { name: "Paraguay", flag: "🇵🇾" },
      { name: "Australien", flag: "🇦🇺" },
      { name: "Turkiet", flag: "🇹🇷" },
    ],
  },
  {
    name: "Grupp E", color: "text-purple-500",
    teams: [
      { name: "Tyskland", flag: "🇩🇪" },
      { name: "Curaçao", flag: "🇨🇼" },
      { name: "Elfenbenskusten", flag: "🇨🇮" },
      { name: "Ecuador", flag: "🇪🇨" },
    ],
  },
  {
    name: "Grupp F", color: "text-orange-500",
    teams: [
      { name: "Nederländerna", flag: "🇳🇱" },
      { name: "Japan", flag: "🇯🇵" },
      { name: "Sverige", flag: "🇸🇪" },
      { name: "Tunisien", flag: "🇹🇳" },
    ],
  },
  {
    name: "Grupp G", color: "text-pink-500",
    teams: [
      { name: "Belgien", flag: "🇧🇪" },
      { name: "Egypten", flag: "🇪🇬" },
      { name: "Iran", flag: "🇮🇷" },
      { name: "Nya Zeeland", flag: "🇳🇿" },
    ],
  },
  {
    name: "Grupp H", color: "text-teal-500",
    teams: [
      { name: "Spanien", flag: "🇪🇸" },
      { name: "Kap Verde", flag: "🇨🇻" },
      { name: "Saudiarabien", flag: "🇸🇦" },
      { name: "Uruguay", flag: "🇺🇾" },
    ],
  },
  {
    name: "Grupp I", color: "text-indigo-500",
    teams: [
      { name: "Frankrike", flag: "🇫🇷" },
      { name: "Senegal", flag: "🇸🇳" },
      { name: "Irak", flag: "🇮🇶" },
      { name: "Norge", flag: "🇳🇴" },
    ],
  },
  {
    name: "Grupp J", color: "text-cyan-500",
    teams: [
      { name: "Argentina", flag: "🇦🇷" },
      { name: "Österrike", flag: "🇦🇹" },
      { name: "Algeriet", flag: "🇩🇿" },
      { name: "Jordanien", flag: "🇯🇴" },
    ],
  },
  {
    name: "Grupp K", color: "text-emerald-500",
    teams: [
      { name: "Portugal", flag: "🇵🇹" },
      { name: "Colombia", flag: "🇨🇴" },
      { name: "Uzbekistan", flag: "🇺🇿" },
      { name: "DR Kongo", flag: "🇨🇩" },
    ],
  },
  {
    name: "Grupp L", color: "text-rose-500",
    teams: [
      { name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      { name: "Kroatien", flag: "🇭🇷" },
      { name: "Ghana", flag: "🇬🇭" },
      { name: "Panama", flag: "🇵🇦" },
    ],
  },
];

type StandingRow = {
  team: string; played: number; won: number; drawn: number; lost: number;
  gf: number; ga: number; gd: number; pts: number;
};

function useGroupStandings() {
  const { data: matches } = useQuery({
    queryKey: ["group-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches").select("home_team,away_team,home_score,away_score,finished")
        .eq("stage", "group");
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });

  const standings = new Map<string, Map<string, StandingRow>>();
  for (const g of WC_GROUPS) {
    const rows = new Map<string, StandingRow>();
    for (const en of g.teamsEn) {
      rows.set(en, { team: en, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
    }
    standings.set(g.letter, rows);
  }

  for (const m of matches ?? []) {
    if (m.home_score === null || m.away_score === null) continue;
    const group = TEAM_EN_TO_GROUP[m.home_team] ?? TEAM_EN_TO_GROUP[m.away_team];
    if (!group) continue;
    const rows = standings.get(group)!;
    const home = rows.get(m.home_team);
    const away = rows.get(m.away_team);
    if (!home || !away) continue;
    home.played++; away.played++;
    home.gf += m.home_score; home.ga += m.away_score;
    away.gf += m.away_score; away.ga += m.home_score;
    home.gd = home.gf - home.ga; away.gd = away.gf - away.ga;
    if (m.home_score > m.away_score) { home.won++; home.pts += 3; away.lost++; }
    else if (m.home_score < m.away_score) { away.won++; away.pts += 3; home.lost++; }
    else { home.drawn++; home.pts++; away.drawn++; away.pts++; }
  }

  return standings;
}

function GroupTable({ group }: { group: typeof WC_GROUPS[0] }) {
  const standings = useGroupStandings();
  const rows = standings.get(group.letter);
  if (!rows) return null;

  const sorted = [...rows.values()].sort((a, b) =>
    b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team)
  );

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <div className="flex gap-0.5">
          {group.teamsEn.map(en => <TeamFlag key={en} name={en} className="text-base" />)}
        </div>
        <span className={`text-xs font-bold uppercase tracking-wide ${group.color}`}>Grupp {group.letter}</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground border-b border-border">
            <th className="text-left px-3 py-1.5 font-medium w-6">#</th>
            <th className="text-left px-1 py-1.5 font-medium">Lag</th>
            <th className="text-center px-1.5 py-1.5 font-medium">S</th>
            <th className="text-center px-1.5 py-1.5 font-medium">V</th>
            <th className="text-center px-1.5 py-1.5 font-medium">O</th>
            <th className="text-center px-1.5 py-1.5 font-medium">F</th>
            <th className="text-center px-1.5 py-1.5 font-medium">Mål</th>
            <th className="text-center px-1.5 py-1.5 font-medium">D</th>
            <th className="text-center px-2 py-1.5 font-bold">P</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const sv = TEAM_EN_TO_SV[r.team] ?? r.team;
            const qualifies = i < 2;
            const thirdPlace = i === 2;
            return (
              <tr key={r.team} className={`border-b border-border last:border-0 ${qualifies ? "bg-success/5" : thirdPlace ? "bg-warning/5" : ""}`}>
                <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                <td className="px-1 py-2">
                  <div className="flex items-center gap-1.5">
                    <TeamFlag name={r.team} />
                    <span className="font-medium">{sv}</span>
                  </div>
                </td>
                <td className="text-center px-1.5 py-2 text-muted-foreground">{r.played}</td>
                <td className="text-center px-1.5 py-2 text-muted-foreground">{r.won}</td>
                <td className="text-center px-1.5 py-2 text-muted-foreground">{r.drawn}</td>
                <td className="text-center px-1.5 py-2 text-muted-foreground">{r.lost}</td>
                <td className="text-center px-1.5 py-2 text-muted-foreground">{r.gf}–{r.ga}</td>
                <td className="text-center px-1.5 py-2 text-muted-foreground">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                <td className="text-center px-2 py-2 font-bold">{r.pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BracketPage() {
  const r16Left = [
    { top: { label: "1E" }, bottom: { label: "3 ABCDF" } },
    { top: { label: "1I" }, bottom: { label: "3 CDFGH" } },
    { top: { label: "2A" }, bottom: { label: "2B" } },
    { top: { label: "1F" }, bottom: { label: "2C" } },
    { top: { label: "2K" }, bottom: { label: "2L" } },
    { top: { label: "1H" }, bottom: { label: "2J" } },
    { top: { label: "1D" }, bottom: { label: "3 BEFIJ" } },
    { top: { label: "1G" }, bottom: { label: "3 AEHIJ" } },
  ];

  const r16Right = [
    { top: { label: "1C" }, bottom: { label: "2F" } },
    { top: { label: "2E" }, bottom: { label: "2I" } },
    { top: { label: "1A" }, bottom: { label: "3 CEFHI" } },
    { top: { label: "1L" }, bottom: { label: "3 EHIJK" } },
    { top: { label: "1J" }, bottom: { label: "2H" } },
    { top: { label: "2D" }, bottom: { label: "2G" } },
    { top: { label: "1B" }, bottom: { label: "3 EFGIJ" } },
    { top: { label: "1K" }, bottom: { label: "3 DEIJL" } },
  ];

  const qfLeft = [
    { top: { label: "Vinnare 16-del 1" }, bottom: { label: "Vinnare 16-del 2" } },
    { top: { label: "Vinnare 16-del 3" }, bottom: { label: "Vinnare 16-del 4" } },
    { top: { label: "Vinnare 16-del 5" }, bottom: { label: "Vinnare 16-del 6" } },
    { top: { label: "Vinnare 16-del 7" }, bottom: { label: "Vinnare 16-del 8" } },
  ];

  const qfRight = [
    { top: { label: "Vinnare 16-del 9" }, bottom: { label: "Vinnare 16-del 10" } },
    { top: { label: "Vinnare 16-del 11" }, bottom: { label: "Vinnare 16-del 12" } },
    { top: { label: "Vinnare 16-del 13" }, bottom: { label: "Vinnare 16-del 14" } },
    { top: { label: "Vinnare 16-del 15" }, bottom: { label: "Vinnare 16-del 16" } },
  ];

  const sfLeft = [
    { top: { label: "Vinnare Å1" }, bottom: { label: "Vinnare Å2" } },
    { top: { label: "Vinnare Å3" }, bottom: { label: "Vinnare Å4" } },
  ];

  const sfRight = [
    { top: { label: "Vinnare Å5" }, bottom: { label: "Vinnare Å6" } },
    { top: { label: "Vinnare Å7" }, bottom: { label: "Vinnare Å8" } },
  ];

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">VM-bracket 2026</h1>
      <p className="text-sm text-muted-foreground">Uppdateras när lagen är klara efter gruppspelet.</p>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Grupper</h2>
        <div className="space-y-3">
          {WC_GROUPS.map(g => <GroupTable key={g.letter} group={g} />)}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Slutspel</h2>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            <div className="flex flex-col gap-2">
              <Round title="16-delsfinal (vänster)" matchups={r16Left} />
            </div>
            <div className="flex flex-col gap-2">
              <Round title="Åttondelsfinal" matchups={qfLeft} />
            </div>
            <div className="flex flex-col gap-2">
              <Round title="Kvartsfinal" matchups={sfLeft} />
            </div>
            <div className="flex flex-col items-center justify-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-center">Semifinal & Final</p>
              <Matchup top={{ label: "KV-vinnare 1" }} bottom={{ label: "KV-vinnare 2" }} />
              <div className="mt-2 rounded-xl border-2 border-primary px-3 py-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Världsmästare</p>
                <p className="text-sm font-bold text-primary">?</p>
              </div>
              <div className="mt-1 rounded-lg border border-border px-3 py-1.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Bronsmatch</p>
                <p className="text-xs font-semibold">SF-förlorare</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Round title="Kvartsfinal" matchups={sfRight} />
            </div>
            <div className="flex flex-col gap-2">
              <Round title="Åttondelsfinal" matchups={qfRight} />
            </div>
            <div className="flex flex-col gap-2">
              <Round title="16-delsfinal (höger)" matchups={r16Right} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
