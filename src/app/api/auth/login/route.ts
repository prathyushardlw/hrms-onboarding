import { NextRequest } from "next/server";
import { loginUser, registerUser } from "@/lib/auth";
import { loginSchema, registerSchema } from "@/lib/validations";
import { ok, badRequest, created } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const { user, token } = await loginUser(parsed.data.email, parsed.data.password);
    return ok({ user, token });
  } catch (error) {
    return badRequest((error as Error).message);
  }
}
