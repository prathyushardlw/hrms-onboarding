import { NextRequest } from "next/server";
import { usersStore } from "@/lib/store";
import { registerUser } from "@/lib/auth";
import {
  getAuthFromRequest,
  unauthorized,
  forbidden,
  badRequest,
  ok,
  created,
  isSuperAdmin,
} from "@/lib/api-helpers";
import type { UserRole } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  if (!isSuperAdmin(auth)) return forbidden();

  const users = usersStore.getAll().map(({ passwordHash: _, ...u }) => u);
  return ok(users);
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  if (!isSuperAdmin(auth)) return forbidden();

  const body = await req.json();
  const { name, email, password, role, companyIds } = body;

  if (!name?.trim()) return badRequest("Name is required");
  if (!email?.trim()) return badRequest("Email is required");
  if (!password || password.length < 6) return badRequest("Password must be at least 6 characters");

  const validRoles: UserRole[] = ["admin", "hr", "viewer"];
  if (!validRoles.includes(role)) return badRequest("Invalid role. Use: admin, hr, viewer");

  if (!Array.isArray(companyIds) || companyIds.length === 0) {
    return badRequest("companyIds must be a non-empty array");
  }

  try {
    const user = await registerUser(name.trim(), email.trim(), password, role, companyIds);
    return created(user);
  } catch (err) {
    return badRequest((err as Error).message);
  }
}
