import { redirect } from "next/navigation";
import { AdminLogin } from "@/components/admin-login";
import { getCurrentAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();

  if (admin) redirect("/admin");

  return <AdminLogin />;
}
