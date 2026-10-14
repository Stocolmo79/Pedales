import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "admin_session";

function constantTimeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return constantTimeEqual(password, expected);
}

// Session token is derived from the admin password so no separate session store is needed.
export function createAdminSessionToken(): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("ADMIN_PASSWORD is not configured");
  return createHmac("sha256", secret).update("admin-session").digest("hex");
}

export function isValidAdminSessionToken(token: string | undefined): boolean {
  if (!token || !process.env.ADMIN_PASSWORD) return false;
  return constantTimeEqual(token, createAdminSessionToken());
}

export async function isAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}
