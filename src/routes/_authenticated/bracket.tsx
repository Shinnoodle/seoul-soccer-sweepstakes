import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WC_GROUPS } from "@/lib/wcGroups";
import { calculateGroupStandings } from "@/lib/standings";
import { teamFlag, TeamFlag } from "@/lib/teamFlags";
import { seDayKey } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/bracket")({
  component: BracketPage,
});

const SE_TZ = "Europe/Stockholm";
const SLOT = 92; // px: vertical height per R16 slot in bracket grid

// ── Date helper ───────────────────────────────────────────────────────────────

function fmtBracketDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const matchDay = seDayKey(iso);
  const todayDay = seDayKey(now.toISOString());
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = seDayKey(tomorrow.toISOString());
  const time = d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: SE_TZ });
  if (matchDay === todayDay) return `I dag · ${time}`;
  if (matchDay === tomorrowDay) return `I morgon · ${time}`;
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "long", timeZone: SE_TZ }) + " · " + time;
}

// ── Team abbreviations ────────────────────────────────────────────────────────

const ABBR: Record<string, string> = {
  "Mexiko": "MEX", "Sydafrika": "RSA", "Sydkorea": "KOR", "Tjeckien": "CZE",
  "Kanada": "CAN", "Bosnien": "BIH", "Qatar": "QAT", "Schweiz": "SUI",
  "Brasilien": "BRA", "Marocko": "MAR", "Haiti": "HAI", "Skottland": "SCO",
  "USA": "USA", "Paraguay": "PAR", "Australien": "AUS", "Turkiet": "TUR",
  "Tyskland": "GER", "Curaçao": "CUW", "Elfenbenskusten": "CIV", "Ecuador": "ECU",
  "Nederländerna": "NED", "Japan": "JPN", "Sverige": "SWE", "Tunisien": "TUN",
  "Belgien": "BEL", "Egypten": "EGY", "Iran": "IRN", "Nya Zeeland": "NZL",
  "Spanien": "ESP", "Kap Verde": "CPV", "Saudiarabien": "KSA", "Uruguay": "URU",
  "Frankrike": "FRA", "Senegal": "SEN", "Irak": "IRQ", "Norge": "NOR",
  "Argentina": "ARG", "Österrike": "AUT", "Algeriet": "ALG", "Jordanien": "JOR",
  "Portugal": "POR", "Colombia": "COL", "Uzbekistan": "UZB", "DR Kongo": "COD",
  "England": "ENG", "Kroatien": "CRO", "Ghana": "GHA", "Panama": "PAN",
  // ISO alpha-3 fallbacks (used when DB stores ISO codes instead of Swedish names)
  "DZA": "ALG", "CIV": "CIV", "COD": "COD", "CPV": "CPV",
};

function teamAbbr(name: string): string {
  if (!name || name === "TBD") return "TBD";
  return ABBR[name] ?? (name.length <= 4 ? name : name.slice(0, 3).toUpperCase());
}

// ── Types ─────────────────────────────────────────────────────────────────────

type KO = {
  match_number: number;
  stage: string;
  kickoff: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  finished: boolean;
};

// ── Match card ────────────────────────────────────────────────────────────────

function TeamRow({ name, score, finished }: { name: string; score: number | null; finished: boolean }) {
  const flag = teamFlag(name);
  const isTbd = !name || name === "TBD";
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5">
      <span className="text-base leading-none w-5 shrink-0 text-center">{isTbd ? "🏳️" : (flag || "🏳️")}</span>
      <span className={`flex-1 text-[11px] font-bold tracking-wide ${isTbd ? "text-muted-foreground" : ""}`}>
        {teamAbbr(name)}
      </span>
      <span className={`text-[11px] w-4 text-right font-bold ${finished ? "" : "text-muted-foreground"}`}>
        {finished && score !== null ? score : "–"}
      </span>
    </div>
  );
}

function MatchCard({ match, dateStr }: { match?: KO | null; dateStr?: string | null }) {
  const home = match?.home_team ?? "TBD";
  const away = match?.away_team ?? "TBD";
  const ds = match?.kickoff ? fmtBracketDate(match.kickoff) : (dateStr ?? null);
  return (
    <div className="flex flex-col" style={{ minWidth: 118 }}>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <TeamRow name={home} score={match?.home_score ?? null} finished={match?.finished ?? false} />
        <div className="h-px bg-border" />
        <TeamRow name={away} score={match?.away_score ?? null} finished={match?.finished ?? false} />
      </div>
      <p className={`text-[10px] text-center mt-1 leading-tight ${ds ? "text-muted-foreground" : "text-transparent select-none"}`}>
        {ds ?? "–"}
      </p>
    </div>
  );
}

// ── Bracket column (grid-positioned) ─────────────────────────────────────────

function BracketCol({
  items,
  slotsEach,
  totalSlots,
  label,
}: {
  items: (KO | null | undefined)[];
  slotsEach: number;
  totalSlots: number;
  label?: string;
}) {
  return (
    <div className="relative flex-shrink-0" style={{ height: totalSlots * SLOT }}>
      {label && (
        <p className="absolute -top-5 left-0 right-0 text-[9px] font-bold uppercase tracking-wide text-muted-foreground text-center whitespace-nowrap">
          {label}
        </p>
      )}
      {items.map((m, i) => (
        <div
          key={i}
          className="absolute flex items-center justify-center"
          style={{ top: i * slotsEach * SLOT, height: slotsEach * SLOT }}
        >
          <MatchCard match={m ?? null} />
        </div>
      ))}
    </div>
  );
}

function TbdCol({
  dates,
  slotsEach,
  totalSlots,
  label,
}: {
  dates: string[];
  slotsEach: number;
  totalSlots: number;
  label?: string;
}) {
  return (
    <div className="relative flex-shrink-0" style={{ height: totalSlots * SLOT }}>
      {label && (
        <p className="absolute -top-5 left-0 right-0 text-[9px] font-bold uppercase tracking-wide text-muted-foreground text-center whitespace-nowrap">
          {label}
        </p>
      )}
      {dates.map((d, i) => (
        <div
          key={i}
          className="absolute flex items-center justify-center"
          style={{ top: i * slotsEach * SLOT, height: slotsEach * SLOT }}
        >
          <MatchCard dateStr={fmtBracketDate(d)} />
        </div>
      ))}
    </div>
  );
}

// ── Bracket connectors ────────────────────────────────────────────────────────

function Connectors({
  count,
  slotsPerGroup,
  totalSlots,
}: {
  count: number;
  slotsPerGroup: number;
  totalSlots: number;
}) {
  return (
    <div className="relative flex-shrink-0 w-4" style={{ height: totalSlots * SLOT }}>
      {Array.from({ length: count }).map((_, i) => {
        const groupTop = i * slotsPerGroup * SLOT;
        const groupH = slotsPerGroup * SLOT;
        const q = groupH / 4;
        const mid = groupTop + groupH / 2;
        return (
          <div key={i}>
            <div className="absolute bg-border" style={{ right: 0, top: groupTop + q, width: 1, height: groupH / 2 }} />
            <div className="absolute bg-border" style={{ top: mid, left: 0, right: 0, height: 1 }} />
          </div>
        );
      })}
    </div>
  );
}

function ConnectorsLeft({
  count,
  slotsPerGroup,
  totalSlots,
}: {
  count: number;
  slotsPerGroup: number;
  totalSlots: number;
}) {
  return (
    <div className="relative flex-shrink-0 w-4" style={{ height: totalSlots * SLOT }}>
      {Array.from({ length: count }).map((_, i) => {
        const groupTop = i * slotsPerGroup * SLOT;
        const groupH = slotsPerGroup * SLOT;
        const q = groupH / 4;
        const mid = groupTop + groupH / 2;
        return (
          <div key={i}>
            <div className="absolute bg-border" style={{ left: 0, top: groupTop + q, width: 1, height: groupH / 2 }} />
            <div className="absolute bg-border" style={{ top: mid, left: 0, right: 0, height: 1 }} />
          </div>
        );
      })}
    </div>
  );
}

// ── Group table (unchanged) ───────────────────────────────────────────────────

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
  return calculateGroupStandings(matches ?? []);
}

function GroupTable({ group }: { group: typeof WC_GROUPS[0] }) {
  const standings = useGroupStandings();
  const sorted = standings.get(group.letter);
  if (!sorted) return null;
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
            const qualifies = i < 2;
            const thirdPlace = i === 2;
            return (
              <tr key={r.team} className={`border-b border-border last:border-0 ${qualifies ? "bg-success/5" : thirdPlace ? "bg-warning/5" : ""}`}>
                <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                <td className="px-1 py-2">
                  <div className="flex items-center gap-1.5">
                    <TeamFlag name={r.team} />
                    <span className="font-medium">{r.team}</span>
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

// ── Main page ─────────────────────────────────────────────────────────────────

// Approximate dates for SF-bridge (Kvartsfinal) rounds — not yet in DB
const QF_BRIDGE_DATES = [
  "2026-07-09T17:00:00Z", // Left QF-1 (9 juli 19:00 sv)
  "2026-07-10T19:00:00Z", // Left QF-2 (10 juli 21:00 sv)
  "2026-07-11T17:00:00Z", // Right QF-1 (11 juli 19:00 sv)
  "2026-07-12T19:00:00Z", // Right QF-2 (12 juli 21:00 sv)
];

function BracketPage() {
  const { data: koMatches } = useQuery({
    queryKey: ["ko-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("match_number,stage,kickoff,home_team,away_team,home_score,away_score,finished")
        .in("stage", ["r16", "r8", "qf", "sf", "third", "final"])
        .order("match_number");
      if (error) throw error;
      return data as KO[];
    },
    refetchInterval: 60000,
  });

  const r16 = (koMatches ?? []).filter(m => m.stage === "r16");
  const qf  = (koMatches ?? []).filter(m => m.stage === "r8");
  const sf  = (koMatches ?? []).filter(m => m.stage === "sf");
  const bronze = (koMatches ?? []).find(m => m.stage === "third") ?? null;
  const final  = (koMatches ?? []).find(m => m.stage === "final") ?? null;

  const r16L = r16.slice(0, 8);
  const r16R = r16.slice(8, 16);
  const qfL  = qf.slice(0, 4);
  const qfR  = qf.slice(4, 8);
  const sf1  = sf[0] ?? null;
  const sf2  = sf[1] ?? null;

  const N = 8; // total slot rows

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">VM-bracket 2026</h1>

      <Tabs defaultValue="grupper">
        <TabsList className="w-full">
          <TabsTrigger value="grupper" className="flex-1">Grupper</TabsTrigger>
          <TabsTrigger value="slutspel" className="flex-1">Slutspel</TabsTrigger>
        </TabsList>

        <TabsContent value="grupper" className="space-y-3 mt-4">
          {WC_GROUPS.map(g => <GroupTable key={g.letter} group={g} />)}
        </TabsContent>

        <TabsContent value="slutspel" className="mt-6">
          <div className="overflow-x-auto pb-6">
            <div className="flex gap-0 items-start" style={{ paddingTop: 20 }}>

              {/* ── LEFT SIDE ── */}
              <BracketCol items={r16L} slotsEach={1} totalSlots={N} label="16-delsfinal" />
              <Connectors count={4} slotsPerGroup={2} totalSlots={N} />
              <BracketCol items={qfL} slotsEach={2} totalSlots={N} label="Åttondelsfinal" />
              <Connectors count={2} slotsPerGroup={4} totalSlots={N} />
              <TbdCol dates={QF_BRIDGE_DATES.slice(0, 2)} slotsEach={4} totalSlots={N} label="Kvartsfinal" />

              {/* ── CENTER ── */}
              <div
                className="relative flex-shrink-0 flex items-center gap-3 px-4"
                style={{ height: N * SLOT }}
              >
                {/* Left SF (mn 97) */}
                <div className="flex flex-col items-center gap-1">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Semifinal</p>
                  <MatchCard match={sf1} />
                </div>

                {/* Final + Bronze */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-3xl leading-none">🏆</span>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-primary">Final</p>
                  <MatchCard match={final} />
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mt-2">Bronsmatch</p>
                  <MatchCard match={bronze} />
                </div>

                {/* Right SF (mn 98) */}
                <div className="flex flex-col items-center gap-1">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Semifinal</p>
                  <MatchCard match={sf2} />
                </div>
              </div>

              {/* ── RIGHT SIDE (mirror) ── */}
              <TbdCol dates={QF_BRIDGE_DATES.slice(2, 4)} slotsEach={4} totalSlots={N} label="Kvartsfinal" />
              <ConnectorsLeft count={2} slotsPerGroup={4} totalSlots={N} />
              <BracketCol items={qfR} slotsEach={2} totalSlots={N} label="Åttondelsfinal" />
              <ConnectorsLeft count={4} slotsPerGroup={2} totalSlots={N} />
              <BracketCol items={r16R} slotsEach={1} totalSlots={N} label="16-delsfinal" />

            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
