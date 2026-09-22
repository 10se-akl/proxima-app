"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Navigation entre les pages d'administration (22/09) — jusqu'ici, chacune
// ne s'atteignait qu'en tapant son adresse.
const PAGES = [
  { href: "/admin/statistiques", label: "Statistiques" },
  { href: "/admin/candidatures", label: "Candidatures" },
  { href: "/admin/retours", label: "Retours" },
  { href: "/admin/logs", label: "Journaux" },
  { href: "/admin/maintenance", label: "Maintenance" },
];

export function NavigationAdmin() {
  const chemin = usePathname();
  return (
    <nav aria-label="Administration" className="border-b border-ink/10 bg-surface">
      <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-5 py-2 sm:px-8">
        {PAGES.map((p) => {
          const actif = chemin?.startsWith(p.href);
          return (
            <Link
              key={p.href}
              href={p.href}
              aria-current={actif ? "page" : undefined}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                actif ? "bg-ink text-paper" : "text-ink/60 hover:bg-ink/5 hover:text-ink"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
        <Link href="/dashboard" className="ml-auto shrink-0 px-3 py-1.5 text-sm text-ink/50 hover:text-ink">
          Retour à l&apos;app →
        </Link>
      </div>
    </nav>
  );
}
