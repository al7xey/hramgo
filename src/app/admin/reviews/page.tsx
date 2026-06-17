import { AdminReviewTable } from "@/components/admin/admin-review-table";
import { listTemples } from "@/features/temples/repository";

export default async function AdminReviewsPage() {
  const temples = await listTemples({});

  return (
    <div className="grid gap-5">
      <h1 className="text-3xl font-semibold">Отзывы</h1>
      <AdminReviewTable temples={temples} />
    </div>
  );
}
