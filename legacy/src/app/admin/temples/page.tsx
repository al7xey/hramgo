import { AdminTempleTable } from "@/components/admin/admin-temple-table";
import { listTemples } from "@/features/temples/repository";

export default async function AdminTemplesPage() {
  const temples = await listTemples({});

  return (
    <div className="grid gap-5">
      <h1 className="text-3xl font-semibold">Храмы</h1>
      <AdminTempleTable temples={temples} />
    </div>
  );
}
