"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
export function ContextLink({
  href,
  onClick,
  ...props
}: ComponentProps<typeof Link>) {
  const router = useRouter();
  const pathname = usePathname();
  const target = String(href);
  const active =
    pathname.replace(/\/$/, "") === target.replace(/\/$/, "") ||
    (target.replace(/\/$/, "") === "/temples" &&
      pathname.startsWith("/temples/"));
  return (
    <Link
      {...props}
      href={href}
      aria-current={active ? "page" : props["aria-current"]}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        if (!/^\/(map|temples)\/?$/.test(target)) return;
        const current = new URL(window.location.href);
        const params = current.pathname.match(/^\/(map|temples)\/?$/)
          ? current.searchParams
          : new URLSearchParams(
              current.searchParams.get("returnTo")?.split("?")[1] ?? ""
            );
        params.delete("returnTo");
        event.preventDefault();
        router.push(target + (params.size ? `?${params}` : ""));
      }}
    />
  );
}
