import { ok } from "@/lib/api/response";
import { isAuthFailure, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const auth = await requireUser();

  if (isAuthFailure(auth)) {
    return auth.response;
  }

  const reviews = await prisma.review.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      text: true,
      status: true,
      helpfulCount: true,
      publishedAt: true,
      createdAt: true,
      temple: {
        select: {
          name: true,
          slug: true
        }
      }
    }
  });

  return ok({
    reviews: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      text: review.text,
      status: review.status,
      helpfulCount: review.helpfulCount,
      publishedAt: (review.publishedAt ?? review.createdAt).toISOString(),
      temple: review.temple
    }))
  });
}
