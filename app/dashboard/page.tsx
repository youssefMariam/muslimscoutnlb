import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionCookie } from "@/lib/session";
import DashboardClient from "@/components/DashboardClient";

export default function DashboardPage() {
  const session = verifySessionCookie(cookies().get("scout_session")?.value);
  if (!session) {
    redirect("/");
  }

  return <DashboardClient session={session!} />;
}
