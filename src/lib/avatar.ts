import type { Profile } from "@/lib/supabase/types";

export const OPERATOR_AVATAR_BUCKET = "operator-avatars";
export const OPERATOR_AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export const OPERATOR_AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type OperatorIdentityKind = NonNullable<Profile["operator_type"]>;

export function operatorAvatarPath(userId: string, fileType: string) {
  const extension = mimeToExtension(fileType);
  return `${userId}/avatar-${Date.now()}.${extension}`;
}

export function isAllowedOperatorAvatarType(type: string) {
  return OPERATOR_AVATAR_MIME_TYPES.includes(type as (typeof OPERATOR_AVATAR_MIME_TYPES)[number]);
}

export function mimeToExtension(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

export function extractOperatorAvatarPath(url: string | null | undefined) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${OPERATOR_AVATAR_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;

  return decodeURIComponent(url.slice(index + marker.length).split("?")[0] ?? "");
}
