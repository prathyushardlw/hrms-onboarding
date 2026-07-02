import { v4 as uuidv4 } from "uuid";
import { auditLogsStore } from "./store";
import type { AuditEvent, AuditLog } from "./types";

export async function logAuditEvent(params: {
  onboardingId: string;
  event: AuditEvent;
  performedBy: { type: "hr" | "candidate" | "system"; id?: string };
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<AuditLog> {
  const log: AuditLog = {
    id: uuidv4(),
    onboardingId: params.onboardingId,
    event: params.event,
    performedBy: params.performedBy,
    metadata: params.metadata,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    timestamp: new Date().toISOString(),
  };

  await auditLogsStore.create(log);
  return log;
}

export async function getAuditLogs(onboardingId: string): Promise<AuditLog[]> {
  const logs = await auditLogsStore.find((log) => log.onboardingId === onboardingId);
  return logs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

