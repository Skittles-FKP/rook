"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import { uploadMediaFile } from "@/lib/media";
import type { ActionState } from "@/app/actions/auth";

export async function submitAiAppAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Log in to submit an AI app." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "Agentic AI").trim();
  const demoUrl = String(formData.get("demoUrl") ?? "").trim();
  const githubUrl = String(formData.get("githubUrl") ?? "").trim();
  const websiteUrl = String(formData.get("websiteUrl") ?? "").trim();
  const stackTags = parseTags(String(formData.get("stackTags") ?? ""));
  const logoFile = formData.get("logo");
  const screenshotFiles = formData.getAll("screenshots").filter((value): value is File => value instanceof File && value.size > 0);

  if (name.length < 2 || tagline.length < 4) {
    return { ok: false, message: "Add an app name and a clear launch tagline." };
  }

  let logoUrl: string | null = null;
  if (logoFile instanceof File && logoFile.size > 0) {
    if (!logoFile.type.startsWith("image/")) {
      return { ok: false, message: "App logo must be an image file." };
    }
    const upload = await uploadMediaFile(supabase, user.id, logoFile);
    if (!upload.ok) return { ok: false, message: upload.message };
    logoUrl = upload.publicUrl;
  }

  const screenshotUrls: string[] = [];
  for (const screenshot of screenshotFiles.slice(0, 4)) {
    if (!screenshot.type.startsWith("image/")) {
      return { ok: false, message: "Screenshots must be image files." };
    }
    const upload = await uploadMediaFile(supabase, user.id, screenshot);
    if (!upload.ok) return { ok: false, message: upload.message };
    screenshotUrls.push(upload.publicUrl);
  }

  const baseSlug = slugify(name);
  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
  const { error } = await supabase.from("ai_apps").insert({
    submitted_by: user.id,
    operator_id: user.id,
    name,
    slug,
    tagline,
    description: description || null,
    category,
    logo_url: logoUrl,
    screenshot_urls: screenshotUrls,
    demo_url: safeUrl(demoUrl),
    github_url: safeUrl(githubUrl),
    website_url: safeUrl(websiteUrl),
    stack_tags: stackTags,
    trend_score: Math.min(100, 28 + stackTags.length * 7 + screenshotUrls.length * 9 + (logoUrl ? 12 : 0)),
  });

  if (error) {
    console.error("[ai-apps:create] insert failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { ok: false, message: error.message };
  }

  revalidatePath("/apps");
  revalidatePath("/agents");
  return { ok: true, message: "AI app submitted to the discovery layer." };
}

function parseTags(value: string) {
  return value
    .split(/[,#\n]/)
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter((tag) => tag.length > 0 && tag.length <= 32)
    .map((tag) => tag.toLowerCase())
    .filter((tag, index, tags) => tags.indexOf(tag) === index)
    .slice(0, 12);
}

function safeUrl(value: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
