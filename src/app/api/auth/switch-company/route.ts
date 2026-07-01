import { NextRequest } from "next/server";
import { switchCompany } from "@/lib/auth";
import { companiesStore } from "@/lib/store";
import {
  getAuthFromRequest,
  unauthorized,
  badRequest,
  ok,
} from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { companyId } = body;
  if (!companyId) return badRequest("companyId is required");

  const company = companiesStore.getById(companyId);
  if (!company || !company.isActive) return badRequest("Company not found or inactive");

  try {
    const token = await switchCompany(auth.userId, companyId);
    return ok({ token, activeCompanyId: companyId, companyName: company.name });
  } catch (err) {
    return badRequest((err as Error).message);
  }
}
