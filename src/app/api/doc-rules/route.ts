import { NextRequest } from "next/server";
import { docRulesStore } from "@/lib/store";
import { createDocRuleSchema } from "@/lib/validations";
import { getAuthFromRequest, unauthorized, badRequest, ok, created } from "@/lib/api-helpers";
import { v4 as uuidv4 } from "uuid";
import type { EmployeeTypeDocRule } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const employmentType = searchParams.get("employmentType");

  let rules = docRulesStore.getAll();
  if (companyId) rules = rules.filter((r) => r.companyId === companyId);
  if (employmentType) rules = rules.filter((r) => r.employmentType === employmentType);

  return ok(rules);
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["admin", "hr"].includes(auth.role)) return unauthorized();

  try {
    const body = await req.json();
    const parsed = createDocRuleSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const now = new Date().toISOString();
    const rule: EmployeeTypeDocRule = {
      id: uuidv4(),
      ...parsed.data,
      createdAt: now,
      updatedAt: now,
    };

    docRulesStore.create(rule);
    return created(rule);
  } catch (error) {
    return badRequest((error as Error).message);
  }
}
