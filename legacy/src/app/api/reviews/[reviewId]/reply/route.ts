import { z } from "zod";

import { badRequest, notFound, ok } from "@/lib/api/response";
import { isAuthFailure, requireRepresentativeAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

const replySchema = z.object({
  text: z.string().trim().min(10).max(2000)
});

export async function POST(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  try {
    const { reviewId } = await params;
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, templeId: true }
    });

    if (!review) {
      return notFound("Отзыв не найден");
    }

    const auth = await requireRepresentativeAccess(review.templeId);

    if (isAuthFailure(auth)) {
      return auth.response;
    }

    const payload = replySchema.parse(await request.json());
    const reply = await prisma.reviewReply.create({
      data: {
        reviewId,
        userId: auth.user.id,
        text: payload.text,
        status: "APPROVED",
        publishedAt: new Date()
      },
      select: { id: true, text: true, status: true, publishedAt: true }
    });

    return ok({ message: "Ответ опубликован", reply });
  } catch (error) {
    return badRequest(error);
  }
}
