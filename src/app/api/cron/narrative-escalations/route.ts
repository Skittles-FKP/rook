export const runtime = "edge";

import { NextResponse } from "next/server";
import { processNarrativeEscalations } from "@/lib/narrative-escalation";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (process.env.CRON_SECRET && token !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const result = await processNarrativeEscalations();
  return NextResponse.json({
    ...result,
    processedAt: new Date().toISOString(),
  });
}
