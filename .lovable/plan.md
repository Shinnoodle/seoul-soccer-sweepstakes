
## VM-Tips 2026 – mobilvänlig webbapp

En enkel app som alla ~10 deltagare öppnar i mobilen (sparas som genväg på hemskärmen, känns som en app). Bygger på Lovable Cloud för login, databas och automatisk poängräkning.

### Så funkar det för deltagarna

1. **Logga in** med mejl (magic link – inget lösenord att glömma)
2. **Långtidstips** fylls i en gång – låses automatiskt vid VM-start
3. **Matchtips** – swipa mellan matcher, fyll i resultat, låses vid avspark
4. **Joker** – varje spelare markerar 2 matcher med dubbla poäng (innan avspark)
5. **Leaderboard** – live totalställning, sticky längst ner i appen

### Vyer

- **Idag** – dagens matcher att tippa + dagens facit/poäng
- **Alla matcher** – hela schemat, filter på grupp/slutspel
- **Min profil** – mina tips, mina jokrar, mina poäng per dag
- **Leaderboard** – totalställning + sidopriser (Matchtips-kung, Årets skräll, Jumbo)
- **Admin** – en utvald person matar in facit; allt annat räknas automatiskt

### Poängsystem (exakt som du beskrev)

- **Långtidstips:** VM-vinnare 10p, Finalist 5p, Semi 3p/st, Skyttekung 5p
- **Gruppspel:** rätt utgång 1p / rätt målskillnad 2p / exakt 4p
- **Åttondel:** 2p / 5p · **Kvart:** 3p / 6p · **Semi:** 4p / 8p · **Final:** 5p / 12p
- Slutspel räknas efter 90 min (straffar ignoreras)
- Joker dubblar poängen på vald match
- Missat tips före avspark = 0p

### Visuellt

- Mobile-first, stora touch-ytor
- 🟩 exakt / 🟨 rätt vinnare / 🟥 fel på varje tips
- Sverige-känsla men inte tråkig: djupblå bakgrund, gul accent, ren typografi
- Funkar offline-läsning av redan inlämnade tips

### Teknisk del

- **Databas:** `profiles`, `matches` (förladdat VM-schema, 48 lag / 104 matcher), `long_term_picks`, `match_picks`, `jokers`, `results`
- **RLS:** ingen ser andras matchtips förrän avspark passerat – sen syns allt
- **Auth:** magic link (mejl)
- **Poäng:** räknas server-side när admin sparar facit, cacheas på leaderboard

### Saker jag tar för givet (säg till om du vill ändra)

- Magic link via mejl (inget lösenord, inget Google-krav)
- VM-schemat 2026 förladdas; admin kan justera tider om FIFA flyttar nåt
- En person (du?) blir admin för facit-inmatning
- Sparas som genväg på hemskärmen istället för riktig App Store-app

Säg till om du vill att jag kör – eller om något ska bort/läggas till innan.
