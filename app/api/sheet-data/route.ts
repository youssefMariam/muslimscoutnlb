import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/session";
import { fetchRowsForTroop } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  const session = verifySessionCookie(req.cookies.get("scout_session")?.value);
  if (!session) {
    return NextResponse.json({ error: "غير مسجل دخول" }, { status: 401 });
  }

  try {
    const rows = await fetchRowsForTroop(session.troop);
    return NextResponse.json({
      troop: session.troop,
      displayName: session.displayName,
      count: rows.length,
      rows,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "تعذّر جلب البيانات من الشيت", details: err?.message },
      { status: 500 }
    );
  }
}
