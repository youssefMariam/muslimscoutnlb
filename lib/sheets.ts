import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID as string;
const SHEET_TAB = process.env.GOOGLE_SHEET_TAB as string; // اسم التبويب بالضبط، مثال: "Form Responses 1"

// اسم العمود بالشيت اللي بيحدد الفوج - عدّله إذا كان مختلف عن هيك بالضبط
export const TROOP_COLUMN_HEADER = "اسم الفوج";

let cachedAuth: any = null;

function getAuth() {
  if (cachedAuth) return cachedAuth;

  let clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  // Preferred, more robust path: base64 of the *entire* service account JSON file.
  // Avoids all the \n-escaping headaches of pasting a raw private key into .env.
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
  if (b64) {
    try {
      const json = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
      clientEmail = json.client_email;
      privateKey = json.private_key;
    } catch (e) {
      throw new Error(
        "GOOGLE_SERVICE_ACCOUNT_B64 is set but could not be decoded/parsed as JSON."
      );
    }
  }

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing Google credentials. Set either GOOGLE_SERVICE_ACCOUNT_B64, or both GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY. See README."
    );
  }

  // Sanity check: a well-formed PEM key must have real line breaks and the right header.
  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----") || !privateKey.includes("\n")) {
    throw new Error(
      "GOOGLE_PRIVATE_KEY does not look like a valid PEM key (missing header or newlines). " +
        "Use GOOGLE_SERVICE_ACCOUNT_B64 instead to avoid escaping issues — see README."
    );
  }

  cachedAuth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
  });

  return cachedAuth;
}

export function getSheetsAuth() {
  return getAuth();
}

export type SheetRow = Record<string, string>;

// Simple in-memory cache so we don't hammer the Sheets API on every request.
// Data is refreshed automatically after CACHE_TTL_MS.
let cache: { rows: SheetRow[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds - tune as needed

export async function fetchSheetRows(forceRefresh = false): Promise<SheetRow[]> {
  const now = Date.now();
  if (!forceRefresh && cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rows;
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const range = `${SHEET_TAB}`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
  });

  const values = res.data.values || [];
  if (values.length === 0) {
    cache = { rows: [], fetchedAt: now };
    return [];
  }

  const headers = values[0].map((h) => (h || "").trim());
  const rows: SheetRow[] = values.slice(1).map((row) => {
    const obj: SheetRow = {};
    headers.forEach((header, i) => {
      obj[header] = (row[i] ?? "").toString().trim();
    });
    return obj;
  });

  cache = { rows, fetchedAt: now };
  return rows;
}

export async function fetchRowsForTroop(troop: string): Promise<SheetRow[]> {
  const rows = await fetchSheetRows();
  if (troop === "all") return rows;
  return rows.filter((r) => r[TROOP_COLUMN_HEADER] === troop);
}
