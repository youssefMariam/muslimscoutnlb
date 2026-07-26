import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { verifySessionCookie } from "@/lib/session";
import DashboardClient from "@/components/DashboardClient";

export default function DashboardPage() {
  const session = verifySessionCookie(cookies().get("scout_session")?.value);
  if (!session) {
    redirect("/");
  }

  return (
    <Suspense fallback={<div className="loading-state">جارٍ التحميل...</div>}>
      <DashboardClient session={session!} />
    </Suspense>
  );
}
