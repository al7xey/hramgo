import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { authOptions } from "@/lib/auth/options";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (role !== "ADMIN" && role !== "MODERATOR") {
    redirect("/profile");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <AdminSidebar />
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
