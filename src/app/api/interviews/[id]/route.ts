import { NextRequest } from "next/server";
import { employeesStore } from "@/lib/store";
import {
  getAuthFromRequest, unauthorized, ok, resolveCompanyId,
} from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const companyId = resolveCompanyId(auth, searchParams.get("companyId"));
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.toLowerCase();

  let employees = await employeesStore.getAll();
  if (companyId) employees = employees.filter((e) => e.companyId === companyId);
  if (status) employees = employees.filter((e) => e.status === status);
  if (search) {
    employees = employees.filter(
      (e) =>
        e.name.toLowerCase().includes(search) ||
        e.email.toLowerCase().includes(search) ||
        e.employeeId.toLowerCase().includes(search) ||
        e.department.toLowerCase().includes(search) ||
        e.designation.toLowerCase().includes(search)
    );
  }

  employees.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return ok(employees);
}
