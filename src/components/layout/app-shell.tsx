import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { LegalFooter } from "@/components/layout/legal-footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto min-h-[calc(100vh-8rem)] w-full max-w-7xl overflow-visible px-4 pb-24 pt-4 sm:px-6 md:pb-8 md:pt-8 lg:px-8">
        {children}
      </main>
      <LegalFooter />
      <BottomNav />
    </div>
  );
}
