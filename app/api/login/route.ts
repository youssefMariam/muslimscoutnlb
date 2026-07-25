import { NextRequest, NextResponse } from "next/server";
import { findAdmin } from "@/lib/admins";
import { createSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const username = body?.username;
  const password = body?.password;

  if (!username || !password) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  const admin = findAdmin(username, password);
  if (!admin) {
    return NextResponse.json(
      { error: "اسم المستخدم أو كلمة السر غير صحيحة" },
      { status: 401 }
    );
  }

  const cookieValue = createSessionCookie({
    username: admin.username,
    displayName: admin.displayName,
    troop: admin.troop,
  });

  const res = NextResponse.json({ ok: true, displayName: admin.displayName, troop: admin.troop });
  res.cookies.set("scout_session", cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("scout_session", "", { maxAge: 0, path: "/" });
  return res;
}
