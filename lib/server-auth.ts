import "server-only";
import { adminAuth } from "@/lib/firebase-admin";

export async function requireUser(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const token = authorization.slice(7).trim();
  if (!token) throw new Error("UNAUTHORIZED");
  return adminAuth.verifyIdToken(token);
}
