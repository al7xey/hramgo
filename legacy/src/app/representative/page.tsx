import { RepresentativeDashboard } from "@/components/representative/representative-dashboard";
import { listTemples } from "@/features/temples/repository";

export default async function RepresentativePage() {
  const temples = await listTemples({});

  return (
    <div className="mx-auto max-w-3xl">
      <RepresentativeDashboard temple={temples[0]} />
    </div>
  );
}
