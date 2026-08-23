"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ModeNuitToggle } from "@/components/dashboard/ModeNuitToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CompyoMark } from "@/components/marketing/CompyoMark";
import {
  IconeAccueil,
  IconeDossier,
  IconeDocument,
  IconeCalendrier,
  IconeParametres,
  IconeRetours,
} from "@/components/ui/Icones";

const LIENS = [
  { href: "/dashboard", label: "Accueil", Icone: IconeAccueil },
  { href: "/dashboard/demandes", label: "Projets", Icone: IconeDossier },
  { href: "/dashboard/devis", label: "Devis", Icone: IconeDocument },
  { href: "/dashboard/planning", label: "Planning", Icone: IconeCalendrier },
  { href: "/carte-mentale", label: "Carte mentale", Icone: IconeRetours },
  { href: "/dashboard/parametres", label: "Paramètres", Icone: IconeParametres },
];

// Navigation Module 16 : le site vitrine reste accessible sans jamais se
// déconnecter (voir app/page.tsx) — ce petit bloc secondaire permet d'y
// revenir directement depuis l'app.
const LIENS_SITE = [
  { href: "/", label: "Site vitrine" },
  { href: "/contact", label: "Contact" },
];

export function Sidebar({ nomArtisan }: { nomArtisan: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [menuOuvert, setMenuOuvert] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Barre mobile : logo + bouton menu, remplace la sidebar sur petit écran.
          bg-anthracite (fixe) plutôt que bg-ink : la sidebar/barre de nav est
          un élément de chrome permanent, comme le pied de page du site
          vitrine — elle reste sombre dans les deux modes plutôt que de
          s'inverser en une barre claire en mode sombre. Le texte utilise
          donc du blanc fixe (text-white/...), pas text-paper qui, lui,
          deviendrait sombre en mode sombre et disparaîtrait. */}
      <div className="sm:hidden flex items-center justify-between bg-anthracite text-white px-4 h-14">
        <span className="flex items-center gap-2">
          <CompyoMark variante="blanc" taille={24} />
          <p className="font-display font-semibold">Compyo</p>
        </span>
        <button
          onClick={() => setMenuOuvert(!menuOuvert)}
          className="p-2 -mr-2"
          aria-label="Menu"
        >
          <span className="block w-5 h-px bg-white mb-1.5" />
          <span className="block w-5 h-px bg-white mb-1.5" />
          <span className="block w-5 h-px bg-white" />
        </button>
      </div>

      {menuOuvert && (
        <div className="sm:hidden bg-anthracite text-white px-3 pb-4">
          <nav className="flex flex-col gap-1">
            {LIENS.map((lien) => {
              const actif = pathname === lien.href;
              return (
                <Link
                  key={lien.href}
                  href={lien.href}
                  onClick={() => setMenuOuvert(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-xl transition-colors ${
                    actif
                      ? "bg-white/10 text-white font-medium"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <lien.Icone taille={17} />
                  {lien.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-3 pt-3 border-t border-white/10 px-3 flex flex-col gap-2 items-start">
            <div className="flex items-center gap-3">
              {LIENS_SITE.map((lien) => (
                <Link
                  key={lien.href}
                  href={lien.href}
                  onClick={() => setMenuOuvert(false)}
                  className="text-xs text-white/60 hover:text-white underline"
                >
                  {lien.label}
                </Link>
              ))}
            </div>
            <p className="text-xs text-white/50 font-mono truncate">{nomArtisan}</p>
            <div className="flex items-center gap-3">
              <ThemeToggle className="text-sm leading-none hover:scale-110 transition-transform" />
              <ModeNuitToggle className="text-xs text-white/60 hover:text-white underline" />
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-white/60 hover:text-white underline"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      )}

      {/* Sidebar classique, visible uniquement à partir de la taille tablette */}
      <aside className="hidden sm:flex sm:w-60 sm:shrink-0 bg-anthracite text-white min-h-screen flex-col justify-between">
        <div>
          <div className="px-6 py-6 border-b border-white/10 flex items-center gap-2.5">
            <CompyoMark variante="blanc" taille={26} />
            <p className="font-display font-semibold">Compyo</p>
          </div>
          <nav className="mt-4 flex flex-col gap-1 px-3">
            {LIENS.map((lien) => {
              const actif = pathname === lien.href;
              return (
                <Link
                  key={lien.href}
                  href={lien.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-xl transition-colors ${
                    actif
                      ? "bg-white/10 text-white font-medium"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <lien.Icone taille={17} />
                  {lien.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="px-6 py-6 border-t border-white/10 flex flex-col gap-2 items-start">
          <div className="flex items-center gap-3">
            {LIENS_SITE.map((lien) => (
              <Link
                key={lien.href}
                href={lien.href}
                className="text-xs text-white/60 hover:text-white underline"
              >
                {lien.label}
              </Link>
            ))}
          </div>
          <p className="text-xs text-white/50 font-mono truncate">{nomArtisan}</p>
          <div className="flex items-center gap-3">
            <ThemeToggle className="text-sm leading-none hover:scale-110 transition-transform" />
            <ModeNuitToggle className="text-xs text-white/60 hover:text-white underline" />
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-white/60 hover:text-white underline"
          >
            Se déconnecter
          </button>
        </div>
      </aside>
    </>
  );
}
