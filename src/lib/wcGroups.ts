// VM 2026 grupper – central källa
export const WC_GROUPS: { letter: string; color: string; teams: string[]; teamsEn: string[] }[] = [
  { letter: "A", color: "text-green-500",   teams: ["Mexiko", "Sydafrika", "Sydkorea", "Tjeckien"],           teamsEn: ["Mexico", "South Africa", "South Korea", "Czechia"] },
  { letter: "B", color: "text-red-500",     teams: ["Kanada", "Bosnien", "Qatar", "Schweiz"],                 teamsEn: ["Canada", "Bosnia", "Qatar", "Switzerland"] },
  { letter: "C", color: "text-yellow-500",  teams: ["Brasilien", "Marocko", "Haiti", "Skottland"],            teamsEn: ["Brazil", "Morocco", "Haiti", "Scotland"] },
  { letter: "D", color: "text-blue-500",    teams: ["USA", "Paraguay", "Australien", "Turkiet"],              teamsEn: ["USA", "Paraguay", "Australia", "Turkey"] },
  { letter: "E", color: "text-purple-500",  teams: ["Tyskland", "Curaçao", "Elfenbenskusten", "Ecuador"],     teamsEn: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"] },
  { letter: "F", color: "text-orange-500",  teams: ["Nederländerna", "Japan", "Sverige", "Tunisien"],         teamsEn: ["Netherlands", "Japan", "Sweden", "Tunisia"] },
  { letter: "G", color: "text-pink-500",    teams: ["Belgien", "Egypten", "Iran", "Nya Zeeland"],             teamsEn: ["Belgium", "Egypt", "Iran", "New Zealand"] },
  { letter: "H", color: "text-teal-500",    teams: ["Spanien", "Kap Verde", "Saudiarabien", "Uruguay"],       teamsEn: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"] },
  { letter: "I", color: "text-indigo-500",  teams: ["Frankrike", "Senegal", "Irak", "Norge"],                 teamsEn: ["France", "Senegal", "Iraq", "Norway"] },
  { letter: "J", color: "text-cyan-500",    teams: ["Argentina", "Österrike", "Algeriet", "Jordanien"],       teamsEn: ["Argentina", "Austria", "Algeria", "Jordan"] },
  { letter: "K", color: "text-emerald-500", teams: ["Portugal", "Colombia", "Uzbekistan", "DR Kongo"],        teamsEn: ["Portugal", "Colombia", "Uzbekistan", "DR Congo"] },
  { letter: "L", color: "text-rose-500",    teams: ["England", "Kroatien", "Ghana", "Panama"],                teamsEn: ["England", "Croatia", "Ghana", "Panama"] },
];

// English team name → group letter
export const TEAM_EN_TO_GROUP: Record<string, string> = Object.fromEntries(
  WC_GROUPS.flatMap(g => g.teamsEn.map(en => [en, g.letter]))
);

// English team name → Swedish team name
export const TEAM_EN_TO_SV: Record<string, string> = Object.fromEntries(
  WC_GROUPS.flatMap(g => g.teamsEn.map((en, i) => [en, g.teams[i]]))
);
