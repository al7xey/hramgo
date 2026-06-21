import { badRequest, forbidden, notFound, ok } from "@/lib/api/response";
import { isAuthFailure, requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["ADMIN"]);
  if (isAuthFailure(auth)) return auth.response;

  const { id } = await params;
  if (id === auth.user.id) {
    return badRequest("Нельзя удалить собственный аккаунт");
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, status: true } });
  if (!user || user.status === "DELETED") {
    return notFound("Пользователь не найден");
  }

  if (user.role === "ADMIN") {
    return forbidden("Нельзя удалить администратора");
  }

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.account.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        status: "DELETED",
        email: null,
        passwordHash: null,
        name: "Удалённый пользователь",
        image: null
      }
    })
  ]);

  return ok({ message: "Пользователь удалён" });
}
