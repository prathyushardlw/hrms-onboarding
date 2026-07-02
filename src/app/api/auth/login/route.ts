import { NextRequest } from "next/server";
import { loginUser } from "@/lib/auth";
import { companiesStore } from "@/lib/store";
import { loginSchema } from "@/lib/validations";
import { ok, badRequest } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const { user, token } = await loginUser(parsed.data.email, parsed.data.password);

    // Resolve active company name for the frontend
    const activeCompanyId = user.companyIds[0] ?? null;
    const activeCompanyName = activeCompanyId
      ? ((await companiesStore.getById(activeCompanyId))?.name ?? null)
      : null;

    return ok({ user, token, activeCompanyId, activeCompanyName });
  } catch (error) {
    return badRequest((error as Error).message);
  }
}
