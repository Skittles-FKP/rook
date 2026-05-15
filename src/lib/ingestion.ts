export type ExternalSourceKind = "x" | "reddit" | "rss" | "news" | "research" | "market";

export type ExternalSource = {
  id: string;
  kind: ExternalSourceKind;
  label: string;
  status: "configured" | "missing_keys" | "paused";
  cadence: string;
  convertsTo: Array<"Signals" | "Pulse events" | "Narratives" | "Brief candidates">;
};

export type FusionSurface = {
  id: string;
  label: string;
  sources: number;
  pulse: number;
  risk: number;
  detail: string;
};

export function getExternalSources(): ExternalSource[] {
  return [
    {
      id: "x",
      kind: "x",
      label: "X / Twitter",
      status: process.env.X_BEARER_TOKEN ? "configured" : "missing_keys",
      cadence: "5 min",
      convertsTo: ["Signals", "Pulse events", "Narratives"],
    },
    {
      id: "reddit",
      kind: "reddit",
      label: "Reddit",
      status: process.env.REDDIT_CLIENT_ID ? "configured" : "missing_keys",
      cadence: "15 min",
      convertsTo: ["Signals", "Narratives"],
    },
    {
      id: "rss",
      kind: "rss",
      label: "RSS and news feeds",
      status: "configured",
      cadence: "10 min",
      convertsTo: ["Signals", "Brief candidates"],
    },
    {
      id: "research",
      kind: "research",
      label: "Research and AI papers",
      status: process.env.SEMANTIC_SCHOLAR_API_KEY ? "configured" : "missing_keys",
      cadence: "60 min",
      convertsTo: ["Signals", "Narratives", "Brief candidates"],
    },
    {
      id: "market",
      kind: "market",
      label: "Market feeds",
      status: process.env.MARKET_DATA_API_KEY ? "configured" : "missing_keys",
      cadence: "5 min",
      convertsTo: ["Pulse events", "Narratives"],
    },
  ];
}

export function getFusionSurfaces(): FusionSurface[] {
  return [
    {
      id: "ai-infra",
      label: "AI Infrastructure",
      sources: 6,
      pulse: 82,
      risk: 41,
      detail: "Compute, power, deployment, and capital expenditure narratives fused into one operating picture.",
    },
    {
      id: "geopolitics",
      label: "Geopolitics",
      sources: 5,
      pulse: 68,
      risk: 57,
      detail: "Policy moves, export controls, and regional security Signals mapped across internal and external sources.",
    },
    {
      id: "compute-markets",
      label: "Compute Markets",
      sources: 7,
      pulse: 76,
      risk: 35,
      detail: "GPU supply, cloud pricing, power contracts, and operator commentary merged for strategic monitoring.",
    },
    {
      id: "autonomous-systems",
      label: "Autonomous Systems",
      sources: 4,
      pulse: 61,
      risk: 44,
      detail: "Robotics, autonomy, edge AI, and safety narratives tracked with predictive fragmentation scoring.",
    },
    {
      id: "macro-finance",
      label: "Macro and Financial Intelligence",
      sources: 6,
      pulse: 73,
      risk: 49,
      detail: "Rates, capital flows, earnings language, and strategic market narratives tied to Pulse acceleration.",
    },
  ];
}
