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
    password: "CHANGE_ME_MAIN_ADMIN",
    troop: "all",
    displayName: "مفوضية الشمال - أدمن رئيسي",
  },
  {
    username: "hamza",
    password: "CHANGE_ME",
    troop: "فوج حمزة بن عبد المطلب - المعرض",
    displayName: "قائد فوج حمزة بن عبد المطلب",
  },
  {
    username: "muawiya",
    password: "CHANGE_ME",
    troop: "فوج معاوية البحري - الميناء",
    displayName: "قائد فوج معاوية البحري",
  },
  // أضف باقي الأفواج هون بنفس الشكل...
];

export function findAdmin(username: string, password: string): AdminAccount | null {
  const found = ADMINS.find(
    (a) => a.username === username.trim() && a.password === password
  );
  return found ?? null;
}
