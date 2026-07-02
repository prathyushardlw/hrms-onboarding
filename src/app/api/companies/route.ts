import { NextRequest } from "next/server";
import { companiesStore } from "@/lib/store";
import { createCompanySchema } from "@/lib/validations";
import { getAuthFromRequest, unauthorized, badRequest, ok, created } from "@/lib/api-helpers";
import { v4 as uuidv4 } from "uuid";
import type { Company } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();

  // Regular users only see their accessible companies
  let companies = (await companiesStore.getAll()).filter((c) => c.isActive);
  if (auth.role !== "super_admin") {
    companies = companies.filter((c) => auth.companyIds.includes(c.id));
  }
  return ok(companies);
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth || auth.role !== "admin") return unauthorized();

  try {
    const body = await req.json();
    const parsed = createCompanySchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const now = new Date().toISOString();
    const company: Company = {
      id: uuidv4(),
      name: parsed.data.name,
      logo: parsed.data.logo,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await companiesStore.create(company);
    return created(company);
  } catch (error) {
    return badRequest((error as Error).message);
  }
}
