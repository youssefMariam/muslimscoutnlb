import crypto from "crypto";

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

export type SessionData = {
  username: string;
  displayName: string;
  troop: string; // "all" or a specific troop name
};

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function createSessionCookie(data: SessionData): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifySessionCookie(cookieValue: string | undefined): SessionData | null {
  if (!cookieValue) return null;
  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  // timing-safe compare
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const json = Buffer.from(payload, "base64url").toString("utf-8");
    return JSON.parse(json) as SessionData;
  } catch {
    return null;
  }
}
