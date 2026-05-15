import { NextResponse } from "next/server";
import { getObservabilityStatus } from "@/lib/observability";
import { getProductionReadiness } from "@/lib/production";

export const runtime = "edge";

export function GET() {
  const readiness = getProductionReadiness();
  const observability = getObservabilityStatus();
  const status = readiness.healthy ? 200 : 503;

  return NextResponse.json(
    {
      ok: readiness.healthy,
      environment: readiness.environment,
      production: readiness.production,
      staging: readiness.staging,
      missingRequired: readiness.missingRequired,
      observability,
      checkedAt: new Date().toISOString(),
    },
    { status },
  );
}
