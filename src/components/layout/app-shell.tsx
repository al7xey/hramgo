import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { LegalFooter } from "@/components/layout/legal-footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:pt-16">
      <a href="#main-content" className="skip-link">
        К содержимому
      </a>
      <Header />
      <main
        id="main-content"
        className="site-container min-h-[calc(100svh-8rem)] overflow-visible pb-24 pt-4 md:pb-8 md:pt-8"
      >
        {children}
      </main>
      <LegalFooter />
      <BottomNav />
    </div>
  );
}
