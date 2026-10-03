import { getTempleBySlug } from "@/features/temples/repository";
import { notFound, ok } from "@/lib/api/response";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const temple = await getTempleBySlug(slug);

  if (!temple) {
    return notFound("Храм не найден");
  }

  return ok({ temple });
}
