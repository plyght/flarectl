import type { GeoTraffic } from "../types/analytics.ts";

const ASCII_WORLD_MAP = `
         . _..::__:  ,-"-"._       |7       ,     _,.__
 _.___ _ _<_>'   _googʌ.. . _googʌ      .-''-.__.-'00  .:' .ŌG\.
.googʌ      . GGG7)=-'   GGG ,googʌ    (_ o  7) -b-.  :.googʌ .
 '-''-._'-' (_googʌ  ,.googʌ  . . ) (__  _) 7 o  :(googʌ
           'googʌ.googʌ         , googʌʌ .    :googʌ .
              :googʌ            :googʌ 7 6 Ⅳ
               _,googʌ'googʌ .:'..googʌ        'googʌ .
              |,-'goo.     |    GΟΟG,               :7 H. '"
                    ''googleʌ.._googʌ .    (__.- o:googʌ  o  ( (  - o:
                         'googʌ  : '  .:   o      :.
                                 '-.googʌ__googʌ'
`;

const WORLD_MAP_SIMPLE = [
  "                              ╭─────────────────────────────────────────────────────────────────────╮",
  "                              │                         ·  ·      ·                                 │",
  "                              │               ··· ····  ▪▪▪·   · ···                                │",
  "                              │            ··▪▪▪▪▪▪·  ·▪▪▪▪▪▪▪▪▪▪▪·                                 │",
  "                              │          ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪                                │",
  "                              │         ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪                              │",
  "                              │        ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪                             │",
  "                              │       ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪·                            │",
  "                              │       ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪·                             │",
  "                              │        ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪·                               │",
  "                              │          ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪·                                   │",
  "                              │             ·▪▪▪▪▪▪▪▪▪·                                             │",
  "                              │                ·····                                                │",
  "                              ╰─────────────────────────────────────────────────────────────────────╯",
];

const COMPACT_WORLD_MAP = [
  "┌──────────────────────────────────────────────────────────────────┐",
  "│                      GLOBAL TRAFFIC DISTRIBUTION                 │",
  "├──────────────────────────────────────────────────────────────────┤",
  "│            _____                                                 │",
  "│       ,---'     '----.                    .---.                  │",
  "│      /   NA     EU   \\___     AS        /  AU  \\                │",
  "│     /                    \\             /        \\               │",
  "│    │                      │   .--.    │          │              │",
  "│    │   ◉ US    ◉ DE      │  / CN \\   │   ◉     │              │",
  "│     \\          ◉ GB     /  |◉    |    \\________/               │",
  "│      \\   ◉ BR         /    '----'                               │",
  "│       '----_____.----'        ◉ IN                              │",
  "│             SA           AF                                      │",
  "└──────────────────────────────────────────────────────────────────┘",
];

const COUNTRY_POSITIONS: Record<string, { row: number; col: number }> = {
  US: { row: 4, col: 8 },
  CA: { row: 3, col: 10 },
  MX: { row: 5, col: 9 },
  BR: { row: 7, col: 14 },
  AR: { row: 8, col: 13 },
  GB: { row: 3, col: 28 },
  DE: { row: 3, col: 32 },
  FR: { row: 4, col: 29 },
  IT: { row: 4, col: 32 },
  ES: { row: 4, col: 27 },
  NL: { row: 3, col: 30 },
  SE: { row: 2, col: 31 },
  PL: { row: 3, col: 34 },
  RU: { row: 2, col: 42 },
  CN: { row: 4, col: 48 },
  JP: { row: 4, col: 56 },
  KR: { row: 4, col: 54 },
  IN: { row: 5, col: 44 },
  AU: { row: 8, col: 56 },
  NZ: { row: 9, col: 60 },
  SG: { row: 6, col: 50 },
  HK: { row: 5, col: 52 },
  TW: { row: 5, col: 54 },
  ID: { row: 7, col: 52 },
  TH: { row: 5, col: 48 },
  VN: { row: 5, col: 50 },
  MY: { row: 6, col: 49 },
  PH: { row: 5, col: 55 },
  ZA: { row: 8, col: 34 },
  NG: { row: 6, col: 30 },
  EG: { row: 5, col: 34 },
  SA: { row: 5, col: 38 },
  AE: { row: 5, col: 40 },
  IL: { row: 5, col: 36 },
  TR: { row: 4, col: 36 },
};

const HEAT_CHARS = ["░", "▒", "▓", "█"];
const HEAT_COLORS = ["#3B82F6", "#22C55E", "#EAB308", "#EF4444"];

export interface WorldMapData {
  countryCode: string;
  value: number;
  label?: string;
}

export interface WorldMapOptions {
  width?: number;
  showLegend?: boolean;
  showTop?: number;
  title?: string;
}

export function generateWorldMapData(geoTraffic: GeoTraffic[]): WorldMapData[] {
  return geoTraffic.map((g) => ({
    countryCode: g.countryCode,
    value: g.requests,
    label: g.countryName,
  }));
}

export function renderWorldMapWithHeat(data: WorldMapData[], options: WorldMapOptions = {}): string[] {
  const { showLegend = true, showTop = 10, title = "Geographic Traffic Distribution" } = options;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const lines: string[] = [];

  lines.push("┌" + "─".repeat(68) + "┐");
  lines.push("│" + title.padStart(34 + Math.floor(title.length / 2)).padEnd(68) + "│");
  lines.push("├" + "─".repeat(68) + "┤");
  lines.push("│                                                                    │");
  lines.push("│          ╭───────╮                   ╭─────╮                       │");
  lines.push("│       ╭──┤ NA    │───╮            ╭──┤ EU  │──╮       ╭───╮        │");
  lines.push("│      ╭┴──┴───────┴───┴╮          ╭┴──┴─────┴──┴╮   ╭──┤ AS│──╮     │");
  lines.push("│      │                │          │             │   │         │     │");
  lines.push("│      │    ◉ US        │          │  ◉ DE ◉ GB  │   │  ◉ CN   │     │");
  lines.push("│      │                │          │  ◉ FR       │   │    ◉ JP │     │");
  lines.push("│      ╰───┬───────┬────╯          ╰──────┬──────╯   │  ◉ IN   │     │");
  lines.push("│          │ SA    │                      │          ╰────┬────╯     │");
  lines.push("│       ╭──┴───────┴──╮               ╭───┴──╮         ╭──┴──╮       │");
  lines.push("│       │   ◉ BR      │               │ AF   │         │ AU  │       │");
  lines.push("│       │             │               │◉ ZA  │         │  ◉  │       │");
  lines.push("│       ╰─────────────╯               ╰──────╯         ╰─────╯       │");
  lines.push("│                                                                    │");
  lines.push("├" + "─".repeat(68) + "┤");

  if (showLegend && data.length > 0) {
    lines.push("│  TOP COUNTRIES BY TRAFFIC:                                         │");
    lines.push("│                                                                    │");

    const sortedData = [...data].sort((a, b) => b.value - a.value).slice(0, showTop);
    const maxBarWidth = 35;

    for (const item of sortedData) {
      const percentage = (item.value / maxValue) * 100;
      const barWidth = Math.round((item.value / maxValue) * maxBarWidth);
      const heatIndex = Math.min(Math.floor(percentage / 25), HEAT_CHARS.length - 1);
      const heatChar = HEAT_CHARS[heatIndex] ?? "░";
      
      const bar = heatChar.repeat(barWidth);
      const countryName = (item.label ?? item.countryCode).substring(0, 18).padEnd(18);
      const percentStr = percentage.toFixed(1).padStart(5) + "%";
      
      const line = `│  ${item.countryCode} ${countryName} ${bar.padEnd(maxBarWidth)} ${percentStr}  │`;
      lines.push(line);
    }

    lines.push("│                                                                    │");
    lines.push("│  Heat: ░ <25% ▒ 25-50% ▓ 50-75% █ >75%                            │");
  }

  lines.push("└" + "─".repeat(68) + "┘");

  return lines;
}

export function renderSimpleWorldMap(data: WorldMapData[], options: WorldMapOptions = {}): string[] {
  const { title = "Traffic by Region" } = options;

  const regionMap: Record<string, number> = {
    NA: 0,
    SA: 0,
    EU: 0,
    AF: 0,
    AS: 0,
    OC: 0,
  };

  const countryToRegion: Record<string, string> = {
    US: "NA", CA: "NA", MX: "NA",
    BR: "SA", AR: "SA", CL: "SA", CO: "SA",
    GB: "EU", DE: "EU", FR: "EU", IT: "EU", ES: "EU", NL: "EU", SE: "EU", PL: "EU", CH: "EU", AT: "EU", BE: "EU", IE: "EU", DK: "EU", NO: "EU", FI: "EU", PT: "EU", CZ: "EU", RO: "EU", HU: "EU", GR: "EU",
    RU: "EU", UA: "EU", TR: "EU",
    ZA: "AF", NG: "AF", EG: "AF",
    CN: "AS", JP: "AS", KR: "AS", IN: "AS", SG: "AS", HK: "AS", TW: "AS", ID: "AS", TH: "AS", VN: "AS", MY: "AS", PH: "AS", SA: "AS", AE: "AS", IL: "AS",
    AU: "OC", NZ: "OC",
  };

  for (const item of data) {
    const region = countryToRegion[item.countryCode];
    if (region) {
      regionMap[region] = (regionMap[region] ?? 0) + item.value;
    }
  }

  const totalTraffic = Object.values(regionMap).reduce((a, b) => a + b, 0);
  const lines: string[] = [];

  lines.push("┌" + "─".repeat(50) + "┐");
  lines.push("│" + title.padStart(25 + Math.floor(title.length / 2)).padEnd(50) + "│");
  lines.push("├" + "─".repeat(50) + "┤");

  const regions = [
    { code: "NA", name: "North America", emoji: "🌎" },
    { code: "SA", name: "South America", emoji: "🌎" },
    { code: "EU", name: "Europe", emoji: "🌍" },
    { code: "AF", name: "Africa", emoji: "🌍" },
    { code: "AS", name: "Asia", emoji: "🌏" },
    { code: "OC", name: "Oceania", emoji: "🌏" },
  ];

  for (const region of regions) {
    const value = regionMap[region.code] ?? 0;
    const percentage = totalTraffic > 0 ? (value / totalTraffic) * 100 : 0;
    const barWidth = Math.round(percentage / 100 * 25);
    const bar = "█".repeat(barWidth).padEnd(25, "░");
    
    lines.push(`│  ${region.name.padEnd(14)} ${bar} ${percentage.toFixed(1).padStart(5)}%  │`);
  }

  lines.push("├" + "─".repeat(50) + "┤");
  lines.push(`│  Total Requests: ${totalTraffic.toLocaleString().padStart(30)}  │`);
  lines.push("└" + "─".repeat(50) + "┘");

  return lines;
}

export function renderTopCountriesTable(geoTraffic: GeoTraffic[], limit = 10): string[] {
  const lines: string[] = [];
  const sortedData = [...geoTraffic].sort((a, b) => b.requests - a.requests).slice(0, limit);

  lines.push("┌────┬────────────────────┬──────────────┬─────────────┬─────────┐");
  lines.push("│ #  │ Country            │ Requests     │ Bandwidth   │ Share   │");
  lines.push("├────┼────────────────────┼──────────────┼─────────────┼─────────┤");

  sortedData.forEach((item, index) => {
    const rank = (index + 1).toString().padStart(2);
    const country = item.countryName.substring(0, 18).padEnd(18);
    const requests = formatCompact(item.requests).padStart(12);
    const bandwidth = formatBytes(item.bandwidth).padStart(11);
    const share = item.percentage.toFixed(1).padStart(5) + "%";

    lines.push(`│ ${rank} │ ${country} │ ${requests} │ ${bandwidth} │ ${share} │`);
  });

  lines.push("└────┴────────────────────┴──────────────┴─────────────┴─────────┘");

  return lines;
}

function formatCompact(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + "B";
  if (value >= 1e6) return (value / 1e6).toFixed(1) + "M";
  if (value >= 1e3) return (value / 1e3).toFixed(1) + "K";
  return value.toString();
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return size.toFixed(1) + " " + units[unitIndex];
}

export function getCountryFlag(countryCode: string): string {
  const flagMap: Record<string, string> = {
    US: "🇺🇸", GB: "🇬🇧", DE: "🇩🇪", FR: "🇫🇷", CN: "🇨🇳", JP: "🇯🇵",
    IN: "🇮🇳", BR: "🇧🇷", CA: "🇨🇦", AU: "🇦🇺", KR: "🇰🇷", RU: "🇷🇺",
    IT: "🇮🇹", ES: "🇪🇸", MX: "🇲🇽", NL: "🇳🇱", SG: "🇸🇬", HK: "🇭🇰",
    TW: "🇹🇼", ID: "🇮🇩", TR: "🇹🇷", CH: "🇨🇭", PL: "🇵🇱", SE: "🇸🇪",
  };
  return flagMap[countryCode] ?? "🏳️";
}
