import { NextRequest } from "next/server";
import { registerUser } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { badRequest, created } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const user = await registerUser(
      parsed.data.name,
      parsed.data.email,
      parsed.data.password,
      parsed.data.role,
      parsed.data.companyId
    );
    return created(user);
  } catch (error) {
    return badRequest((error as Error).message);
  }
}
