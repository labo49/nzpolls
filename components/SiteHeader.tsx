"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const NAV_LINKS = [
  { href: "/", label: "Poll of Polls" },
  { href: "/approval", label: "Approval Ratings" },
  { href: "/electorates", label: "Electorates" },
  { href: "/reliability", label: "Reliability" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            <Image src="/logo-mark.png" alt="" width={24} height={32} className="h-8 w-auto" priority />
            Aotearoa – New Zealand
          </Link>
          <nav className="flex items-center gap-4">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "text-sm font-medium text-neutral-900 dark:text-neutral-50"
                      : // transition-colors only applies here, where there's an actual hover
                        // state to animate -- on the active link it had nothing to transition
                        // *to* except a flash of near-invisible text whenever the theme toggle
                        // flips the page background instantly but eases this link's color over
                        // the transition duration instead.
                        "text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
