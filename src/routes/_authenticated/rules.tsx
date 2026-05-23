import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/rules")({
  component: RulesPage,
});

const ENTRY_FEE = 150;
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
  const { data: profiles } = useQuery({
    queryKey: ["profiles-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id");
      if (error) throw error;
      return data;
    },
  });

  const participants = profiles?.length ?? 0;
  const pot = participants * ENTRY_FEE;
  const prize1 = Math.round((pot - 300 - 150) * 0.6);
  const prize2 = Math.round((pot - 300 - 150) * 0.3);
  const fmt = (n: number) => n.toLocaleString("sv-SE");

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Regler · VM-tips 2026</h1>

      <Card title="💰 Anmälningsavgift & Prispott">
        <p className="text-sm text-muted-foreground">
          Det kostar <strong>150 kr</strong> att delta. Swisha till Jenny Kim
          <strong className="text-foreground">{SWISH_NUMBER}</strong> och skriv ditt namn i meddelandet.
        </p>

        <div className="rounded-xl bg-muted p-3 text-center space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total prispott</p>
          <p className="text-3xl font-bold text-primary">{fmt(pot)} kr</p>
          <p className="text-xs text-muted-foreground">{participants} deltagare × 150 kr</p>
        </div>

        <div>
          <PrizeRow emoji="🥇" label="Totalsegrare" amount={`${fmt(prize1)} kr`} note="60% av potten" />
          <PrizeRow emoji="🥈" label="Tvåa" amount={`${fmt(prize2)} kr`} note="30% av potten" />
          <PrizeRow emoji="🎯" label="Matchtips-kung" amount="300 kr" note="Fast pris" />
          <PrizeRow emoji="🤡" label="Sistaplatspris" amount="150 kr" note="Pengarna tillbaka" />
        </div>

        <p className="text-xs text-muted-foreground">
          Prispotten uppdateras automatiskt när fler anmäler sig.
        </p>
      </Card>

      <Card title="1. Före VM-start">
        <p className="text-sm text-muted-foreground">Lämnas in senast vid första avspark (11 juni).</p>
        <PointsTable rows={[
          { label: "🏆 VM-vinnare", points: "10 p" },
          { label: "🥈 Finalist", points: "5 p" },
          { label: "🥉 Semifinalist (per st)", points: "3 p" },
          { label: "⚽ Skyttekung", points: "5 p" },
        ]} />
        <p className="text-xs text-muted-foreground">Max ca 26 p — påverkar, men avgör inte.</p>
      </Card>

      <Card title="2. Tippa varje match">
        <p className="text-sm text-muted-foreground">
          Resultat ska tippas <strong>innan avspark</strong>. Efter det låses matchen.
        </p>
      </Card>

      <Card title="Poängsystem · matcher">
        <StagePoints stage="Gruppspel" rows={[
          { label: "Rätt vinnare / oavgjort", points: "1 p" },
          { label: "Rätt målskillnad", points: "2 p" },
          { label: "Exakt resultat", points: "4 p" },
        ]} />
        <StagePoints stage="Åttondel" rows={[
          { label: "Rätt vinnare", points: "2 p" },
          { label: "Rätt målskillnad", points: "3 p" },
          { label: "Exakt resultat", points: "5 p" },
        ]} />
        <StagePoints stage="Kvartsfinal" rows={[
          { label: "Rätt vinnare", points: "3 p" },
          { label: "Rätt målskillnad", points: "4 p" },
          { label: "Exakt resultat", points: "6 p" },
        ]} />
        <StagePoints stage="Semifinal & bronsmatch" rows={[
          { label: "Rätt vinnare", points: "4 p" },
          { label: "Rätt målskillnad", points: "5 p" },
          { label: "Exakt resultat", points: "8 p" },
        ]} />
        <StagePoints stage="Final" rows={[
          { label: "Rätt vinnare", points: "5 p" },
          { label: "Rätt målskillnad", points: "8 p" },
          { label: "Exakt resultat", points: "12 p" },
        ]} />
        <p className="text-xs text-muted-foreground">
          Alla matcher räknas på <strong>resultat efter 90 min</strong> (innan ev. förlängning/straffar).
        </p>
      </Card>

      <Card title="⭐ Joker">
        <ul className="text-sm space-y-1.5 text-muted-foreground list-disc list-inside">
          <li>Du har <strong>2 jokrar</strong> totalt under hela VM.</li>
          <li>En joker <strong>dubblar poängen</strong> på den matchen.</li>
          <li>Måste sättas <strong>innan avspark</strong>.</li>
        </ul>
      </Card>

      <Card title="Färgkoder">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2"><span className="inline-block size-4 rounded bg-success" /> Exakt resultat</div>
          <div className="flex items-center gap-2"><span className="inline-block size-4 rounded bg-warning" /> Rätt vinnare</div>
          <div className="flex items-center gap-2"><span className="inline-block size-4 rounded bg-destructive" /> Fel</div>
        </div>
      </Card>

      <Card title="Sidopriser">
        <ul className="text-sm space-y-1.5 text-muted-foreground list-disc list-inside">
          <li>🏅 <strong>Matchtips-kungen</strong> — flest poäng på matchtips</li>
          <li>💥 <strong>Årets skräll</strong> — bästa tips på en skrällmatch</li>
          <li>🐢 <strong>Jumbo</strong> — sista plats (med heder)</li>
        </ul>
      </Card>
    </div>
  );
}
