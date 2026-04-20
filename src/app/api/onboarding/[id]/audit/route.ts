import { NextRequest } from "next/server";
import { getAuditLogs } from "@/lib/audit";
import { getAuthFromRequest, unauthorized, ok } from "@/lib/api-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();

  const { id } = await params;
  const logs = getAuditLogs(id);
  return ok(logs);
}
