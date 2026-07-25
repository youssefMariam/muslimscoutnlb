// ============================================================
// عدّل هذه اللائحة لإضافة أو حذف حسابات الأدمن
// troop = "all" يعني أدمن رئيسي يشوف كل الأفواج
// troop = يجب أن يطابق NAMEً القيمة الموجودة بالضبط بعمود "اسم الفوج" بالشيت
// ============================================================

export type AdminAccount = {
  username: string;
  password: string;
  troop: string; // "all" أو اسم الفوج بالضبط كما بالشيت
  displayName: string; // الاسم يلي بيظهر بالواجهة
};
export const ADMINS: AdminAccount[] = [
  {
    username: "admin",
    password: "Admin#Main2026!",
    troop: "all",
    displayName: "مفوضية الشمال - أدمن رئيسي",
  },
  {
    username: "abubakr",
    password: "AbuBakr#Troop2026!",
    troop: "فوج أبي بكر الصدّيق - مرياطة",
    displayName: "فوج أبي بكر الصدّيق",
  },
  {
    username: "hamza",
    password: "Hamza#Troop2026!",
    troop: "فوج حمزة بن عبد المطلب - المعرض",
    displayName: "فوج حمزة بن عبد المطلب",
  },
  {
    username: "khalid",
    password: "Khalid#Troop2026!",
    troop: "فوج خالد بن الوليد - عين التينة - الضنية",
    displayName: "فوج خالد بن الوليد",
  },
  {
    username: "dar_altarbiya",
    password: "DarTarbiya#Troop2026!",
    troop: "فوج دار التربية والتعليم (الكلية)",
    displayName: "فوج دار التربية والتعليم",
  },
  {
    username: "rawda",
    password: "rawda#Troop2026!",
    troop: "فوج روضة الفيحاء - الضم والفرز",
    displayName: "فوج روضة الفيحاء",
  },
  {
    username: "omar_khattab",
    password: "OmarKhattab#Troop2026!",
    troop: "فوج عمر بن الخطاب - البداوي",
    displayName: "فوج عمر بن الخطاب",
  },
  {
    username: "omar_abdulaziz",
    password: "OmarAziz#Troop2026!",
    troop: "فوج عمر بن عبد العزيز- أبي سمراء",
    displayName: "فوج عمر بن عبد العزيز",
  },
  {
    username: "muawiya",
    password: "Muawiya#Troop2026!",
    troop: "فوج معاوية البحري - الميناء",
    displayName: "فوج معاوية البحري",
  },
];

export function findAdmin(
  username: string,
  password: string,
): AdminAccount | null {
  const found = ADMINS.find(
    (a) => a.username === username.trim() && a.password === password,
  );
  return found ?? null;
}
