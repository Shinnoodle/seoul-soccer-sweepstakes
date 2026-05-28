# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bracket-standings-ui.spec.ts >> VM-trädet – grupptabeller >> varje grupp har 4 lagrader
- Location: e2e/bracket-standings-ui.spec.ts:36:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "http://localhost:5173/today" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - img [ref=e6]
    - heading "Sweepstakes" [level=1] [ref=e12]
    - paragraph [ref=e13]: VM tips 2026
    - paragraph [ref=e14]: Logga in
  - generic [ref=e15]:
    - textbox "E-post" [ref=e16]
    - textbox "Lösenord (min 6 tecken)" [ref=e17]
    - paragraph [ref=e18]: missing email or phone
    - button "Logga in" [ref=e19]
  - button "Inget konto? Skapa ett" [ref=e20]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";
  4  | const EMAIL = process.env.TEST_EMAIL!;
  5  | const PASSWORD = process.env.TEST_PASSWORD!;
  6  | 
  7  | async function login(page: any) {
  8  |   await page.goto(`${BASE_URL}/login`);
  9  |   await page.fill('input[type="email"]', EMAIL);
  10 |   await page.fill('input[type="password"]', PASSWORD);
  11 |   await page.click('button[type="submit"]');
> 12 |   await page.waitForURL(`${BASE_URL}/today`);
     |              ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  13 | }
  14 | 
  15 | test.describe("VM-trädet – grupptabeller", () => {
  16 |   test.beforeEach(async ({ page }) => {
  17 |     await login(page);
  18 |     await page.goto(`${BASE_URL}/bracket`);
  19 |   });
  20 | 
  21 |   test("alla 12 grupper visas", async ({ page }) => {
  22 |     for (const letter of "ABCDEFGHIJKL") {
  23 |       await expect(page.getByText(`Grupp ${letter}`)).toBeVisible();
  24 |     }
  25 |   });
  26 | 
  27 |   test("varje grupptabell har rätt kolumnrubriker", async ({ page }) => {
  28 |     const headers = ["S", "V", "O", "F", "Mål", "D", "P"];
  29 |     // Kontrollera första gruppen
  30 |     const firstTable = page.locator("table").first();
  31 |     for (const header of headers) {
  32 |       await expect(firstTable.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
  33 |     }
  34 |   });
  35 | 
  36 |   test("varje grupp har 4 lagrader", async ({ page }) => {
  37 |     const tables = page.locator("table");
  38 |     const count = await tables.count();
  39 |     expect(count).toBe(12);
  40 | 
  41 |     for (let i = 0; i < count; i++) {
  42 |       const rows = tables.nth(i).locator("tbody tr");
  43 |       await expect(rows).toHaveCount(4);
  44 |     }
  45 |   });
  46 | 
  47 |   test("poäng och statistik börjar på 0 när inga matcher är spelade", async ({ page }) => {
  48 |     // Hämta alla P-celler (sista kolumnen) och kontrollera att de visar 0
  49 |     const pointsCells = page.locator("tbody tr td:last-child");
  50 |     const count = await pointsCells.count(); // 12 grupper × 4 lag = 48
  51 |     for (let i = 0; i < count; i++) {
  52 |       await expect(pointsCells.nth(i)).toHaveText("0");
  53 |     }
  54 |   });
  55 | });
  56 | 
```