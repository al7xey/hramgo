import { AdminModerationLog } from "@/components/admin/admin-moderation-log";

export default function AdminModerationPage() {
  return (
    <div className="grid gap-5">
      <h1 className="text-3xl font-semibold">Журнал модерации</h1>
      <AdminModerationLog />
    </div>
  );
}
