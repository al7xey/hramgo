import { forbidden, notFound, ok } from "@/lib/api/response";
import { canModerate, isAuthFailure, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ photoId: string }> }) {
  const auth = await requireUser();

  if (isAuthFailure(auth)) {
    return auth.response;
  }

  const { photoId } = await params;
  const photo = await prisma.reviewPhoto.findUnique({
    where: { id: photoId },
    select: { id: true, review: { select: { userId: true } } }
  });

  if (!photo) {
    return notFound("Фото не найдено");
  }

  if (photo.review.userId !== auth.user.id && !canModerate(auth.user)) {
    return forbidden();
  }

  await prisma.reviewPhoto.delete({ where: { id: photo.id } });

  return ok({ message: "Фото удалено из отзыва" });
}
