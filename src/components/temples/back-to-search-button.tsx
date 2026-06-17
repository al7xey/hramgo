"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function BackToSearchButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-fit rounded-full px-4 dark:border-white/15 dark:bg-[#102233] dark:hover:bg-[#102233]"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }

        router.push("/temples");
      }}
    >
      <ArrowLeft className="size-4" aria-hidden />
      Вернуться к поиску
    </Button>
  );
}
