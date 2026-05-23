import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/rules")({
  component: RulesPage,
});

function RulesPage() {
  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Regler · VM-tips 2026</h1>

      <section className="rounded-2xl bg-card border border-border p-4 space-y-2">
        <h2 className="font-semibold text-lg">1. Före VM-start</h2>
        <p className="text-sm text-muted-foreground">Lämnas in senast vid första avspark (11 juni).</p>
        <table className="w-full text-sm mt-2">
          <tbody>
            <tr className="border-b border-border"><td className="py-1.5">🏆 VM-vinnare</td><td className="text-right font-semibold">10 p</td></tr>
            <tr className="border-b border-border"><td className="py-1.5">🥈 Finalist</td><td className="text-right font-semibold">5 p</td></tr>
            <tr className="border-b border-border"><td className="py-1.5">🥉 Semifinalist (per st)</td><td className="text-right font-semibold">3 p</td></tr>
            <tr><td className="py-1.5">⚽ Skyttekung</td><td className="text-right font-semibold">5 p</td></tr>
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground pt-1">Max ca 26 p — påverkar, men avgör inte.</p>
      </section>

      <section className="rounded-2xl bg-card border border-border p-4 space-y-2">
        <h2 className="font-semibold text-lg">2. Tippa varje match</h2>
        <p className="text-sm text-muted-foreground">
          Resultat ska tippas <strong>innan avspark</strong>. Efter det låses matchen.
        </p>
      </section>

      <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <h2 className="font-semibold text-lg">Poängsystem · matcher</h2>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Gruppspel</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border"><td className="py-1.5">Rätt vinnare / oavgjort</td><td className="text-right font-semibold">1 p</td></tr>
              <tr className="border-b border-border"><td className="py-1.5">Rätt målskillnad</td><td className="text-right font-semibold">2 p</td></tr>
              <tr><td className="py-1.5">Exakt resultat</td><td className="text-right font-semibold">4 p</td></tr>
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Åttondel</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border"><td className="py-1.5">Rätt vinnare</td><td className="text-right font-semibold">2 p</td></tr>
              <tr className="border-b border-border"><td className="py-1.5">Rätt målskillnad</td><td className="text-right font-semibold">3 p</td></tr>
              <tr><td className="py-1.5">Exakt resultat</td><td className="text-right font-semibold">5 p</td></tr>
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Kvartsfinal</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border"><td className="py-1.5">Rätt vinnare</td><td className="text-right font-semibold">3 p</td></tr>
              <tr className="border-b border-border"><td className="py-1.5">Rätt målskillnad</td><td className="text-right font-semibold">4 p</td></tr>
              <tr><td className="py-1.5">Exakt resultat</td><td className="text-right font-semibold">6 p</td></tr>
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Semifinal & bronsmatch</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border"><td className="py-1.5">Rätt vinnare</td><td className="text-right font-semibold">4 p</td></tr>
              <tr className="border-b border-border"><td className="py-1.5">Rätt målskillnad</td><td className="text-right font-semibold">5 p</td></tr>
              <tr><td className="py-1.5">Exakt resultat</td><td className="text-right font-semibold">8 p</td></tr>
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Final</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border"><td className="py-1.5">Rätt vinnare</td><td className="text-right font-semibold">5 p</td></tr>
              <tr className="border-b border-border"><td className="py-1.5">Rätt målskillnad</td><td className="text-right font-semibold">8 p</td></tr>
              <tr><td className="py-1.5">Exakt resultat</td><td className="text-right font-semibold">12 p</td></tr>
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground pt-1">
          Alla matcher räknas på <strong>resultat efter 90 min</strong> (innan ev. förlängning/straffar).
        </p>
      </section>

      <section className="rounded-2xl bg-card border border-border p-4 space-y-2">
        <h2 className="font-semibold text-lg">⭐ Joker</h2>
        <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
          <li>Du har <strong>2 jokrar</strong> totalt under hela VM.</li>
          <li>En joker <strong>dubblar poängen</strong> på den matchen.</li>
          <li>Måste sättas <strong>innan avspark</strong>.</li>
        </ul>
      </section>

      <section className="rounded-2xl bg-card border border-border p-4 space-y-2">
        <h2 className="font-semibold text-lg">Färgkoder</h2>
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2"><span className="inline-block size-4 rounded bg-success" /> Exakt resultat</div>
          <div className="flex items-center gap-2"><span className="inline-block size-4 rounded bg-warning" /> Rätt vinnare</div>
          <div className="flex items-center gap-2"><span className="inline-block size-4 rounded bg-destructive" /> Fel</div>
        </div>
      </section>

      <section className="rounded-2xl bg-card border border-border p-4 space-y-2">
        <h2 className="font-semibold text-lg">Sidopriser</h2>
        <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
          <li>🏅 <strong>Matchtips-kungen</strong> — flest poäng på matchtips</li>
          <li>💥 <strong>Årets skräll</strong> — bästa tips på en skrällmatch</li>
          <li>🐢 <strong>Jumbo</strong> — sista plats (med heder)</li>
        </ul>
      </section>
    </div>
  );
}
