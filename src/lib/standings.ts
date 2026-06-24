import { WC_GROUPS, TEAM_EN_TO_GROUP } from "./wcGroups";

// DB may use official FIFA names that differ from our display names
const TEAM_ALIASES: Record<string, string> = {
  "Türkiye": "Turkey",
  "Côte d'Ivoire": "Ivory Coast",
  "IR Iran": "Iran",
  "Korea Republic": "South Korea",
  "Korea DPR": "North Korea",
  "DR Congo": "DR Congo",
  "Curacao": "Curaçao",
};

function normalize(name: string): string {
  return TEAM_ALIASES[name] ?? name;
}

export type StandingRow = {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
};

type Match = {
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
};

export function calculateGroupStandings(matches: Match[]): Map<string, StandingRow[]> {
  const rows = new Map<string, Map<string, StandingRow>>();

  for (const g of WC_GROUPS) {
    const groupRows = new Map<string, StandingRow>();
    for (const en of g.teamsEn) {
      groupRows.set(en, { team: en, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
    }
    rows.set(g.letter, groupRows);
  }

  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) continue;
    const homeName = normalize(m.home_team);
    const awayName = normalize(m.away_team);
    const group = TEAM_EN_TO_GROUP[homeName] ?? TEAM_EN_TO_GROUP[awayName];
    if (!group) continue;
    const groupRows = rows.get(group)!;
    const home = groupRows.get(homeName);
    const away = groupRows.get(awayName);
    if (!home || !away) continue;

    home.played++; away.played++;
    home.gf += m.home_score; home.ga += m.away_score;
    away.gf += m.away_score; away.ga += m.home_score;
    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;

    if (m.home_score > m.away_score) {
      home.won++; home.pts += 3; away.lost++;
    } else if (m.home_score < m.away_score) {
      away.won++; away.pts += 3; home.lost++;
    } else {
      home.drawn++; home.pts++;
      away.drawn++; away.pts++;
    }
  }

  const result = new Map<string, StandingRow[]>();
  for (const [letter, groupRows] of rows) {
    const sorted = [...groupRows.values()].sort(
      (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team)
    );
    result.set(letter, sorted);
  }

  return result;
}
