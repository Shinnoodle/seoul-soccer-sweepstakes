import { createFileRoute } from "@tanstack/react-router";

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
      { name: "Komorerna", flag: "🇰🇲" },
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
      { name: "Eritrea", flag: "🇪🇷" },
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {GROUPS.map((g) => (
            <GroupCard key={g.name} {...g} />
          ))}
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
