import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { usePool } from "@/hooks/usePool";



export const Route = createFileRoute("/_authenticated/rules")({
  component: RulesPage,
});

const SWISH_NUMBER = "0767-687974";

// ---- help components ----

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
      <h2 className="font-semibold text-lg">{title}</h2>
      {children}
    </section>
  );
}

function PointsTable({ rows }: { rows: { label: string; points: string }[] }) {
  return (
    <div className="space-y-1">
      {rows.map(({ label, points }) => (
        <div key={label} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
          <span>{label}</span>
          <span className="font-semibold">{points}</span>
        </div>
      ))}
    </div>
  );
}

function StagePoints({ stage, rows }: { stage: string; rows: { label: string; points: string }[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{stage}</h3>
      <PointsTable rows={rows} />
    </div>
  );
}

function PrizeRow({ emoji, label, amount, note }: { emoji: string; label: string; amount: string; note: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
      <span>{emoji} {label}</span>
      <div className="text-right">
        <span className="font-semibold">{amount}</span>
        <span className="text-muted-foreground text-xs ml-2">{note}</span>
      </div>
    </div>
  );
}

// ---- main comp ----

function RulesPage() {
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
      return data.map(m => m.user_id);
    },
  });

  const { data: approvedProfiles } = useQuery({
    queryKey: ["profiles-approved"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id").eq("approved", true);
      if (error) throw error;
      return new Set(data.map(p => p.id));
    },
  });

  const isFreePool = (selectedPool?.entry_fee ?? -1) === 0;
  const entryFee = selectedPool?.entry_fee ?? 200;
  const participants = poolMembers != null && approvedProfiles != null
    ? poolMembers.filter(id => isFreePool || approvedProfiles.has(id)).length
    : null;
  const pot = participants != null ? participants * entryFee : null;
  const prize1 = pot != null ? Math.round((pot - 300 - 300 - 200) * 0.6) : null;
  const prize2 = pot != null ? Math.round((pot - 300 - 300 - 200) * 0.3) : null;
  const fmt = (n: number) => n.toLocaleString("sv-SE");

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Regler · VM-tips 2026</h1>

      <Card title="💰 Anmälningsavgift & Prispott">
        <p className="text-sm text-muted-foreground">
          För att delta swisha Jenny Kim <strong>{entryFee} kr</strong>
          <strong className="text-foreground"> {SWISH_NUMBER}</strong> och skriv ditt namn i meddelandet.
        </p>

        <div className="rounded-xl bg-muted p-3 text-center space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total prispott</p>
          <p className="text-3xl font-bold text-primary">{pot != null ? `${fmt(pot)} kr` : "–"}</p>
          <p className="text-xs text-muted-foreground">{participants} deltagare × {entryFee} kr</p>
        </div>

        <div>
          <PrizeRow emoji="🥇" label="Totalsegrare" amount={prize1 != null ? `${fmt(prize1)} kr` : "–"} note="60% av potten" />
          <PrizeRow emoji="🥈" label="Tvåa" amount={prize2 != null ? `${fmt(prize2)} kr` : "–"} note="30% av potten" />
          <PrizeRow emoji="🎯" label="Matchtips-kungen" amount="300 kr" note="Fast pris" />
          <PrizeRow emoji="💥" label="VM skrällen" amount="300 kr" note="Fast pris" />
          <PrizeRow emoji="🔮" label="VM-Oraklet" amount="TBD" note="Fast pris" />
          <PrizeRow emoji="🤡" label="Jumbopriset" amount="200 kr" note="Pengarna tillbaka" />
        </div>

<div className="text-xs text-muted-foreground space-y-1 pt-1">
          <p>Prispotten uppdateras automatiskt när fler anmäler sig.</p>
          <p>🎯 Matchtips-kungen — flest poäng på matchtips</p>
          <p>💥 VM skrällen — flest prickade skrällmatcher</p>
          <p>🔮 VM-Oraklet — flest poäng i förhandstips/turneringstips</p>
          <p>🤡 Jumbopriset — sista plats (med heder)</p>
        </div>
      </Card>

      <Card title="1. Turneringstips (före VM-start)">
        <p className="text-sm text-muted-foreground">
          Lämnas in senast vid första avspark (11 juni). Totalt <strong>4 lag ska sättas i semifinal</strong>:
          vinnaren, finalisten och de två som åker ut i semifinal.
        </p>
        <PointsTable rows={[
          { label: "🏆 VM-vinnare", points: "10 p" },
          { label: "🥈 Finalist (förlorare i final)", points: "5 p" },
          { label: "🥉 Semifinalist (de 2 som åker ut i semi)", points: "3 p / st" },
          { label: "⚽ Skyttekung", points: "5 p" },
        ]} />
        <p className="text-xs text-muted-foreground">Max ca 26 p — påverkar, men avgör inte.</p>
        <p className="text-xs text-muted-foreground">
          Se allas tips på <Link to="/leaderboard" className="text-primary underline">leaderboard-sidan</Link>.
        </p>
      </Card>

      <Card title="2. Slutspelslagen (före VM-start)">
        <p className="text-sm text-muted-foreground">
          För varje grupp (A–L) markerar du <strong className="text-foreground">👑 gruppvinnare</strong>,{" "}
          <strong className="text-foreground">2:a</strong> och <strong className="text-foreground">3:a</strong>.
          Låses vid första avspark.
        </p>
        <PointsTable rows={[
          { label: "Lag till slutspel (gruppvinnare eller 2:a)", points: "2 p / st" },
          { label: "Bonus: rätt gruppvinnare", points: "+1 p" },
          { label: "Bonus: rätt 3:a", points: "+1 p" },
        ]} />
        <p className="text-xs text-muted-foreground">
          Fylls i på <Link to="/profile" className="text-primary underline">profilsidan</Link>.
        </p>
      </Card>

      <Card title="2. Tippa varje match">
        <p className="text-sm text-muted-foreground">
          Resultat ska tippas <strong>innan avspark</strong>. Efter det låses matchen.
        </p>
      </Card>

      <Card title="Poängsystem · matcher">
        <StagePoints stage="Gruppspel" rows={[
          { label: "Rätt vinnare / oavgjort", points: "2 p" },
          { label: "Exakt resultat", points: "4 p" },
        ]} />
        <StagePoints stage="Åttondel" rows={[
          { label: "Rätt vinnare", points: "3 p" },
          { label: "Exakt resultat", points: "5 p" },
        ]} />
        <StagePoints stage="Kvartsfinal" rows={[
          { label: "Rätt vinnare", points: "4 p" },
          { label: "Exakt resultat", points: "6 p" },
        ]} />
        <StagePoints stage="Semifinal & bronsmatch" rows={[
          { label: "Rätt vinnare", points: "5 p" },
          { label: "Exakt resultat", points: "8 p" },
        ]} />
        <StagePoints stage="Final" rows={[
          { label: "Rätt vinnare", points: "6 p" },
          { label: "Exakt resultat", points: "12 p" },
        ]} />
        <p className="text-xs text-muted-foreground">
          Alla resultat räknas vid <strong>fulltid (90 min)</strong> — eventuell förlängning och straffar ignoreras.
        </p>
      </Card>

      <Card title="⭐ Joker">
        <ul className="text-sm space-y-1.5 text-muted-foreground list-disc list-inside">
          <li>Varje deltagare har <strong>3 joker-matcher</strong> under gruppspelet.</li>
          <li>Joker måste deklareras <strong>före avspark</strong> och dubblar poängen för matchen.</li>
          <li>Jokrar får <strong>endast användas under gruppspelet</strong>.</li>
        </ul>
      </Card>

      <Card title="💥 Skrällbonus">
        <p className="text-sm text-muted-foreground">
          Du får <strong>+1 bonuspoäng</strong> om färre än hälften av deltagarna tippade samma utgång som du — och du hade rätt.
        </p>
        <details className="group">
          <summary className="text-xs font-semibold text-primary cursor-pointer list-none flex items-center gap-1 pt-1">
            <span className="group-open:hidden">▶ Visa exempel</span>
            <span className="hidden group-open:inline">▼ Dölj exempel</span>
          </summary>
          <div className="mt-2 rounded-lg bg-muted p-3 space-y-2 text-sm">
            <p className="text-muted-foreground text-xs">15 deltagare tippar Brasilien–Japan:</p>
            <div className="space-y-1">
              {[
                { outcome: "Brasilien vinner", count: 10 },
                { outcome: "Oavgjort", count: 3 },
                { outcome: "Japan vinner", count: 2 },
              ].map(({ outcome, count }) => (
                <div key={outcome} className="flex justify-between text-xs py-1 border-b border-border last:border-0">
                  <span>{outcome}</span>
                  <span className="font-semibold">{count} st</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Japan vinner. De 2 som tippade rätt får vanliga poäng <strong>+ 1 skrällbonus</strong> eftersom färre än hälften (7,5) tippade Japan.
            </p>
          </div>
        </details>
      </Card>
      <Card title="Färgkoder">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2"><span className="inline-block size-4 rounded bg-success" /> Exakt resultat</div>
          <div className="flex items-center gap-2"><span className="inline-block size-4 rounded bg-warning" /> Rätt vinnare</div>
          <div className="flex items-center gap-2"><span className="inline-block size-4 rounded bg-destructive" /> Fel</div>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground text-center pb-2">
        Byggd av Jenny Kim för privat bruk — en hobbyprojekt utan garantier. Buggar förekommer (rapportera dem gärna!).
      </p>
    </div>
  );
}
