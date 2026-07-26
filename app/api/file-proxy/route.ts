import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { verifySessionCookie } from "@/lib/session";
import { fetchRowsForTroop } from "@/lib/sheets";
import { extractDriveFileId, fetchDriveFile } from "@/lib/drive";
import { FILE_FIELDS } from "@/lib/fields";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = verifySessionCookie(req.cookies.get("scout_session")?.value);
  if (!session) {
    return NextResponse.json({ error: "غير مسجل دخول" }, { status: 401 });
  }

  const url = req.nextUrl.searchParams.get("u");
  if (!url) {
    return NextResponse.json({ error: "رابط ناقص" }, { status: 400 });
  }

  // ✅ نقطة الحماية الأساسية: هل هالرابط بالذات موجود ضمن بيانات
  // فوج هالأدمن تحديدًا؟ (وليس أي فوج تاني). إذا لأ، منوع.
  const rows = await fetchRowsForTroop(session.troop);
  const isAllowed = rows.some((row) =>
    FILE_FIELDS.some((field) => (row[field] || "").includes(url))
  );

  if (!isAllowed) {
    return NextResponse.json(
      { error: "غير مسموح بالوصول لهالملف" },
      { status: 403 }
    );
  }

  const fileId = extractDriveFileId(url);
  if (!fileId) {
    return NextResponse.json({ error: "تعذّر تحديد الملف" }, { status: 400 });
  }

  try {
    const file = await fetchDriveFile(fileId);
    const webStream = Readable.toWeb(file.stream as Readable) as ReadableStream;

    return new Response(webStream, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "تعذّر جلب الملف من Drive", details: err?.message },
      { status: 500 }
    );
  }
}
