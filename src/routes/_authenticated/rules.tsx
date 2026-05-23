import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/rules")({
  component: RulesPage,
});

const ENTRY_FEE = 150;
const SWISH_NUMBER = "0767-687974";

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

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Regler · VM-tips 2026</h1>

      <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <h2 className="font-semibold text-lg">💰 Anmälningsavgift & Prispott</h2>
        <p className="text-sm text-muted-foreground">
          Det kostar <strong>150 kr</strong> att delta. Swisha till{" "}
          <strong className="text-foreground">{SWISH_NUMBER}</strong> och skriv ditt namn i meddelandet.
        </p>

        <div className="rounded-xl bg-muted p-3 text-center space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total prispott</p>
          <p className="text-3xl font-bold text-primary">{pot.toLocaleString("sv-SE")} kr</p>
          <p className="text-xs text-muted-foreground">{participants} deltagare × 150 kr</p>
        </div>

        <table className="w-full text-sm mt-2">
          <tbody>
            <tr className="border-b border-border">
              <td className="py-1.5">🥇 Totalsegrare</td>
              <td className="text-right font-semibold">{prize1.toLocaleString("sv-SE")} kr</td>
              <td className="text-right text-muted-foreground text-xs pl-2">60% av potten</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-1.5">🥈 Tvåa</td>
              <td className="text-right font-semibold">{prize2.toLocaleString("sv-SE")} kr</td>
              <td className="text-right text-muted-foreground text-xs pl-2">30% av potten</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-1.5">🎯 Matchtips-kung</td>
              <td className="text-right font-semibold">300 kr</td>
              <td className="text-right text-muted-foreground text-xs pl-2">Fast pris</td>
            </tr>
            <tr>
              <td className="py-1.5">🤡 Sistaplatspris</td>
              <td className="text-right font-semibold">150 kr</td>
              <td className="text-right text-muted-foreground text-xs pl-2">Pengarna tillbaka</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground pt-1">
          Prispotten uppdateras automatiskt när fler anmäler sig.
        </p>
      </section>

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
