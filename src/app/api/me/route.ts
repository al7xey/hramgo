import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/options";
import { ok, unauthorized } from "@/lib/api/response";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return unauthorized();
  }

  return ok({ user: session.user });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));

  return ok({ message: "Профиль обновлён", patch: body });
}
