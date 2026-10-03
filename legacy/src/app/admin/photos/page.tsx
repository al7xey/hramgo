import { AdminPhotoModerationGrid } from "@/components/admin/admin-photo-moderation-grid";
import { listTemples } from "@/features/temples/repository";

export default async function AdminPhotosPage() {
  const temples = await listTemples({});

  return (
    <div className="grid gap-5">
      <h1 className="text-3xl font-semibold">Фото на проверке</h1>
      <AdminPhotoModerationGrid temples={temples} />
    </div>
  );
}
