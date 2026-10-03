import { AdminImportJobsTable } from "@/components/admin/admin-import-jobs-table";

export default function AdminImportsPage() {
  return (
    <div className="grid gap-5">
      <h1 className="text-3xl font-semibold">Импорт данных</h1>
      <AdminImportJobsTable />
    </div>
  );
}
