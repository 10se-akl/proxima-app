"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CompyoMark } from "@/components/marketing/CompyoMark";
import { Avatar } from "@/components/ui/Avatar";
import { BoutonInstallerDiscret } from "@/components/pwa/BoutonInstallerDiscret";
import { CentreNotifications } from "@/components/notifications/CentreNotifications";
import {
  IconeAccueil,
  IconeDossier,
  IconeDocument,
  IconeCalendrier,
  IconeNote,
  IconeParametres,
  IconeRetours,
} from "@/components/ui/Icones";

// Notes (29/08) — même niveau que Projets/Aujourd'hui/Planning dans la
// nav, demande explicite du brief ("Ajouter un nouvel onglet 'Notes'.
// Même niveau que : Projets / Aujourd'hui / Planning").
const LIENS = [
  { href: "/dashboard", label: "Accueil", Icone: IconeAccueil },
  { href: "/dashboard/demandes", label: "Projets", Icone: IconeDossier },
  { href: "/dashboard/notes", label: "Notes", Icone: IconeNote },
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

// Bloc "compte" en bas de la sidebar — un seul composant partagé entre la
// version mobile (menu déplié) et la version desktop (aside), pour que les
// deux ne divergent jamais. Refonte (retour d'Axel) : l'ancienne version
// empilait 4-5 lignes hétérogènes (liens site, nom, thème, déconnexion)
// sans hiérarchie claire. Nouvelle organisation en trois niveaux, du plus
// important au moins important : identité (avatar + nom) → actions
// courantes en une rangée d'icônes compactes → liens secondaires du site
// vitrine, discrets tout en bas.
function BlocCompteSidebar({
  nomArtisan,
  onNaviguer,
  onDeconnexion,
}: {
  nomArtisan: string;
  onNaviguer?: () => void;
  onDeconnexion: () => void;
}) {
  return (
    <div className="px-4 py-5 border-t border-white/10 flex flex-col gap-3">
      <div className="flex items-center gap-2.5 px-2">
        <Avatar nom={nomArtisan || "?"} taille={30} />
        <p className="text-sm text-white/80 font-medium truncate">{nomArtisan}</p>
      </div>

      {/* Sprint Robustesse (30/08) — zones tactiles agrandies (32px → 44px,
          recommandation Apple/Google) et espacement doublé (gap-1 → gap-2.5)
          entre les 4 boutons : un artisan visant le thème pouvait toucher
          "Se déconnecter" juste à côté par imprécision du doigt. L'icône
          elle-même (taille={17} sur CentreNotifications, emoji des autres)
          ne change pas visuellement — seule la zone cliquable grandit via
          w-11 h-11 (44px) plutôt qu'un padding qui aurait aussi agrandi
          l'icône. Le bouton "Se déconnecter" garde 44px mais reste
          visuellement identique. */}
      <div className="flex items-center gap-2.5 px-2">
        <CentreNotifications />
        <ThemeToggle className="w-11 h-11 grid place-items-center rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors" />
        <BoutonInstallerDiscret
          compact
          className="w-11 h-11 grid place-items-center rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        />
        <button
          onClick={onDeconnexion}
          title="Se déconnecter"
          aria-label="Se déconnecter"
          className="w-11 h-11 grid place-items-center rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          <span aria-hidden="true">⏻</span>
        </button>
      </div>

      <div className="flex items-center gap-2.5 px-2 pt-2 border-t border-white/5">
        {LIENS_SITE.map((lien, i) => (
          <span key={lien.href} className="flex items-center gap-2.5">
            {i > 0 && <span className="text-white/20 text-xs" aria-hidden="true">·</span>}
            <Link
              href={lien.href}
              onClick={onNaviguer}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              {lien.label}
            </Link>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Sidebar({ nomArtisan }: { nomArtisan: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [menuOuvert, setMenuOuvert] = useState(false);

  async function handleLogout() {
    // Sprint Robustesse (30/08) — confirmation avant déconnexion, cohérent
    // avec le pattern déjà utilisé pour les actions à conséquence ailleurs
    // dans l'app (ex: suppression d'un rendez-vous). Utile en particulier
    // maintenant que ce bouton est juste à côté de "Installer l'app" et
    // "Thème" : un doigt qui touche la mauvaise icône ne déconnecte plus
    // l'artisan sans qu'il l'ait vraiment voulu.
    if (!window.confirm("Se déconnecter de Compyo ?")) return;
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
      {/* pt-[env(safe-area-inset-top)] : sur un iPhone à encoche/Dynamic
          Island, l'app installée (mode "standalone") dessine désormais
          jusque sous cette zone (viewport-fit=cover, voir app/layout.tsx)
          — sans cette marge, le logo et le bouton menu se retrouveraient
          partiellement masqués par l'encoche plutôt que dessous. */}
      <div className="sm:hidden flex items-center justify-between bg-anthracite text-white px-4 min-h-14 [padding-top:calc(env(safe-area-inset-top)+0.5rem)] [padding-bottom:0.5rem]">
        <span className="flex items-center gap-2">
          <CompyoMark variante="blanc" taille={24} />
          <p className="font-display font-semibold">Compyo</p>
        </span>
        {/* Sprint Robustesse (30/08) — zone tactile ~36×31px avant (p-2),
            trop petite pour la norme 44×44px. w-11 h-11 (44px) avec un
            flex centré garde les 3 barres visuellement identiques et à la
            même place (la marge négative -mr-3 compense l'agrandissement
            du padding pour que la barre reste alignée au bord droit comme
            avant). */}
        <button
          onClick={() => setMenuOuvert(!menuOuvert)}
          className="w-11 h-11 -mr-3 flex flex-col items-center justify-center"
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
          <BlocCompteSidebar
            nomArtisan={nomArtisan}
            onNaviguer={() => setMenuOuvert(false)}
            onDeconnexion={handleLogout}
          />
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

        <BlocCompteSidebar nomArtisan={nomArtisan} onDeconnexion={handleLogout} />
      </aside>
    </>
  );
}
