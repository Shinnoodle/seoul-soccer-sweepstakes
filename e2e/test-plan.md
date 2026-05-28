# Playwright Test Plan – Seoul Soccer Sweepstakes

## Setup

- **App URL:** http://localhost:5173
- **Test user email:** TEST_EMAIL (see e2e/.env)
- **Test user password:** TEST_PASSWORD (see e2e/.env)
- Start the dev server with `bun run dev` before testing.

---

## Flows

### 1. Login
1. Navigate to http://localhost:5173
2. Should redirect to `/login`
3. Enter test email and password
4. Click "Logga in"
5. **Expect:** Redirected to `/today`

### 2. Today page – submit a pick and verify done status
1. Land on `/today`
2. **Expect:** Page title "Idag" is visible
3. If there are unlocked match cards today:
   - Find a match card that hasn't been picked yet
   - Enter a home score and away score (e.g. 2–1)
   - Click save
   - **Expect:** Pick is saved without error
   - **Expect:** In the "Tippstatus" section of the next match countdown (or the match card itself), the test user's name appears in the ✅ "klara" list, not in the ⏳ "kvar" list
4. If no matches today, check the countdown card:
   - **Expect:** Countdown to next match is visible
   - **Expect:** Tippstatus section shows who has picked and who hasn't

### 3. Points calculation
1. Navigate to `/leaderboard` and note the test user's current **total points**
2. Navigate to `/matches` and find a **finished** match where the test user has not yet submitted a pick
3. Note the match **stage** (group / r16 / qf / sf / final) and the **actual result** (e.g. 2–1)
4. Submit a pick for that match:
   - **Scenario A – exact score:** enter the exact result (e.g. 2–1)
   - **Scenario B – correct outcome:** enter a different score with the same winner (e.g. 3–1)
   - **Scenario C – wrong outcome:** enter a score with the wrong winner (e.g. 0–2)
5. Navigate back to `/leaderboard` and check the test user's new total points
6. **Expect the increase to match the scoring rules (exakt = dubbla utgångspoängen):**

| Stage | Exakt | Rätt utgång | Fel |
|-------|-------|-------------|-----|
| Gruppspel | +4 | +2 | +0 |
| 16-delsfinal (r16) | +4 | +2 | +0 |
| Åttondelsfinal (r8) | +6 | +3 | +0 |
| Kvartsfinal (qf) | +8 | +4 | +0 |
| Semifinal / Bronsmatch | +10 | +5 | +0 |
| Final | +12 | +6 | +0 |

### 4. Leaderboard
1. Navigate to `/leaderboard`
2. **Expect:** Table tab is active by default
3. **Expect:** At least one row with a player name and points
4. Click the "Tips" tab
5. **Expect:** Tab content changes
6. Click the "Statistik" tab
7. **Expect:** Tab content changes

### 4. Matches
1. Navigate to `/matches`
2. **Expect:** Match list loads with fixtures
3. **Expect:** Group stage matches are visible

### 5. Bracket – grundstruktur
1. Navigate to `/bracket`
2. **Expect:** Page loads without error
3. **Expect:** Two tabs visible: "Grupper" (active by default) and "Slutspel"
4. **Expect:** All 12 group tables (Grupp A–L) are visible under Grupper-fliken
5. **Expect:** Each group table has column headers: S, V, O, F, Mål, D, P
6. **Expect:** Each group table has exactly 4 rows (one per team)
7. **Expect:** Team flags are visible next to team names
8. Click "Slutspel" tab
9. **Expect:** Bracket with rounds (16-delsfinal, Åttondelsfinal, Kvartsfinal, Semifinal & Final) is visible
10. **Expect:** "Världsmästare ?"-box is in the center

### 5b. Bracket – standings calculation
**Pre-condition:** At least one group stage match must have a result in the database (home_score and away_score set, finished = true). Use the admin panel to add a result if needed.

Example: set Mexico 2–1 South Africa (Grupp A match).

1. Navigate to `/bracket`
2. Find the "Grupp A" table
3. **Expect:** Mexiko row shows: S=1, V=1, O=0, F=0, Mål=2–1, D=+1, P=3
4. **Expect:** Sydafrika row shows: S=1, V=0, O=0, F=1, Mål=1–2, D=–1, P=0
5. **Expect:** Mexiko appears above Sydafrika (sorted by points)
6. **Expect:** The winning team's row has a green-tinted background (qualifies indicator)

Example: set South Korea 1–1 Czechia (Grupp A match).

7. **Expect:** Sydkorea row shows: S=1, V=0, O=1, F=0, Mål=1–1, D=0, P=1
8. **Expect:** Tjeckien row shows: S=1, V=0, O=1, F=0, Mål=1–1, D=0, P=1
9. **Expect:** Standings order in Grupp A: Mexiko (3p) → Sydkorea (1p) / Tjeckien (1p) → Sydafrika (0p)

### 5c. Bracket – live update when match finishes
**Pre-condition:** Dev server is running. A group stage match exists without a result.

1. Navigate to `/bracket` and note current standings for one group (all zeros)
2. In the admin panel, set a result for one of that group's matches (e.g. 2–0) and mark it as finished
3. Return to `/bracket` (or wait up to 60 seconds for auto-refresh)
4. **Expect:** The standings table for that group now reflects the new result — points, goals, and goal difference updated
5. **Expect:** Teams are re-sorted by points after the result

### 5d. Leaderboard – profilkort
1. Navigate to `/leaderboard`
2. Click on another player's name (not the test user)
3. **Expect:** Modal opens with player name
4. **Expect:** Three sections visible: "Turneringstips", "Slutspelslag", "Matchtips"
5. **Expect:** Before VM-start (11 juni 2026): Turneringstips and Slutspelslag both show "Dolt fram till VM-start (11 juni 2026)."
6. **Expect:** After VM-start: sections show actual picks if the player has submitted them
7. Click own name ("du"-badge)
8. **Expect:** Own turneringstips and slutspelslag are visible (even before VM-start) if filled in

### 6. Chat
1. Navigate to `/chat`
2. **Expect:** Chat messages load
3. Type a test message and send
4. **Expect:** Message appears in the chat

### 7. Profile
1. Navigate to `/profile`
2. **Expect:** User's display name is visible
3. **Expect:** Tournament picks section is shown (long-term picks, R16 picks)

### 8. Logout
1. From any authenticated page, find and click logout
2. **Expect:** Redirected to `/login`
3. **Expect:** Navigating to `/today` redirects back to `/login`

---

## What to report

For each flow: ✅ pass, ❌ fail (with screenshot and description of what went wrong), or ⚠️ partial (loaded but something looked off).
