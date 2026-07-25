import { google } from "googleapis";
import { getSheetsAuth } from "@/lib/sheets";

export function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  // يدعم أشكال متعددة من روابط Drive:
  // https://drive.google.com/file/d/FILE_ID/view
  // https://drive.google.com/open?id=FILE_ID
  // https://drive.google.com/uc?id=FILE_ID
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export async function fetchDriveFile(fileId: string) {
  const auth = getSheetsAuth();
  const drive = google.drive({ version: "v3", auth });

  const meta = await drive.files.get({
    fileId,
    fields: "name, mimeType",
  });

  const content = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );

  return {
    name: meta.data.name || "file",
    mimeType: meta.data.mimeType || "application/octet-stream",
    stream: content.data as NodeJS.ReadableStream,
  };
}
