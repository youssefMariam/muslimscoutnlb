// أداة تشخيص مستقلة - بتفحص بيانات الاعتماد بره Next.js تمامًا
// تشغيل: node scripts/test-credentials.mjs

import fs from "fs";
import path from "path";
import { google } from "googleapis";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ ما لقيت ملف .env.local بمجلد المشروع الحالي.");
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, "utf-8");
  const env = {};
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function main() {
  const env = loadEnvLocal();

  let clientEmail = env.GOOGLE_CLIENT_EMAIL;
  let privateKey = (env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  console.log("── فحص متغيرات البيئة ──");

  if (env.GOOGLE_SERVICE_ACCOUNT_B64) {
    console.log("✓ لقيت GOOGLE_SERVICE_ACCOUNT_B64 (طوله:", env.GOOGLE_SERVICE_ACCOUNT_B64.length, "حرف)");
    try {
      const decoded = Buffer.from(env.GOOGLE_SERVICE_ACCOUNT_B64, "base64").toString("utf-8");
      const json = JSON.parse(decoded);
      clientEmail = json.client_email;
      privateKey = json.private_key;
      console.log("✓ تم فك التشفير وقراءة الـ JSON بنجاح");
      console.log("  client_email:", clientEmail || "❌ غير موجود بالملف!");
      console.log(
        "  private_key يبدأ بـ:",
        privateKey ? privateKey.slice(0, 30) : "❌ غير موجود بالملف!"
      );
    } catch (e) {
      console.error("❌ فشل فك تشفير GOOGLE_SERVICE_ACCOUNT_B64 أو قراءته كـ JSON:", e.message);
      console.error("   → غالبًا النص يلي نسخته مو كامل. أعد تشغيل أمر الـ base64 وتأكد إنك نسخت السطر كامل.");
      process.exit(1);
    }
  } else {
    console.log("ℹ️ GOOGLE_SERVICE_ACCOUNT_B64 مو موجود، رح أفحص GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY");
    console.log("  GOOGLE_CLIENT_EMAIL:", clientEmail || "❌ غير موجود");
    console.log("  GOOGLE_PRIVATE_KEY طوله:", privateKey.length, "حرف");
  }

  console.log("\n── فحص شكل المفتاح ──");
  if (!privateKey) {
    console.error("❌ ما فيه private_key إطلاقًا. الملف الأصلي (JSON) ناقص أو مو مكتمل.");
    process.exit(1);
  }
  const hasHeader = privateKey.includes("-----BEGIN PRIVATE KEY-----");
  const hasFooter = privateKey.includes("-----END PRIVATE KEY-----");
  const hasNewlines = privateKey.includes("\n");
  console.log("  فيه BEGIN header؟", hasHeader ? "✓" : "❌");
  console.log("  فيه END footer؟", hasFooter ? "✓" : "❌");
  console.log("  فيه أسطر جديدة (\\n محوّلة)؟", hasNewlines ? "✓" : "❌");
  console.log("  طول المفتاح الكامل:", privateKey.length, "حرف (لازم يكون فوق الـ 1500 عادةً)");

  if (!hasHeader || !hasFooter || !hasNewlines) {
    console.error(
      "\n❌ شكل المفتاح غلط. الملف الأصلي (service account JSON) على الأغلب انفتح أو انحفظ ببرنامج (Word/Notepad بإعدادات غلط) وتغيّر شكله."
    );
    console.error("   → الحل: ارجع لـ Google Cloud Console → Service Account → Keys → Create new key");
    console.error("     ونزّل ملف JSON جديد، وحوّله base64 فورًا بدون ما تفتحه بأي برنامج تحرير نصوص.");
    process.exit(1);
  }

  console.log("\n── محاولة الاتصال الفعلي بـ Google ──");
  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    await auth.authorize();
    console.log("✅ نجح! بيانات الاعتماد صحيحة ومقبولة من Google.");

    if (env.GOOGLE_SHEET_ID && env.GOOGLE_SHEET_TAB) {
      console.log("\n── محاولة قراءة الشيت الفعلي ──");
      const sheets = google.sheets({ version: "v4", auth });
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: env.GOOGLE_SHEET_ID,
        range: env.GOOGLE_SHEET_TAB,
      });
      const rowCount = (res.data.values || []).length;
      console.log(`✅ نجحت القراءة! لقيت ${rowCount} صف (يشمل صف العناوين).`);
      if (rowCount > 0) {
        console.log("   أول عمودين بصف العناوين:", res.data.values[0].slice(0, 2));
      }
    }
  } catch (e) {
    console.error("❌ فشل الاتصال:", e.message);
    if (e.message?.includes("DECODER")) {
      console.error("   → المفتاح نفسه تالف رغم إنه شكله سليم ظاهريًا. نزّل مفتاح JSON جديد من Google Cloud Console.");
    } else if (e.message?.includes("403") || e.message?.includes("PERMISSION")) {
      console.error("   → الشيت مو مشارك مع هالإيميل:", clientEmail, "- تأكد شاركته بصلاحية Viewer.");
    } else if (e.message?.includes("404") || e.message?.includes("not found")) {
      console.error("   → تأكد GOOGLE_SHEET_ID و GOOGLE_SHEET_TAB صحيحين ومطابقين تمامًا لاسم التبويب بالشيت.");
    }
    process.exit(1);
  }
}

main();
