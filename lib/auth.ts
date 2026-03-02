import { cookies } from "next/headers";

const SESSION_COOKIE = "lc-companion-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function verifyPassword(password: string): Promise<boolean> {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) {
    throw new Error("APP_PASSWORD environment variable is not set");
  }
  return password === appPassword;
}

export async function createSession(): Promise<void> {
  const cookieStore = await cookies();
  // Simple session token: a hash of the password + a timestamp
  const token = Buffer.from(
    `authenticated:${Date.now()}`
  ).toString("base64");

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  if (!session?.value) return false;

  try {
    const decoded = Buffer.from(session.value, "base64").toString("utf-8");
    return decoded.startsWith("authenticated:");
  } catch {
    return false;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
