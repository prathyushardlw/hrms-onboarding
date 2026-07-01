import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { companiesStore } from "@/lib/store";
import {
  getAuthFromRequest,
  unauthorized,
  forbidden,
  badRequest,
  ok,
  created,
  isSuperAdmin,
} from "@/lib/api-helpers";
import type { Company } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  if (!isSuperAdmin(auth)) return forbidden();

  const companies = companiesStore.getAll();
  return ok(companies);
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  if (!isSuperAdmin(auth)) return forbidden();

  const body = await req.json();
  if (!body.name?.trim()) return badRequest("Company name is required");

  const now = new Date().toISOString();
  const company: Company = {
    id: uuidv4(),
    name: body.name.trim(),
    logo: body.logo ?? undefined,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  companiesStore.create(company);
  return created(company);
}
