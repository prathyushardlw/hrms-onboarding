import { NextRequest } from "next/server";
import { auditLogsStore } from "@/lib/store";
import { getAuthFromRequest, unauthorized, ok } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  const { id } = await params;
  const logs = await auditLogsStore.find((l) => l.onboardingId === id);
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return ok(logs);
}
