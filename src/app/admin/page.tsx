import { AdminImportJobsTable } from "@/components/admin/admin-import-jobs-table";
import { AdminReviewTable } from "@/components/admin/admin-review-table";
import { AdminTempleTable } from "@/components/admin/admin-temple-table";
import { listTemples } from "@/features/temples/repository";

export default async function AdminPage() {
  const temples = await listTemples({});

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl font-semibold">Админ-модерация</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Очередь данных, отзывов, фото и действий модераторов.
        </p>
      </div>
      <AdminTempleTable temples={temples.slice(0, 4)} />
      <AdminReviewTable temples={temples} />
      <AdminImportJobsTable />
    </div>
  );
}
