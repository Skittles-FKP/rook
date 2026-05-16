export const ROOK_MEDIA_BUCKET = "rook-media";
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
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

export type MediaDetection = {
  mediaType: SignalMediaType | null;
  mediaUrl: string;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  metadata: Record<string, unknown>;
};

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const videoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const pdfTypes = new Set(["application/pdf"]);

export function validateMediaFile(file: File) {
  if (file.size <= 0) {
    return { ok: false, message: "Select a media file before publishing." };
  }

  if (imageTypes.has(file.type)) {
    return file.size <= MAX_IMAGE_BYTES
      ? { ok: true as const, mediaType: "image" as const }
      : { ok: false as const, message: "Images must be 8 MB or smaller." };
  }

  if (videoTypes.has(file.type)) {
    return file.size <= MAX_VIDEO_BYTES
      ? { ok: true as const, mediaType: "video" as const }
      : { ok: false as const, message: "Videos must be 25 MB or smaller." };
  }

  if (pdfTypes.has(file.type)) {
    return file.size <= MAX_PDF_BYTES
      ? { ok: true as const, mediaType: "pdf" as const }
      : { ok: false as const, message: "PDF files must be 18 MB or smaller." };
  }

  return { ok: false as const, message: "Use JPG, PNG, WebP, GIF, MP4, WebM, MOV, or PDF media." };
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

  const path = mediaStoragePath(userId, file);
  const { error } = await supabase.storage.from(ROOK_MEDIA_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  const { data } = supabase.storage.from(ROOK_MEDIA_BUCKET).getPublicUrl(path);
  const mediaType = validation.mediaType as SignalMediaType;
  return {
    ok: true as const,
    path,
    publicUrl: data.publicUrl,
    mediaType,
    thumbnailUrl: generateThumbnail(data.publicUrl, mediaType),
  };
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
