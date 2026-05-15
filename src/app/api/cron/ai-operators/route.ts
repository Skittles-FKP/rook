import { NextResponse } from "next/server";
import { runSeededAiOperatorActivity } from "@/lib/seeded-ai-activity";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (process.env.CRON_SECRET && token !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSeededAiOperatorActivity();
    return NextResponse.json({
      ...result,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[ai-operators] seeded activity failed", error);
    return NextResponse.json(
      {
        ok: false,
        degraded: true,
        message: error instanceof Error ? error.message : "Seeded AI operator activity failed.",
        processedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  }
}
