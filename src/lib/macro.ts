export type PairId = "AUDCAD" | "BTCUSD";
export type Timeframe = "daily" | "h1" | "news";

export const PAIRS: Record<PairId, { label: string; sub: string; base: number; digits: number }> = {
  AUDCAD: { label: "AUD/CAD", sub: "flux temps réel", base: 0.9042, digits: 4 },
  BTCUSD: { label: "BTC/USD", sub: "flux temps réel", base: 64339, digits: 0 },
};

export type Importance = "faible" | "moyenne" | "forte";
export type Category =
  | "Politique monétaire"
  | "Inflation"
  | "Flux & liquidité"
  | "Croissance"
  | "Risque global";

export type MacroEvent = {
  id: string;
  title: string;
  source: string;
  whitelisted: boolean;
  category: Category;
  importance: Importance;
  direction: "haussier" | "baissier" | "neutre";
  weight: number;
  detail: string;
  timeframe: Timeframe;
};

export type Quote = {
  price: number;
  changePct: number;
  low: number;
  high: number;
};

export const PIPELINE_STEPS = [
  { n: 1, title: "Collecte des données", desc: "Prix + flux macro (daily / H1 / news)" },
  { n: 2, title: "Validation des sources", desc: "Liste blanche, rumeurs écartées" },
  { n: 3, title: "Classification", desc: "Politique monétaire, inflation, flux…" },
  { n: 4, title: "Mesure de l'importance", desc: "Faible / moyenne / forte" },
  { n: 5, title: "Contexte actuel", desc: "Régime macro et position du prix" },
  { n: 6, title: "Interactions", desc: "Événements qui se renforcent ou s'annulent" },
  { n: 7, title: "Biais macro", desc: "Haussier / baissier / neutre" },
  { n: 8, title: "Niveau de confiance", desc: "Score 0–100 justifié" },
] as const;

export const WHITELIST = [
  "Reserve Bank of Australia",
  "Banque du Canada",
  "Statistique Canada",
  "ABS Australie",
  "Federal Reserve",
  "BLS",
  "CME FedWatch",
  "Glassnode",
  "Farside ETF Flows",
];

const REJECTED: [string, string, string] = ["Rumeur X / anonyme", "Blog non identifié", "Signal Telegram"];

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildQuote(pair: PairId, seed: number): Quote {
  const rnd = mulberry(seed + pair.length * 977);
  const cfg = PAIRS[pair];
  const drift = (rnd() - 0.45) * (pair === "BTCUSD" ? 0.045 : 0.012);
  const price = cfg.base * (1 + drift);
  const range = pair === "BTCUSD" ? 0.024 : 0.006;
  return {
    price,
    changePct: drift * 100,
    low: price * (1 - range * (0.6 + rnd() * 0.6)),
    high: price * (1 + range * (0.6 + rnd() * 0.6)),
  };
}

export function formatPrice(pair: PairId, value: number) {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: PAIRS[pair].digits,
    maximumFractionDigits: PAIRS[pair].digits,
  });
}

type Seed = Omit<MacroEvent, "id" | "whitelisted"> & { whitelisted?: boolean };

const AUDCAD_FEED: Seed[] = [
  {
    title: "RBA maintient le taux directeur, ton prudent",
    source: "Reserve Bank of Australia",
    category: "Politique monétaire",
    importance: "forte",
    direction: "haussier",
    weight: 3,
    detail: "Aucune baisse signalée à court terme, soutien du différentiel de taux pour l'AUD.",
    timeframe: "daily",
  },
  {
    title: "IPC canadien au-dessus du consensus (3,1 %)",
    source: "Statistique Canada",
    category: "Inflation",
    importance: "forte",
    direction: "baissier",
    weight: 3,
    detail: "Inflation collante au Canada : marché repousse les baisses de la BoC, CAD soutenu.",
    timeframe: "news",
  },
  {
    title: "Emploi australien meilleur qu'attendu",
    source: "ABS Australie",
    category: "Croissance",
    importance: "moyenne",
    direction: "haussier",
    weight: 2,
    detail: "Marché du travail résilient, réduit la probabilité d'un assouplissement rapide.",
    timeframe: "daily",
  },
  {
    title: "Pétrole WTI en hausse de 2,4 %",
    source: "Banque du Canada",
    category: "Flux & liquidité",
    importance: "moyenne",
    direction: "baissier",
    weight: 2,
    detail: "Termes de l'échange favorables au CAD, pression sur AUD/CAD.",
    timeframe: "h1",
  },
  {
    title: "Appétit pour le risque stable sur l'Asie",
    source: "CME FedWatch",
    category: "Risque global",
    importance: "faible",
    direction: "neutre",
    weight: 1,
    detail: "Volatilité implicite contenue, pas d'impulsion directionnelle nette.",
    timeframe: "h1",
  },
  {
    title: "« Intervention imminente de la RBA »",
    source: REJECTED[0],
    category: "Politique monétaire",
    importance: "faible",
    direction: "haussier",
    weight: 0,
    detail: "Source non vérifiable — écartée à l'étape 2.",
    timeframe: "news",
    whitelisted: false,
  },
];

const BTCUSD_FEED: Seed[] = [
  {
    title: "Entrées nettes ETF spot : +214 M$",
    source: "Farside ETF Flows",
    category: "Flux & liquidité",
    importance: "forte",
    direction: "haussier",
    weight: 3,
    detail: "Demande institutionnelle absorbante, pression acheteuse structurelle.",
    timeframe: "daily",
  },
  {
    title: "Fed : probabilité de baisse repoussée à décembre",
    source: "CME FedWatch",
    category: "Politique monétaire",
    importance: "forte",
    direction: "baissier",
    weight: 3,
    detail: "Liquidité plus serrée que prévu, frein aux actifs à duration longue.",
    timeframe: "news",
  },
  {
    title: "CPI US core à 0,2 % m/m",
    source: "BLS",
    category: "Inflation",
    importance: "moyenne",
    direction: "haussier",
    weight: 2,
    detail: "Désinflation confirmée, scénario d'assouplissement maintenu à moyen terme.",
    timeframe: "news",
  },
  {
    title: "Réserves des plateformes au plus bas de 6 ans",
    source: "Glassnode",
    category: "Flux & liquidité",
    importance: "moyenne",
    direction: "haussier",
    weight: 2,
    detail: "Offre disponible réduite, amplifie les mouvements haussiers.",
    timeframe: "daily",
  },
  {
    title: "Financement perpétuel légèrement négatif",
    source: "Glassnode",
    category: "Risque global",
    importance: "faible",
    direction: "neutre",
    weight: 1,
    detail: "Positionnement dégonflé sur H1, pas d'excès de levier.",
    timeframe: "h1",
  },
  {
    title: "« Un état achète 10 000 BTC »",
    source: REJECTED[2],
    category: "Flux & liquidité",
    importance: "forte",
    direction: "haussier",
    weight: 0,
    detail: "Rumeur non corroborée — écartée à l'étape 2.",
    timeframe: "news",
    whitelisted: false,
  },
];

export function buildEvents(pair: PairId): MacroEvent[] {
  const feed = pair === "AUDCAD" ? AUDCAD_FEED : BTCUSD_FEED;
  return feed.map((e, i) => ({
    ...e,
    id: `${pair}-${i}`,
    whitelisted: e.whitelisted ?? WHITELIST.includes(e.source),
  }));
}

export type Analysis = {
  events: MacroEvent[];
  validated: MacroEvent[];
  rejected: MacroEvent[];
  strong: MacroEvent[];
  bias: "haussier" | "baissier" | "neutre";
  score: number;
  confidence: number;
  regime: string;
  interactions: string[];
  justification: string[];
};

export function analyse(pair: PairId, quote: Quote): Analysis {
  const events = buildEvents(pair);
  const validated = events.filter((e) => e.whitelisted);
  const rejected = events.filter((e) => !e.whitelisted);
  const strong = validated.filter((e) => e.importance === "forte");

  const score = validated.reduce(
    (acc, e) => acc + e.weight * (e.direction === "haussier" ? 1 : e.direction === "baissier" ? -1 : 0),
    0,
  );
  const bias = score > 1 ? "haussier" : score < -1 ? "baissier" : "neutre";

  const bull = validated.filter((e) => e.direction === "haussier");
  const bear = validated.filter((e) => e.direction === "baissier");
  const interactions: string[] = [];
  if (bull.length > 1) interactions.push(`${bull.map((e) => e.category).join(" + ")} se renforcent côté haussier.`);
  if (bear.length > 1) interactions.push(`${bear.map((e) => e.category).join(" + ")} se renforcent côté baissier.`);
  if (bull.length && bear.length)
    interactions.push(
      `« ${bull[0]!.title} » est partiellement annulé par « ${bear[0]!.title} » : conviction réduite.`,
    );
  if (!interactions.length) interactions.push("Aucune interaction significative détectée.");

  const position = (quote.price - quote.low) / Math.max(quote.high - quote.low, 1e-9);
  const regime =
    pair === "AUDCAD"
      ? "Régime de différentiel de taux : deux banques centrales en pause, sensibilité aux matières premières."
      : "Régime de liquidité : flux ETF contre trajectoire des taux réels US.";

  const agreement = Math.abs(score) / Math.max(validated.reduce((a, e) => a + e.weight, 0), 1);
  const confidence = Math.round(
    Math.min(
      95,
      38 +
        agreement * 42 +
        strong.length * 5 +
        (Math.abs(position - 0.5) < 0.35 ? 4 : 0) -
        rejected.length * 2,
    ),
  );

  const justification = [
    `${validated.length} événements validés sur ${events.length}, ${rejected.length} écarté(s) pour source non fiable.`,
    `${strong.length} événement(s) de forte importance, score net pondéré ${score > 0 ? "+" : ""}${score}.`,
    `Cohérence directionnelle des sources : ${Math.round(agreement * 100)} %.`,
    `Prix à ${Math.round(position * 100)} % de la borne basse de la séance (${formatPrice(pair, quote.low)} – ${formatPrice(pair, quote.high)}).`,
  ];

  return {
    events,
    validated,
    rejected,
    strong,
    bias,
    score,
    confidence,
    regime,
    interactions,
    justification,
  };
}