import { NextRequest, NextResponse } from "next/server";
import { verifyToken, type JwtPayload } from "./auth";
import type { ApiResponse } from "./types";

export function getAuthFromRequest(req: NextRequest): JwtPayload | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

export function unauthorized(): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}

export function forbidden(): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 }
  );
}

export function badRequest(error: string): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

export function notFound(error = "Not found"): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status: 404 });
}

export function ok<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data });
}

export function created<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status: 201 });
}
