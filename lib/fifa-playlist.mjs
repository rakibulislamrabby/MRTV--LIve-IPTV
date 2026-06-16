const countryNames = {
  "🇦🇱": "Albania",
  "🇦🇷": "Argentina",
  "🇦🇹": "Austria",
  "🇧🇬": "Bulgaria",
  "🇧🇷": "Brazil",
  "🇨🇱": "Chile",
  "🇨🇴": "Colombia",
  "🇨🇿": "Czechia",
  "🇩🇪": "Germany",
  "🇪🇸": "Spain",
  "🇫🇷": "France",
  "🇬🇧": "United Kingdom",
  "🇭🇰": "Hong Kong",
  "🇭🇺": "Hungary",
  "🇮🇳": "India",
  "🇮🇱": "Israel",
  "🇮🇹": "Italy",
  "🇲🇴": "Macau",
  "🇲🇽": "Mexico",
  "🇳🇱": "Netherlands",
  "🇳🇴": "Norway",
  "🇵🇹": "Portugal",
  "🇶🇦": "Qatar",
  "🇷🇴": "Romania",
  "🇷🇺": "Russia",
  "🇸🇦": "Saudi Arabia",
  "🇹🇲": "Turkmenistan",
  "🇹🇷": "Turkey",
  "🇺🇦": "Ukraine",
};

const groupPatterns = [
  [/^(AR\s*\||.*\bARG\b|.*Argentina|.*🇦🇷)/i, "Argentina"],
  [/^(MX\s*\||.*Mexico|.*🇲🇽)/i, "Mexico"],
  [/^(USA\s*\||.*NBC|.*NBA|.*Fox Soccer|.*Universo)/i, "USA"],
  [/Latino|TUDN|Claro|Telemundo|Azteca|Win Sports|TyC|Tigo/i, "Latino"],
  [/ESPN/i, "ESPN"],
  [/FOX/i, "Fox"],
  [/beIN|BEIN/i, "beIN"],
  [/DAZN/i, "DAZN"],
  [/SKY|Sky/i, "Sky"],
  [/Матч|Setanta|OTT|🇷🇺/i, "Eastern Europe"],
  [/SPORT|Sports|Sport|Deportes|Futbol|Football|Golf|Liga|LALIGA/i, "Sports"],
];

function parseAttributes(value) {
  const attributes = {};
  const pattern = /([\w-]+)="([^"]*)"/g;
  let match = pattern.exec(value);

  while (match) {
    attributes[match[1]] = match[2];
    match = pattern.exec(value);
  }

  return attributes;
}

function hash(value) {
  let current = 0;

  for (let index = 0; index < value.length; index += 1) {
    current = (current << 5) - current + value.charCodeAt(index);
    current |= 0;
  }

  return Math.abs(current).toString(36);
}

function cleanName(value) {
  return value
    .replace(/^✔️\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferCountry(name) {
  const flag = Object.keys(countryNames).find((emoji) => name.includes(emoji));
  if (flag) {
    return countryNames[flag];
  }

  if (/\b(ARG|AR)\b/i.test(name)) return "Argentina";
  if (/\b(MX)\b/i.test(name)) return "Mexico";
  if (/\b(USA)\b/i.test(name)) return "USA";
  if (/Latino/i.test(name)) return "Latin America";

  return undefined;
}

function inferGroup(name, groupTitle) {
  if (groupTitle?.trim()) {
    return groupTitle.trim();
  }

  const country = inferCountry(name);
  if (country) {
    return country;
  }

  const match = groupPatterns.find(([pattern]) => pattern.test(name));
  return match?.[1] ?? "Live Sports";
}

function resolveLogo(name, attributes) {
  if (attributes["tvg-logo"]) {
    return attributes["tvg-logo"];
  }

  if (/bein/i.test(name)) return "/logos/bein-sports.svg";
  if (/tudn/i.test(name)) return "/logos/tudn.svg";
  if (/\bT Sports\b/i.test(name) && !/tyc/i.test(name)) return "/logos/t-sports.svg";
  if (/tyc/i.test(name)) return "/logos/tyc-sports.svg";
  if (/euro\s*sport/i.test(name)) return "/logos/eurosport.svg";
  if (/fifa/i.test(name)) {
    return "https://raw.githubusercontent.com/Rakib49/Rakibiptv/main/images%20(11).jpeg";
  }

  return undefined;
}

export function parseFifaPlaylistContent(playlist) {
  const lines = playlist
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const channels = [];
  let currentInfo;

  for (const line of lines) {
    if (line.startsWith("#EXTINF")) {
      currentInfo = line;
      continue;
    }

    if (line.startsWith("#")) {
      continue;
    }

    if (!currentInfo || !/^https?:\/\//i.test(line)) {
      continue;
    }

    const metadata = currentInfo.replace(/^#EXTINF:-?\d+\s*/i, "");
    const attributes = parseAttributes(metadata);
    const [, fallbackName = "Untitled channel"] = metadata.match(/,(.*)$/) ?? [];
    const name = cleanName(attributes["tvg-name"] || fallbackName);
    const group = inferGroup(name, attributes["group-title"]);
    const url = line;
    const id = `fifa-channel-${hash(`${name}-${url}`)}-${channels.length + 1}`;

    channels.push({
      id,
      name,
      url,
      group,
      logo: resolveLogo(name, attributes),
      source: "fifa-channel",
    });

    currentInfo = undefined;
  }

  return channels;
}
