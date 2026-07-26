import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { verifySessionCookie } from "@/lib/session";
import { fetchRowsForTroop } from "@/lib/sheets";
import { extractDriveFileId, fetchDriveFile } from "@/lib/drive";
import { FILE_FIELDS, getFieldValue } from "@/lib/fields";
import { parseFileLinks } from "@/lib/utils";

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

  const requestedFileId = extractDriveFileId(url);
  if (!requestedFileId) {
    return NextResponse.json({ error: "تعذّر تحديد الملف" }, { status: 400 });
  }

  // ✅ نقطة الحماية الأساسية: هل هالرابط بالذات موجود ضمن بيانات
  // فوج هالأدمن تحديدًا؟ (وليس أي فوج تاني). إذا لأ، منوع.
  const rows = await fetchRowsForTroop(session.troop);
  const isAllowed = rows.some((row) =>
    FILE_FIELDS.some((field) =>
      parseFileLinks(getFieldValue(row, field)).some(
        (link) => extractDriveFileId(link) === requestedFileId,
      ),
    ),
  );

  if (!isAllowed) {
    return NextResponse.json(
      { error: "غير مسموح بالوصول لهالملف" },
      { status: 403 },
    );
  }

  try {
    const file = await fetchDriveFile(requestedFileId);
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
      { status: 500 },
    );
  }
}
