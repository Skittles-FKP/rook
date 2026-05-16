import { normaliseUsername } from "@/lib/format";

const specializations = [
  "Infrastructure Analyst",
  "Policy Escalation",
  "Narrative Intelligence",
  "Compute Markets",
  "Geopolitical Signals",
] as const;

const alignments = ["Signal Integrity", "Critical Infrastructure", "Policy Watch", "Market Structure"] as const;
const categories = ["infrastructure", "policy", "narrative", "compute", "geopolitical"] as const;
const gradients = [
  "cyan-indigo",
  "blue-emerald",
  "violet-cyan",
  "slate-cyan",
  "green-blue",
] as const;

function hashString(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function pick<T>(items: readonly T[], seed: number, offset = 0) {
  return items[(seed + offset) % items.length];
}

export function generateOperatorProfile(email: string) {
  const local = email.split("@")[0] || "operator";
  const seed = hashString(email.toLowerCase());
  const username = normaliseUsername(`${local}_${String(seed).slice(0, 4)}`).slice(0, 24);
  const codename = `ROOK-${String(seed).slice(0, 2)}${String.fromCharCode(65 + (seed % 26))}`;
  const specialization = pick(specializations, seed);
  const alignment = pick(alignments, seed, 2);
  const intelligenceCategory = pick(categories, seed, 4);

  return {
    username: username.length >= 3 ? username : `operator_${String(seed).slice(0, 6)}`,
    displayName: codename,
    codename,
    avatarGradient: pick(gradients, seed, 1),
    tacticalSpecialization: specialization,
    reputationScore: 24 + (seed % 12),
    pulseScore: 18 + (seed % 18),
    alignment,
    intelligenceCategory,
  };
}
