import { AdminTempleTable } from "@/components/admin/admin-temple-table";
import { listTemples } from "@/features/temples/repository";

export default async function RepresentativeTemplesPage() {
  const temples = await listTemples({});

  return (
    <div className="grid gap-5">
      <h1 className="text-3xl font-semibold">Данные храмов</h1>
      <AdminTempleTable temples={temples.slice(0, 1)} />
    </div>
  );
}
