import { NextRequest } from "next/server";
import { employeesStore } from "@/lib/store";
import {
  getAuthFromRequest, unauthorized, forbidden, badRequest, notFound, ok,
} from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();

  const { id } = await params;
  const employee = employeesStore.getById(id);
  if (!employee) return notFound("Employee not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(employee.companyId)) return forbidden();

  return ok(employee);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();

  const { id } = await params;
  const employee = employeesStore.getById(id);
  if (!employee) return notFound("Employee not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(employee.companyId)) return forbidden();

  const body = await req.json();
  const allowed = [
    "name", "phone", "address", "dateOfBirth",
    "department", "designation", "employmentType", "joiningDate", "managerId",
    "status", "ctc", "bankName", "accountNumber", "ifscCode",
    "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation",
  ];
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const validStatuses = ["active", "probation", "notice", "resigned", "terminated"];
  if (updates.status && !validStatuses.includes(updates.status as string)) {
    return badRequest("Invalid status");
  }

  return ok(employeesStore.update(id, updates));
}
