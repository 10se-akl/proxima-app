"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CompyoMark } from "@/components/marketing/CompyoMark";
import { Avatar } from "@/components/ui/Avatar";
import { BoutonInstallerDiscret } from "@/components/pwa/BoutonInstallerDiscret";
import { CentreNotifications } from "@/components/notifications/CentreNotifications";
import { Feuille } from "@/components/projet/Feuille";
import { IconeChevron, IconePlus, IconePoints } from "@/components/projet/icones";
import { FeuilleCapture } from "@/components/navigation/FeuilleCapture";
import {
  IconeAccueil,
  IconeDossier,
  IconeDocument,
  IconeFacture,
  IconeBilan,
  IconeCalendrier,
  IconeNote,
  IconeParametres,
} from "@/components/ui/Icones";

// ============================================================
// La navigation de l'application (26/09 — « moins mais mieux », lot A).
//
// Avant : sur téléphone, un bouton menu en haut à droite ouvrait dix
// entrées de même poids. Navigation cachée, trop riche, hors de portée du
// pouce — le pire cas pour un artisan qui tient son téléphone d'une main,
// au soleil, avec des gants (recherche-douleurs-artisans.md).
//
// Maintenant, sur téléphone, une barre fixe en bas de l'écran :
//   Aujourd'hui · Projets · [+] · Planning · Plus
// Le [+] ouvre la capture d'un nouveau projet ; c'est une action, pas une
// destination. Sur une fiche projet, il ajoute à ce projet (voir
// VueProjet.tsx, qui intercepte l'évènement « compyo:capture »).
// « Plus » ouvre une feuille avec le reste : Devis, Factures, Notes,
// Bilan, Paramètres, puis, à part, les idées et retours.
//
// Sur ordinateur, la même structure dans la barre latérale : les
// destinations en haut, le reste en plus petit sous un séparateur.
// Équipe vit dans Paramètres (onglet « Mon équipe »), la carte mentale
// dans « Idées et retours » : ni l'une ni l'autre ne sert au quotidien.
//
// Plafond : quatre destinations plus la capture. Pas une de plus.
// ============================================================

// Audit sécurité (05/09) — le service worker (voir public/sw.js) a mis en
// cache, jusqu'ici, le HTML rendu de /dashboard/* (Server Components avec
// de vraies données d'organisation : noms clients, montants de devis...)
// sans jamais le purger à la déconnexion. La logique du service worker est
// corrigée à la source (ces pages ne sont plus jamais écrites en cache),
// mais un artisan qui se déconnecte AVANT que le nouveau service worker
// n'ait pris le relais aurait encore l'ancien cache sur son appareil —
// purge immédiate ici, en plus, pour ne pas dépendre uniquement du délai
// de mise à jour du service worker. Best-effort : l'API Cache peut être
// indisponible (navigateur privé, contexte non sécurisé) sans que ça doive
// jamais bloquer la déconnexion elle-même.
async function purgerCachePagesHorsLigne() {
  if (typeof caches === "undefined") return;
  try {
    const noms = await caches.keys();
    await Promise.all(
      noms.filter((nom) => nom.startsWith("compyo-") && nom.endsWith("-pages")).map((nom) => caches.delete(nom))
    );
  } catch {
    // Non bloquant — la déconnexion elle-même a déjà réussi à ce stade.
  }
}

const DESTINATIONS = [
  { href: "/dashboard", label: "Aujourd'hui", Icone: IconeAccueil },
  { href: "/dashboard/demandes", label: "Projets", Icone: IconeDossier },
  { href: "/dashboard/planning", label: "Planning", Icone: IconeCalendrier },
];

const SECONDAIRES = [
  { href: "/dashboard/devis", label: "Devis", Icone: IconeDocument },
  { href: "/dashboard/factures", label: "Factures", Icone: IconeFacture },
  { href: "/dashboard/notes", label: "Notes", Icone: IconeNote },
  { href: "/dashboard/bilan", label: "Bilan", Icone: IconeBilan },
  { href: "/dashboard/parametres", label: "Paramètres", Icone: IconeParametres },
];

function estActif(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Ouvre la feuille « Faire un retour » (components/dashboard/BoutonRetour.tsx). */
function ouvrirRetour() {
  window.dispatchEvent(new CustomEvent("compyo:ouvrir-retour"));
}

// Bloc "compte" en bas de la barre latérale (ordinateur) : identité,
// actions courantes en une rangée, liens du site vitrine tout en bas.
function BlocCompteSidebar({ nomArtisan, onDeconnexion }: { nomArtisan: string; onDeconnexion: () => void }) {
  return (
    <div className="px-4 py-5 border-t border-white/10 flex flex-col gap-3">
      <div className="flex items-center gap-2.5 px-2">
        <Avatar nom={nomArtisan || "?"} taille={30} />
        <p className="text-sm text-white/80 font-medium truncate">{nomArtisan}</p>
      </div>
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
      <div className="flex items-center gap-2.5 px-2 pt-2 border-t border-white/5 text-xs text-white/40">
        <Link href="/" className="hover:text-white/70 transition-colors">
          Site vitrine
        </Link>
        <span className="text-white/20" aria-hidden="true">
          ·
        </span>
        <Link href="/contact" className="hover:text-white/70 transition-colors">
          Contact
        </Link>
      </div>
    </div>
  );
}

export function Sidebar({ nomArtisan, nbEnRetard = 0 }: { nomArtisan: string; nbEnRetard?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [captureOuverte, setCaptureOuverte] = useState(false);
  const [plusOuvert, setPlusOuvert] = useState(false);

  // Une page peut prendre la capture à son compte (la fiche projet ajoute à
  // son projet) ; sinon, la feuille « Nouveau projet ». D'autres écrans
  // (états vides) ouvrent la même feuille par « compyo:ouvrir-capture ».
  function capturer() {
    const nonInterceptee = window.dispatchEvent(new CustomEvent("compyo:capture", { cancelable: true }));
    if (nonInterceptee) setCaptureOuverte(true);
  }
  useEffect(() => {
    const ouvrir = () => setCaptureOuverte(true);
    window.addEventListener("compyo:ouvrir-capture", ouvrir);
    return () => window.removeEventListener("compyo:ouvrir-capture", ouvrir);
  }, []);

  // Changer de page ferme les feuilles.
  useEffect(() => {
    setPlusOuvert(false);
    setCaptureOuverte(false);
  }, [pathname]);

  async function handleLogout() {
    // Sprint Robustesse (30/08) — confirmation avant déconnexion : un doigt
    // qui touche la mauvaise icône ne déconnecte pas l'artisan sans qu'il
    // l'ait voulu.
    if (!window.confirm("Se déconnecter de Compyo ?")) return;
    await supabase.auth.signOut();
    await purgerCachePagesHorsLigne();
    router.push("/login");
    router.refresh();
  }

  const plusActif = SECONDAIRES.some((l) => estActif(pathname, l.href));

  return (
    <>
      {/* Téléphone — en haut, le logo et les notifications, rien d'autre.
          pt safe-area : sous l'encoche en application installée. */}
      <div className="sm:hidden sticky top-0 z-30 flex items-center justify-between bg-anthracite text-white pl-4 pr-1 min-h-12 [padding-top:env(safe-area-inset-top)]">
        <span className="flex items-center gap-2">
          <CompyoMark variante="blanc" taille={22} />
          <span className="font-display font-semibold">Compyo</span>
        </span>
        <CentreNotifications vers="bas" />
      </div>

      {/* Téléphone — la barre du bas, sous le pouce. */}
      <nav
        data-barre-bas
        aria-label="Navigation principale"
        className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-surface/95 backdrop-blur-md [padding-bottom:env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-5 items-end">
          {DESTINATIONS.slice(0, 2).map((d) => (
            <li key={d.href}>
              <OngletBas
                href={d.href}
                label={d.label}
                actif={estActif(pathname, d.href)}
                icone={<d.Icone taille={22} />}
                pastille={d.href === "/dashboard" ? nbEnRetard : 0}
              />
            </li>
          ))}
          <li className="flex justify-center">
            <button
              type="button"
              onClick={capturer}
              aria-label="Nouveau projet"
              className="group flex min-h-[4rem] w-full flex-col items-center justify-end gap-1 pb-1.5 focus-visible:outline-none"
            >
              <span className="grid h-14 w-14 -mt-6 place-items-center rounded-full bg-signal text-white shadow-[0_10px_24px_-10px_rgb(var(--c-signal)/0.9)] ring-4 ring-surface transition-transform group-active:scale-95 group-focus-visible:ring-signal/40">
                <IconePlus className="h-7 w-7" />
              </span>
              <span className="text-[11px] font-medium text-ink/70">Nouveau</span>
            </button>
          </li>
          <li>
            <OngletBas
              href="/dashboard/planning"
              label="Planning"
              actif={estActif(pathname, "/dashboard/planning")}
              icone={<IconeCalendrier taille={22} />}
            />
          </li>
          <li>
            <button
              type="button"
              onClick={() => setPlusOuvert(true)}
              aria-haspopup="dialog"
              className={`relative flex min-h-[4rem] w-full flex-col items-center justify-center gap-1 pt-1.5 pb-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal/50 ${
                plusActif ? "text-ink font-semibold" : "text-ink/55"
              }`}
            >
              {plusActif && <span aria-hidden className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-ink" />}
              <IconePoints className="h-[22px] w-[22px]" />
              <span className="text-[11px]">Plus</span>
            </button>
          </li>
        </ul>
      </nav>

      <Feuille ouverte={plusOuvert} titre="Plus" surFermer={() => setPlusOuvert(false)}>
        <ul className="flex flex-col">
          {SECONDAIRES.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setPlusOuvert(false)}
                aria-current={estActif(pathname, l.href) ? "page" : undefined}
                className="flex min-h-14 items-center gap-3.5 border-b border-ink/[0.06] text-[16px] text-ink"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink/[0.06] text-ink/70">
                  <l.Icone taille={19} />
                </span>
                <span className={`flex-1 ${estActif(pathname, l.href) ? "font-semibold" : ""}`}>{l.label}</span>
                <IconeChevron className="h-4 w-4 text-ink/30" />
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <p className="text-[12px] text-ink/45">Idées et retours</p>
          <div className="mt-1 flex flex-wrap gap-x-5">
            <button
              type="button"
              onClick={() => {
                setPlusOuvert(false);
                ouvrirRetour();
              }}
              className="min-h-12 text-[14px] text-ink/70 underline decoration-ink/20 underline-offset-4"
            >
              Donner mon avis
            </button>
            <Link
              href="/carte-mentale"
              onClick={() => setPlusOuvert(false)}
              className="flex min-h-12 items-center text-[14px] text-ink/70 underline decoration-ink/20 underline-offset-4"
            >
              Ce que disent les artisans
            </Link>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3">
          <div className="flex items-center gap-1 text-ink/60">
            <ThemeToggle className="w-12 h-12 grid place-items-center rounded-xl hover:bg-ink/5 transition-colors" />
            <BoutonInstallerDiscret compact className="w-12 h-12 grid place-items-center rounded-xl hover:bg-ink/5 transition-colors" />
          </div>
          <button type="button" onClick={handleLogout} className="min-h-12 px-2 text-[14px] text-ink/55 hover:text-ink">
            Se déconnecter
          </button>
        </div>
      </Feuille>

      <FeuilleCapture ouverte={captureOuverte} surFermer={() => setCaptureOuverte(false)} />

      {/* Ordinateur et tablette — la même structure, en barre latérale. */}
      <aside className="hidden sm:flex sm:w-60 sm:shrink-0 bg-anthracite text-white min-h-screen flex-col justify-between">
        <div>
          <div className="px-6 py-6 border-b border-white/10 flex items-center gap-2.5">
            <CompyoMark variante="blanc" taille={26} />
            <p className="font-display font-semibold">Compyo</p>
          </div>
          <div className="px-3 pt-4">
            <button
              type="button"
              onClick={capturer}
              className="flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-signal text-[15px] font-semibold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <IconePlus className="h-5 w-5" /> Nouveau projet
            </button>
          </div>
          <nav aria-label="Navigation principale" className="mt-3 flex flex-col gap-1 px-3">
            {DESTINATIONS.map((lien) => {
              const actif = estActif(pathname, lien.href);
              return (
                <Link
                  key={lien.href}
                  href={lien.href}
                  aria-current={actif ? "page" : undefined}
                  className={`relative flex items-center gap-2.5 px-3 py-3 text-[15px] rounded-xl transition-colors ${
                    actif ? "bg-white/10 text-white font-semibold" : "text-white/70 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {actif && <span aria-hidden className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-white" />}
                  <lien.Icone taille={18} />
                  <span className="flex-1">{lien.label}</span>
                  {lien.href === "/dashboard" && nbEnRetard > 0 && (
                    <span className="rounded-full bg-signal px-1.5 text-[11px] font-semibold text-white" aria-label={`${nbEnRetard} en retard`}>
                      {nbEnRetard}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <nav aria-label="Autres pages" className="mt-4 mx-3 border-t border-white/10 pt-3 flex flex-col">
            {SECONDAIRES.map((lien) => {
              const actif = estActif(pathname, lien.href);
              return (
                <Link
                  key={lien.href}
                  href={lien.href}
                  aria-current={actif ? "page" : undefined}
                  className={`flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors ${
                    actif ? "bg-white/10 text-white font-medium" : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <lien.Icone taille={15} />
                  {lien.label}
                </Link>
              );
            })}
            <Link
              href="/carte-mentale"
              className="mt-2 px-3 py-2 text-[12px] text-white/35 hover:text-white/70 transition-colors"
            >
              Idées et retours
            </Link>
          </nav>
        </div>

        <BlocCompteSidebar nomArtisan={nomArtisan} onDeconnexion={handleLogout} />
      </aside>
    </>
  );
}

function OngletBas({
  href,
  label,
  actif,
  icone,
  pastille = 0,
}: {
  href: string;
  label: string;
  actif: boolean;
  icone: React.ReactNode;
  pastille?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={actif ? "page" : undefined}
      className={`relative flex min-h-[4rem] flex-col items-center justify-center gap-1 pt-1.5 pb-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal/50 ${
        actif ? "text-ink font-semibold" : "text-ink/55"
      }`}
    >
      {/* L'onglet actif : un trait en plus de la couleur, jamais la couleur seule. */}
      {actif && <span aria-hidden className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-ink" />}
      <span className="relative">
        {icone}
        {pastille > 0 && (
          <span
            className="absolute -right-2.5 -top-1.5 min-w-[1.1rem] rounded-full bg-signal px-1 text-center text-[10.5px] font-semibold leading-[1.1rem] text-white"
            aria-label={`${pastille} en retard`}
          >
            {pastille}
          </span>
        )}
      </span>
      <span className="text-[11px]">{label}</span>
    </Link>
  );
}
