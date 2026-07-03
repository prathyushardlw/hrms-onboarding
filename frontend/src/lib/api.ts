/**
 * Converts a relative /api/* path to an absolute backend URL.
 * Used so browser-side fetch calls hit the backend directly
 * instead of routing through the frontend Next.js server.
 */
const API_BASE =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL ?? ""
    : process.env.NEXT_PUBLIC_API_URL ?? "";

export function apiUrl(path: string): string {
  if (path.startsWith("/api/") || path.startsWith("/api?")) {
    return `${API_BASE}${path}`;
  }
  return path;
}
