import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth/options";

export default async function RepresentativeLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (role !== "ADMIN" && role !== "MODERATOR" && role !== "TEMPLE_REPRESENTATIVE") {
    redirect("/profile");
  }

  return children;
}
