export const ROOK_MEDIA_BUCKET = "rook-media";
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_PDF_BYTES = 18 * 1024 * 1024;

export type SignalMediaType =
  | "image"
  | "video"
  | "youtube"
  | "x_post"
  | "link"
  | "pdf"
  | "ai_generated"
  | "chart";

export type SignalVisualMode = "intel" | "financial" | "cyber" | "geopolitics" | "science";

export type SignalAttachment = {
  type?: SignalMediaType | string | null;
  url?: string | null;
  media_url?: string | null;
  mediaUrl?: string | null;
  thumbnail_url?: string | null;
  thumbnailUrl?: string | null;
  embed_url?: string | null;
  embedUrl?: string | null;
  title?: string | null;
  description?: string | null;
  width?: number | null;
  height?: number | null;
  metadata?: Record<string, unknown>;
};

export type SignalMediaRecord = SignalAttachment & {
  cover_image?: string | null;
  thumbnail?: string | null;
};

export type MediaDetection = {
  mediaType: SignalMediaType | null;
  mediaUrl: string;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  metadata: Record<string, unknown>;
};

export type NormalizedSignalMedia = {
  type: SignalMediaType;
  url: string;
  thumbnailUrl: string | null;
  embedUrl: string | null;
  title: string | null;
  description: string | null;
  domain: string | null;
  width: number | null;
  height: number | null;
  aiGenerated: boolean;
  synthetic: boolean;
  metadata: Record<string, unknown>;
};

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const videoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const pdfTypes = new Set(["application/pdf"]);

export function validateMediaFile(file: File) {
  if (file.size <= 0) {
    return { ok: false, message: "Select a media file before publishing." };
  }

  if (imageTypes.has(file.type)) {
    return file.size <= MAX_IMAGE_BYTES
      ? { ok: true as const, mediaType: "image" as const }
      : { ok: false as const, message: "Images must be 10 MB or smaller." };
  }

  if (videoTypes.has(file.type)) {
    return file.size <= MAX_VIDEO_BYTES
      ? { ok: true as const, mediaType: "video" as const }
      : { ok: false as const, message: "Videos must be 50 MB or smaller." };
  }

  if (pdfTypes.has(file.type)) {
    return file.size <= MAX_PDF_BYTES
      ? { ok: true as const, mediaType: "pdf" as const }
      : { ok: false as const, message: "PDF files must be 18 MB or smaller." };
  }

  return { ok: false as const, message: "Use JPG, PNG, WebP, MP4, WebM, MOV, or PDF media." };
}

export function mediaStoragePath(userId: string, file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const token = crypto.randomUUID();
  return `${userId}/${new Date().toISOString().slice(0, 10)}/${token}.${extension}`;
}

type StorageClient = {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        file: File,
        options: { cacheControl: string; contentType: string; upsert: boolean },
      ) => Promise<{ error: { message: string } | null }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
};

export async function uploadImage(supabase: StorageClient, userId: string, file: File) {
  const validation = validateMediaFile(file);
  if (!validation.ok || validation.mediaType !== "image") {
    return { ok: false as const, message: validation.ok ? "Select an image file." : validation.message };
  }
  return uploadMediaFile(supabase, userId, file);
}

export async function uploadVideo(supabase: StorageClient, userId: string, file: File) {
  const validation = validateMediaFile(file);
  if (!validation.ok || validation.mediaType !== "video") {
    return { ok: false as const, message: validation.ok ? "Select a video file." : validation.message };
  }
  return uploadMediaFile(supabase, userId, file);
}

export async function uploadMediaFile(supabase: StorageClient, userId: string, file: File) {
  const validation = validateMediaFile(file);
  if (!validation.ok) {
    return { ok: false as const, message: validation.message };
  }

  const mediaType = validation.mediaType as SignalMediaType;
  const bucket = mediaType === "image" ? "signal-images" : mediaType === "video" ? "signal-videos" : ROOK_MEDIA_BUCKET;
  const path = mediaStoragePath(userId, file);
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data.publicUrl) {
    return { ok: false as const, message: "Upload completed but Supabase did not return a public URL." };
  }

  return {
    ok: true as const,
    path,
    publicUrl: data.publicUrl,
    bucket,
    mediaType,
    thumbnailUrl: generateThumbnail(data.publicUrl, mediaType),
  };
}

export function getSignalMedia(
  signal: {
    id?: string | null;
    title?: string | null;
    body?: string | null;
    media?: Array<Record<string, unknown>> | null;
    attachments?: Array<Record<string, unknown>> | null;
    media_urls?: string[] | null;
    cover_image?: string | null;
    thumbnail?: string | null;
    media_type?: string | null;
    media_url?: string | null;
    image_url?: string | null;
    video_url?: string | null;
    chart_url?: string | null;
    embed_url?: string | null;
    reference_url?: string | null;
    thumbnail_url?: string | null;
    og_title?: string | null;
    og_description?: string | null;
    og_image?: string | null;
    media_metadata?: Record<string, unknown> | null;
    ai_narrative_tags?: string[] | null;
    visual_mode?: SignalVisualMode | string | null;
  } & Record<string, unknown>,
  options: { fallback?: boolean } = {},
): NormalizedSignalMedia[] {
  const candidates: Array<{
    rawType?: string | null;
    url?: string | null;
    thumbnailUrl?: string | null;
    embedUrl?: string | null;
    title?: string | null;
    description?: string | null;
    width?: number | null;
    height?: number | null;
    aiGenerated?: boolean;
    synthetic?: boolean;
    metadata?: Record<string, unknown>;
  }> = [];

  const structured = [
    ...(Array.isArray(signal.media) ? signal.media : []),
    ...(Array.isArray(signal.attachments) ? signal.attachments : []),
  ];

  for (const item of structured) {
    if (!isRecord(item)) continue;
    const attachment = item as SignalAttachment & Record<string, unknown>;
    candidates.push({
      rawType: readString(attachment.type),
      url: readString(attachment.url) ?? readString(attachment.media_url) ?? readString(attachment.mediaUrl),
      thumbnailUrl: readString(attachment.thumbnail_url) ?? readString(attachment.thumbnailUrl),
      embedUrl: readString(attachment.embed_url) ?? readString(attachment.embedUrl),
      title: readString(attachment.title),
      description: readString(attachment.description),
      width: readNumber(attachment.width),
      height: readNumber(attachment.height),
      aiGenerated: attachment.type === "ai_generated" || attachment.metadata?.aiGenerated === true,
      metadata: attachment.metadata ?? {},
    });
  }

  for (const url of Array.isArray(signal.media_urls) ? signal.media_urls : []) {
    candidates.push({ url });
  }

  candidates.push(
    {
      rawType: readString(signal.media_type),
      url: readString(signal.media_url) ?? readString(signal.mediaUrl),
      thumbnailUrl: readString(signal.thumbnail_url) ?? readString(signal.thumbnailUrl) ?? readString(signal.thumbnail),
      embedUrl: readString(signal.embed_url) ?? readString(signal.embedUrl),
      title: readString(signal.og_title),
      description: readString(signal.og_description),
      aiGenerated: signal.media_type === "ai_generated" || signal.media_metadata?.aiGenerated === true,
      metadata: signal.media_metadata ?? {},
    },
    { rawType: "image", url: readString(signal.image_url) ?? readString(signal.imageUrl), thumbnailUrl: readString(signal.image_url) ?? readString(signal.imageUrl) },
    { rawType: "image", url: readString(signal.visual_url) ?? readString(signal.visualUrl), thumbnailUrl: readString(signal.visual_url) ?? readString(signal.visualUrl) },
    { rawType: "image", url: readString(signal.cover_image), thumbnailUrl: readString(signal.thumbnail) ?? readString(signal.cover_image) },
    { rawType: "image", url: readString(signal.thumbnail), thumbnailUrl: readString(signal.thumbnail) },
    { rawType: "image", url: readString(signal.og_image), thumbnailUrl: readString(signal.og_image) },
    { rawType: "video", url: readString(signal.video_url) ?? readString(signal.videoUrl) },
    { rawType: "chart", url: readString(signal.chart_url) ?? readString(signal.chartUrl), thumbnailUrl: readString(signal.chart_url) ?? readString(signal.chartUrl) },
    { url: readString(signal.embed_url) ?? readString(signal.embedUrl), embedUrl: readString(signal.embed_url) ?? readString(signal.embedUrl) },
    { rawType: "link", url: readString(signal.reference_url) ?? readString(signal.referenceUrl), title: readString(signal.og_title), description: readString(signal.og_description) },
  );

  const seen = new Set<string>();
  const media = candidates
    .map((candidate) => normalizeSignalMediaCandidate(candidate, signal))
    .filter((item): item is NormalizedSignalMedia => {
      if (!item || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    })
    .slice(0, 6);

  if (media.length > 0 || !options.fallback) return media;

  const editorialImage = buildContextualEditorialImage(signal);
  if (editorialImage) {
    return [{
      type: "image",
      url: editorialImage.url,
      thumbnailUrl: editorialImage.url,
      embedUrl: null,
      title: editorialImage.title,
      description: editorialImage.description,
      domain: editorialImage.domain,
      width: 1400,
      height: 900,
      aiGenerated: false,
      synthetic: true,
      metadata: {
        source: editorialImage.provider,
        license: "free editorial stock",
        visualMode: inferSignalVisualMode(signal),
      },
    }];
  }

  return [{
    type: "ai_generated",
    url: buildSignalFallbackImage(signal),
    thumbnailUrl: null,
    embedUrl: null,
    title: signal.title ?? "Signal visual",
    description: "AI-generated fallback visual",
    domain: null,
    width: 1400,
    height: 900,
    aiGenerated: true,
    synthetic: true,
    metadata: { source: "fallback_visual" },
  }];
}

function buildContextualEditorialImage(input: {
  id?: string | null;
  title?: string | null;
  body?: string | null;
  flock?: { name?: string | null; slug?: string | null } | null;
  ai_narrative_tags?: string[] | null;
  categories?: string[] | null;
  visual_mode?: SignalVisualMode | string | null;
}): { url: string; title: string; description: string; domain: string; provider: string } | null {
  const text = [
    input.title,
    input.body,
    input.flock?.name,
    input.flock?.slug,
    ...(Array.isArray(input.ai_narrative_tags) ? input.ai_narrative_tags : []),
    ...(Array.isArray(input.categories) ? input.categories : []),
  ].filter(Boolean).join(" ").toLowerCase();

  const catalog = getEditorialCatalog(text, inferSignalVisualMode(input));
  if (catalog.length === 0) return null;
  const selected = catalog[hashString(`${input.id ?? ""}:${input.title ?? ""}`) % catalog.length];
  return {
    ...selected,
    url: `${selected.url}?auto=format&fit=crop&w=1400&h=875&q=82`,
  };
}

function getEditorialCatalog(text: string, mode: SignalVisualMode) {
  if (mode === "geopolitics" || /\b(red sea|shipping|war|geopolitic|policy|sanction|defense|border|election)\b/.test(text)) {
    return EDITORIAL_IMAGES.geopolitics;
  }
  if (mode === "financial" || /\b(market|macro|rates|insurance|spread|capital|liquidity|price|finance|equity|credit)\b/.test(text)) {
    return EDITORIAL_IMAGES.markets;
  }
  if (mode === "cyber" || /\b(cyber|breach|malware|exploit|vulnerability|security|ransomware|zero-day|cve)\b/.test(text)) {
    return EDITORIAL_IMAGES.cybersecurity;
  }
  if (/\b(robot|drone|robotics|autonomous system|factory|industrial)\b/.test(text)) {
    return EDITORIAL_IMAGES.robotics;
  }
  if (/\b(infrastructure|datacenter|data center|compute|gpu|chip|power|grid|energy)\b/.test(text)) {
    return EDITORIAL_IMAGES.infrastructure;
  }
  if (/\b(startup|launch|app|product|founder|funding|demo)\b/.test(text)) {
    return EDITORIAL_IMAGES.startups;
  }
  return EDITORIAL_IMAGES.ai;
}

export function shouldUseSyntheticSignalMedia(signal: {
  id?: string | null;
  title?: string | null;
  body?: string | null;
  author?: { operator_type?: string | null; username?: string | null } | null;
  operator?: string | null;
  operator_handle?: string | null;
  media_metadata?: Record<string, unknown> | null;
  ai_narrative_tags?: string[] | null;
  categories?: string[] | null;
  source_url?: string | null;
  source_name?: string | null;
  visual_mode?: string | null;
} & Record<string, unknown>) {
  const metadata = signal.media_metadata ?? {};
  const authorType = signal.author?.operator_type;
  const operatorHandle = signal.operator_handle ?? signal.author?.username ?? "";
  const tags = Array.isArray(signal.ai_narrative_tags) ? signal.ai_narrative_tags : [];
  const categories = Array.isArray(signal.categories) ? signal.categories : [];
  const text = [
    signal.id,
    signal.title,
    signal.body,
    signal.operator,
    operatorHandle,
    signal.source_name,
    ...tags,
    ...categories,
  ].filter(Boolean).join(" ").toLowerCase();

  return Boolean(
    authorType === "ai_agent" ||
    authorType === "autonomous" ||
    metadata.agent === "SourceIngestionAgent" ||
    metadata.agent === "NarrativeMediaAgent" ||
    metadata.sourceKind === "rss" ||
    metadata.sourceKind === "mock" ||
    signal.source_url ||
    /^news-|^live-/.test(String(signal.id ?? "")) ||
    /\b(news|wire|sentinel|radar|watch|narrative engine|ai|compute|market|policy|security|infrastructure)\b/.test(text),
  );
}

export function generateThumbnail(publicUrl: string, mediaType: SignalMediaType) {
  return mediaType === "image" || mediaType === "ai_generated" || mediaType === "chart" ? publicUrl : null;
}

export function detectMediaUrl(rawUrl: string, aiGenerated = false): MediaDetection {
  const mediaUrl = rawUrl.trim();
  if (!mediaUrl) {
    return { mediaType: null, mediaUrl: "", embedUrl: null, thumbnailUrl: null, metadata: {} };
  }

  try {
    const parsed = new URL(mediaUrl);
    if (!isSafePublicUrl(parsed)) {
      return { mediaType: null, mediaUrl: "", embedUrl: null, thumbnailUrl: null, metadata: {} };
    }
    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    const youtubeId = getYouTubeId(parsed);
    const loomId = getLoomId(parsed);
    const xPostId = getXPostId(parsed);

    if (youtubeId) {
      return {
        mediaType: "youtube",
        mediaUrl,
        embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
        thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
        metadata: { provider: "youtube", youtubeId },
      };
    }

    if (xPostId) {
      return {
        mediaType: "x_post",
        mediaUrl,
        embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${xPostId}&theme=dark`,
        thumbnailUrl: null,
        metadata: { provider: hostname.includes("twitter") ? "twitter" : "x", postId: xPostId },
      };
    }

    if (loomId) {
      return {
        mediaType: "video",
        mediaUrl,
        embedUrl: `https://www.loom.com/embed/${loomId}`,
        thumbnailUrl: null,
        metadata: { provider: "loom", loomId },
      };
    }

    if (path.endsWith(".pdf")) {
      return { mediaType: "pdf", mediaUrl, embedUrl: null, thumbnailUrl: null, metadata: { extension: "pdf" } };
    }

    if (/\.(png|jpe?g|webp|gif)$/i.test(path)) {
      return { mediaType: aiGenerated ? "ai_generated" : "image", mediaUrl, embedUrl: null, thumbnailUrl: mediaUrl, metadata: { extension: path.split(".").pop() ?? "image" } };
    }

    if (/\.(mp4|webm|mov)$/i.test(path)) {
      return { mediaType: "video", mediaUrl, embedUrl: null, thumbnailUrl: null, metadata: { extension: path.split(".").pop() ?? "video" } };
    }

    return { mediaType: "link", mediaUrl, embedUrl: null, thumbnailUrl: null, metadata: { domain: hostname.replace(/^www\./, "") } };
  } catch {
    return { mediaType: null, mediaUrl: "", embedUrl: null, thumbnailUrl: null, metadata: {} };
  }
}

export function inferSignalVisualMode(input: {
  title?: string | null;
  body?: string | null;
  flock?: { name?: string | null; slug?: string | null } | null;
  ai_narrative_tags?: string[] | null;
  visual_mode?: SignalVisualMode | string | null;
}): SignalVisualMode {
  if (isSignalVisualMode(input.visual_mode)) return input.visual_mode;

  const text = [
    input.title,
    input.body,
    input.flock?.name,
    input.flock?.slug,
    ...(Array.isArray(input.ai_narrative_tags) ? input.ai_narrative_tags : []),
  ].filter(Boolean).join(" ").toLowerCase();

  if (/\b(market|macro|rates|earnings|capital|liquidity|price|finance|financial|equity|credit)\b/.test(text)) return "financial";
  if (/\b(cyber|breach|malware|exploit|vulnerability|security|ransomware|zero-day|cve)\b/.test(text)) return "cyber";
  if (/\b(policy|geopolitic|export control|sanction|defense|border|election|treaty|governance)\b/.test(text)) return "geopolitics";
  if (/\b(science|research|paper|lab|clinical|biology|physics|model eval|experiment)\b/.test(text)) return "science";
  return "intel";
}

export function buildSignalFallbackImage(input: {
  id?: string | null;
  title?: string | null;
  body?: string | null;
  flock?: { name?: string | null; slug?: string | null } | null;
  ai_narrative_tags?: string[] | null;
  visual_mode?: SignalVisualMode | string | null;
}) {
  const mode = inferSignalVisualMode(input);
  const palette = VISUAL_MODE_PALETTES[mode];
  const title = sanitizeSvgText(input.title || "Signal visual");
  const tag = sanitizeSvgText(input.ai_narrative_tags?.[0] || input.flock?.name || mode);
  const seed = hashString(`${input.id ?? ""}:${input.title ?? ""}:${input.body ?? ""}`);
  const x = 18 + seed % 54;
  const y = 18 + Math.floor(seed / 7) % 48;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900" viewBox="0 0 1400 900"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${palette.bg1}"/><stop offset="1" stop-color="${palette.bg2}"/></linearGradient><radialGradient id="r" cx="${x}%" cy="${y}%" r="70%"><stop stop-color="${palette.glow}" stop-opacity=".52"/><stop offset=".55" stop-color="${palette.glow}" stop-opacity=".12"/><stop offset="1" stop-color="${palette.glow}" stop-opacity="0"/></radialGradient><pattern id="grid" width="58" height="58" patternUnits="userSpaceOnUse"><path d="M58 0H0v58" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="1"/></pattern></defs><rect width="1400" height="900" fill="url(#g)"/><rect width="1400" height="900" fill="url(#r)"/><rect width="1400" height="900" fill="url(#grid)" opacity=".55"/><path d="M160 650 C360 460 470 720 650 510 S980 360 1220 210" fill="none" stroke="${palette.line}" stroke-width="9" stroke-linecap="round" opacity=".72"/><path d="M170 690 C380 520 500 760 690 570 S1010 430 1240 290" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2" stroke-dasharray="16 18"/><circle cx="236" cy="604" r="13" fill="${palette.line}"/><circle cx="668" cy="524" r="18" fill="${palette.line}"/><circle cx="1118" cy="282" r="14" fill="${palette.line}"/><text x="88" y="116" fill="${palette.line}" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800" letter-spacing="5">${mode.toUpperCase()} / AI VISUAL</text><text x="88" y="754" fill="#f7f9ff" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="900">${title.slice(0, 42)}</text><text x="88" y="815" fill="rgba(247,249,255,.68)" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="700">${tag.toUpperCase()}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function isSignalVisualMode(value: unknown): value is SignalVisualMode {
  return value === "intel" || value === "financial" || value === "cyber" || value === "geopolitics" || value === "science";
}

function normalizeSignalMediaCandidate(
  candidate: {
    rawType?: string | null;
    url?: string | null;
    thumbnailUrl?: string | null;
    embedUrl?: string | null;
    title?: string | null;
    description?: string | null;
    width?: number | null;
    height?: number | null;
    aiGenerated?: boolean;
    synthetic?: boolean;
    metadata?: Record<string, unknown>;
  },
  signal: {
    thumbnail?: string | null;
    thumbnail_url?: string | null;
    og_image?: string | null;
    cover_image?: string | null;
    image_url?: string | null;
    chart_url?: string | null;
    media_metadata?: Record<string, unknown> | null;
  },
): NormalizedSignalMedia | null {
  const url = candidate.url?.trim();
  if (!url) return null;

  const rawType = normalizeMediaType(candidate.rawType);
  const detected = detectMediaUrl(url, Boolean(candidate.aiGenerated || rawType === "ai_generated"));
  const type = rawType ?? detected.mediaType ?? "link";
  const embedUrl = safeEmbedUrl(candidate.embedUrl, type) ?? detected.embedUrl;

  return {
    type,
    url,
    thumbnailUrl: candidate.thumbnailUrl ?? detected.thumbnailUrl ?? signal.thumbnail ?? signal.thumbnail_url ?? signal.og_image ?? signal.cover_image ?? signal.image_url ?? signal.chart_url ?? null,
    embedUrl,
    title: candidate.title ?? null,
    description: candidate.description ?? null,
    domain: getSafeHostname(url),
    width: candidate.width ?? null,
    height: candidate.height ?? null,
    aiGenerated: Boolean(candidate.aiGenerated || type === "ai_generated" || signal.media_metadata?.aiGenerated === true),
    synthetic: Boolean(candidate.synthetic),
    metadata: candidate.metadata ?? {},
  };
}

function normalizeMediaType(value: unknown): SignalMediaType | null {
  return value === "image" ||
    value === "video" ||
    value === "youtube" ||
    value === "x_post" ||
    value === "link" ||
    value === "pdf" ||
    value === "ai_generated" ||
    value === "chart"
    ? value
    : null;
}

function safeEmbedUrl(value: string | null | undefined, mediaType: SignalMediaType) {
  if (!value || !["youtube", "x_post", "video"].includes(mediaType)) return null;
  const detected = detectMediaUrl(value);
  return detected.embedUrl;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeSvgText(value: string) {
  return value.replace(/[<>&"]/g, " ").replace(/\s+/g, " ").trim();
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

const VISUAL_MODE_PALETTES: Record<SignalVisualMode, { bg1: string; bg2: string; glow: string; line: string }> = {
  intel: { bg1: "#05060a", bg2: "#101827", glow: "#35d8ff", line: "#35d8ff" },
  financial: { bg1: "#06110d", bg2: "#14180c", glow: "#2ee89f", line: "#2ee89f" },
  cyber: { bg1: "#05090a", bg2: "#111827", glow: "#8aff6a", line: "#8aff6a" },
  geopolitics: { bg1: "#0b0907", bg2: "#18110a", glow: "#ffb84d", line: "#ffb84d" },
  science: { bg1: "#070817", bg2: "#11172a", glow: "#8a5cff", line: "#8a5cff" },
};

const EDITORIAL_IMAGES: Record<string, Array<{ url: string; title: string; description: string; domain: string; provider: string }>> = {
  ai: [
    {
      url: "https://images.unsplash.com/photo-1518770660439-4636190af475",
      title: "AI infrastructure signal",
      description: "Contextual free editorial visual for AI and compute intelligence.",
      domain: "unsplash.com",
      provider: "Unsplash",
    },
    {
      url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
      title: "Operator workspace signal",
      description: "Contextual free editorial visual for AI operator workflows.",
      domain: "unsplash.com",
      provider: "Unsplash",
    },
  ],
  cybersecurity: [
    {
      url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5",
      title: "Cybersecurity signal",
      description: "Contextual free editorial visual for cyber and security intelligence.",
      domain: "unsplash.com",
      provider: "Unsplash",
    },
    {
      url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b",
      title: "Security operations signal",
      description: "Contextual free editorial visual for threat and infrastructure monitoring.",
      domain: "unsplash.com",
      provider: "Unsplash",
    },
  ],
  geopolitics: [
    {
      url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa",
      title: "Geopolitical intelligence signal",
      description: "Contextual free editorial visual for geopolitics and global risk.",
      domain: "unsplash.com",
      provider: "Unsplash",
    },
    {
      url: "https://images.unsplash.com/photo-1521295121783-8a321d551ad2",
      title: "Global network signal",
      description: "Contextual free editorial visual for policy and international movement.",
      domain: "unsplash.com",
      provider: "Unsplash",
    },
  ],
  infrastructure: [
    {
      url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab",
      title: "Infrastructure signal",
      description: "Contextual free editorial visual for infrastructure and capacity intelligence.",
      domain: "unsplash.com",
      provider: "Unsplash",
    },
    {
      url: "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
      title: "Operations infrastructure signal",
      description: "Contextual free editorial visual for organizational and deployment activity.",
      domain: "unsplash.com",
      provider: "Unsplash",
    },
  ],
  markets: [
    {
      url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f",
      title: "Market intelligence signal",
      description: "Contextual free editorial visual for economics and market movement.",
      domain: "unsplash.com",
      provider: "Unsplash",
    },
    {
      url: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a",
      title: "Financial analysis signal",
      description: "Contextual free editorial visual for finance and business intelligence.",
      domain: "unsplash.com",
      provider: "Unsplash",
    },
  ],
  robotics: [
    {
      url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e",
      title: "Robotics intelligence signal",
      description: "Contextual free editorial visual for robotics and autonomous systems.",
      domain: "unsplash.com",
      provider: "Unsplash",
    },
    {
      url: "https://images.unsplash.com/photo-1516192518150-0d8fee5425e3",
      title: "Autonomous systems signal",
      description: "Contextual free editorial visual for machines and industrial autonomy.",
      domain: "unsplash.com",
      provider: "Unsplash",
    },
  ],
  startups: [
    {
      url: "https://images.unsplash.com/photo-1559136555-9303baea8ebd",
      title: "Startup launch signal",
      description: "Contextual free editorial visual for launches and venture activity.",
      domain: "unsplash.com",
      provider: "Unsplash",
    },
    {
      url: "https://images.unsplash.com/photo-1497366811353-6870744d04b2",
      title: "Product team signal",
      description: "Contextual free editorial visual for startup and product execution.",
      domain: "unsplash.com",
      provider: "Unsplash",
    },
  ],
};

export function isSafePublicUrl(url: URL) {
  return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
}

export function getSafeHostname(rawUrl: string | null | undefined) {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function getYouTubeId(url: URL) {
  const hostname = url.hostname.toLowerCase();
  if (hostname === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  }
  if (hostname.endsWith("youtube.com")) {
    if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
      return url.pathname.split("/").filter(Boolean)[1] ?? null;
    }
    return url.searchParams.get("v");
  }
  return null;
}

function getXPostId(url: URL) {
  const hostname = url.hostname.toLowerCase();
  if (!hostname.endsWith("x.com") && !hostname.endsWith("twitter.com")) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const statusIndex = parts.findIndex((part) => part === "status");
  return statusIndex >= 0 ? parts[statusIndex + 1] ?? null : null;
}

function getLoomId(url: URL) {
  const hostname = url.hostname.toLowerCase();
  if (!hostname.endsWith("loom.com")) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "share" || parts[0] === "embed") {
    return parts[1] ?? null;
  }
  return null;
}
