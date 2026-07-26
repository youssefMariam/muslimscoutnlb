export function parseFileLinks(value: string): string[] {
  if (!value) return [];
  const links = value.match(/https?:\/\/[^\s,\)]+/g) || [];
  return Array.from(new Set(links.map((s) => s.trim())));
}

export function isDriveLink(value: string) {
  return /https?:\/\/(?:drive\.google\.com|docs\.google\.com)\//i.test(value);
}

export function toProxyLink(value: string, origin: string) {
  return `${origin}/api/file-proxy?u=${encodeURIComponent(value)}`;
}

export function cleanExportValue(value: string, origin: string) {
  if (!value) return "";
  const trimmed = value
    .replace(/↵/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const links = parseFileLinks(trimmed);
  if (links.length > 0) {
    return Array.from(new Set(links))
      .map((link) => (isDriveLink(link) ? toProxyLink(link, origin) : link))
      .join("; ");
  }
  return trimmed;
}

// بيحاول يقرأ تاريخ ميلاد بأشكال متعددة (M/D/YYYY أو YYYY-MM-DD الخ)
// ويرجع العمر بالسنين، أو null إذا ما قدر يفهم التاريخ
export function computeAge(dateStr: string): number | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();
  let date: Date | null = null;

  const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);

  if (isoMatch) {
    date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  } else if (slashMatch) {
    // Google Forms افتراضيًا بيحفظ M/D/YYYY
    date = new Date(Number(slashMatch[3]), Number(slashMatch[1]) - 1, Number(slashMatch[2]));
  } else {
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) date = parsed;
  }

  if (!date || isNaN(date.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const m = now.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < date.getDate())) age--;

  if (age < 0 || age > 110) return null;
  return age;
}

export function initialsFromName(name: string): string {
  if (!name) return "؟";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[0]?.[0] || "؟";
}

// بينظف رقم الهاتف اللبناني لصيغة wa.me (بيضيف كود لبنان 961 لو الرقم محلي)
export function toWhatsAppLink(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return null;
  let normalized = digits.replace(/^\+/, "");
  if (normalized.startsWith("00")) normalized = normalized.slice(2);
  if (normalized.length <= 8 && !normalized.startsWith("961")) {
    normalized = "961" + normalized.replace(/^0+/, "");
  }
  return `https://wa.me/${normalized}`;
}
