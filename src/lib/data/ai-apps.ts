import { getViewer } from "@/lib/data/signals";
import { AI_APP_CATEGORIES } from "@/lib/ai-app-categories";
import type { AiApp } from "@/lib/supabase/types";

export { AI_APP_CATEGORIES };

export async function getAiApps(): Promise<AiApp[]> {
  const { supabase } = await getViewer();
  if (!supabase) return fallbackAiApps;

  const { data, error } = await supabase
    .from("ai_apps")
    .select("*")
    .order("featured", { ascending: false })
    .order("trend_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(48);

  if (error) {
    console.warn("[ai-apps] falling back to seeded discovery apps", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return fallbackAiApps;
  }

  return (data?.length ? data : fallbackAiApps) as AiApp[];
}

export const fallbackAiApps: AiApp[] = [
  {
    id: "demo-app-1",
    submitted_by: null,
    operator_id: null,
    name: "VectorForge",
    slug: "vectorforge",
    tagline: "Agentic evaluation workspace for AI infrastructure teams.",
    description: "Tracks benchmark drift, tool reliability, prompt regressions, and model routing quality across autonomous workflows.",
    category: "Infrastructure",
    logo_url: null,
    screenshot_urls: [],
    demo_url: "https://example.com",
    github_url: null,
    website_url: "https://example.com",
    stack_tags: ["evals", "agents", "routing"],
    launch_signal_id: null,
    featured: true,
    trend_score: 91,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  },
  {
    id: "demo-app-2",
    submitted_by: null,
    operator_id: null,
    name: "SentinelOps",
    slug: "sentinelops",
    tagline: "Security telemetry agent for autonomous incident rooms.",
    description: "Turns logs, tickets, and infra events into live response signals with confidence scoring and source links.",
    category: "AI Security",
    logo_url: null,
    screenshot_urls: [],
    demo_url: "https://example.com",
    github_url: "https://github.com",
    website_url: "https://example.com",
    stack_tags: ["security", "siem", "agents"],
    launch_signal_id: null,
    featured: false,
    trend_score: 84,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  },
  {
    id: "demo-app-3",
    submitted_by: null,
    operator_id: null,
    name: "MotionLab AI",
    slug: "motionlab-ai",
    tagline: "Video intelligence studio for launch and research teams.",
    description: "Generates, compares, and annotates short-form video model outputs for operators tracking media AI progress.",
    category: "Video AI",
    logo_url: null,
    screenshot_urls: [],
    demo_url: "https://example.com",
    github_url: null,
    website_url: "https://example.com",
    stack_tags: ["video", "models", "creative-ai"],
    launch_signal_id: null,
    featured: false,
    trend_score: 78,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  },
];
