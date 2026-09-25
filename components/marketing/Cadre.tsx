"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { CompyoMark } from "./CompyoMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FICHES_REDIGEES } from "@/lib/metiersPages";

// ============================================================
// Le cadre commun des pages du site vitrine (24/09) : l'en-tête, le pied
// de page, et la révélation au défilement.
//
// Ces trois morceaux vivaient dans LandingPage.tsx, avec toute l'ancienne
// page d'accueil (animation d'intro, démo interactive, cartes…). Chaque
// page du site qui importait l'en-tête embarquait donc aussi ce code, qui
// n'était plus affiché nulle part. Ils ont désormais leur propre fichier.
// ============================================================

// ============================================================
// Révélation discrète au défilement — CSS pur (voir globals.css), pas de
// dépendance externe. Chaque section entre dans le viewport une seule
// fois, avec un léger fondu + glissement. Respecte prefers-reduced-motion
// nativement (la classe .reveal n'a d'effet que si l'utilisateur n'a pas
// demandé de réduire les animations, voir globals.css).
// ============================================================
// useLayoutEffect n'existe pas côté serveur (React le signale) : même
// effet, sans l'avertissement.
const useEffetAvantAffichage = typeof window === "undefined" ? useEffect : useLayoutEffect;

// 25/09 — Le contenu n'est plus caché avant le JavaScript. Avant, `.reveal`
// mettait tout à opacity 0 dès le HTML : sur une 4G moyenne, le titre de
// chaque page intérieure attendait le chargement des scripts pour
// apparaître (mesuré : l'« élément le plus grand » vu par Google était le
// logo de l'en-tête, pas le titre), et un script en échec laissait la page
// blanche. Maintenant le masque ne s'applique qu'une fois la page prête
// (classe `reveal-pret` sur <html>, voir globals.css), et ce qui est déjà
// à l'écran à ce moment-là est marqué visible avant le premier affichage :
// rien ne clignote, seul ce qui est plus bas apparaît en glissant.
function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffetAvantAffichage(() => {
    const noeud = ref.current;
    if (!noeud) return;
    document.documentElement.classList.add("reveal-pret");
    const r = noeud.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      setVisible(true);
      return;
    }
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          setVisible(true);
          observateur.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observateur.observe(noeud);
    return () => observateur.disconnect();
  }, []);

  return { ref, className: `reveal ${visible ? "is-visible" : ""}` };
}

// Volontairement toujours un <div> plutôt qu'un composant polymorphe :
// plus simple à typer correctement en TypeScript strict, et un div en
// display inline-flex (voir Resultats plus bas) rend visuellement
// identique à un <span>.
export function Reveal({
  delay,
  className = "",
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const { ref, className: classeReveal } = useRevealOnScroll<HTMLDivElement>();
  // "delay" peut valoir 0 (premier élément d'une liste, i * décalage) —
  // un simple `delay && ...` le traiterait comme absent (0 est falsy en
  // JS) sans que ça change quoi que ce soit visuellement ici, mais autant
  // écrire la vérification correctement plutôt que de compter sur la
  // coïncidence que 0ms est de toute façon la valeur par défaut.
  const style = delay !== undefined ? { transitionDelay: `${delay}ms` } : undefined;
  return (
    <div ref={ref} className={`${classeReveal} ${className}`} style={style}>
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-3">
      {children}
    </p>
  );
}

// ============================================================
// En-tête — refonte "site à plusieurs pages" : 8 pages dans la nav
// (Accueil, Fonctionnalités, Comment ça fonctionne, Pourquoi Compyo,
// Carte mentale, Bêta, À propos, Contact) plutôt que des ancres vers des
// sections d'une page unique. Tous les liens sont en chemin absolu (/xxx), ce Header
// étant maintenant rendu sur toutes les pages du site, pas seulement
// l'accueil.
//
// 7 liens + logo + Connexion + CTA ne tiennent pas sur une largeur
// raisonnable avant le breakpoint xl (1280px) — plutôt que de les
// compresser illisiblement sur desktop moyen/tablette, la nav complète
// n'apparaît qu'à partir de xl, et un menu mobile (panneau déroulant,
// pur React state + CSS, aucune dépendance) prend le relais en dessous.
// L'ancien Header n'avait AUCUN menu mobile (nav simplement invisible
// sous md) — corrigé ici.
// ============================================================
// 24/09 — Refonte de l'accueil : sur ordinateur, cinq liens seulement
// (`principal`), le reste vit dans le menu mobile et le pied de page. Neuf
// liens côte à côte faisaient ressembler l'en-tête à un plan de site ;
// l'accueil, lui, demande du calme. Aucune page n'a disparu.
const LIENS_NAV = [
  { href: "/", label: "Accueil", principal: false },
  { href: "/fonctionnalites", label: "Fonctionnalités", principal: true },
  // 25/09 — la page pilier des métiers, plus une ancre de l'accueil.
  { href: "/metiers", label: "Métiers", principal: true },
  { href: "/comment-ca-fonctionne", label: "Comment ça fonctionne", principal: true },
  { href: "/pourquoi-compyo", label: "Pourquoi Compyo", principal: false },
  { href: "/carte-mentale", label: "Carte mentale", principal: false },
  { href: "/beta", label: "Bêta", principal: false },
  { href: "/a-propos", label: "À propos", principal: false },
  { href: "/questions-frequentes", label: "Questions fréquentes", principal: false },
  { href: "/contact", label: "Contact", principal: true },
  // 20/09 — Onglet à part entière, pas seulement un lien de pied de page :
  // installer l'app est une action que l'artisan doit pouvoir retrouver
  // quand IL le décide. La carte automatique, elle, ne se propose qu'une
  // fois par navigateur et disparaissait ensuite pour toujours.
  { href: "/installer", label: "Installer", principal: true },
];

export function Header({
  masquerToggleTheme = false,
  ctaTelephone = true,
}: {
  // 25/09 : l'accueil a sa propre barre d'inscription en bas de l'écran
  // sur téléphone, sous le pouce (vitrine/Rythme.tsx) — le bouton du haut
  // y ferait doublon.
  ctaTelephone?: boolean;
  // Audit sécurité/bugs (05/09) — 🟠 : LandingImmersive.tsx force son
  // propre thème sombre en permanence (voir .theme-sombre-fixe dans
  // globals.css), indépendamment du réglage clair/sombre global du
  // visiteur. Le ThemeToggle n'y a donc plus aucun effet visible — un
  // bouton qui semble ne rien faire est pire qu'un bouton absent. Ce prop
  // le masque uniquement pour cet appelant précis ; toutes les autres
  // pages (qui, elles, suivent bien le thème choisi) le gardent tel quel.
  masquerToggleTheme?: boolean;
} = {}) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  // Refonte navigation (Module 16) : le site vitrine et l'app forment un
  // seul produit, plus jamais de déconnexion forcée pour naviguer entre
  // les deux. On détecte simplement si une session existe pour afficher
  // "Dashboard" plutôt que "Connexion"/"Rejoindre la bêta" — null tant
  // qu'on ne sait pas encore, pour éviter un flash incorrect au premier
  // rendu (voir plus bas, connecte === null n'affiche ni l'un ni l'autre).
  const [connecte, setConnecte] = useState<boolean | null>(null);

  // Menu ouvert (téléphone et tablette) : la page derrière ne défile plus,
  // Échap le ferme.
  useEffect(() => {
    if (!menuOuvert) return;
    const ancien = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOuvert(false);
    };
    document.addEventListener("keydown", surTouche);
    return () => {
      document.documentElement.style.overflow = ancien;
      document.removeEventListener("keydown", surTouche);
    };
  }, [menuOuvert]);

  useEffect(() => {
    // 24/09 — Supabase n'est chargé que si un cookie de session existe.
    // Avant, chaque visiteur de la vitrine téléchargeait le client Supabase
    // (≈ 65 Ko compressés) rien que pour choisir entre « Connexion » et
    // « Dashboard ». Un visiteur anonyme — presque tous — n'a pas ce
    // cookie : la réponse est connue tout de suite, sans rien télécharger.
    // Même repère que la mesure d'audience (app/api/visite/route.ts).
    const cookieSession = document.cookie
      .split("; ")
      .some((c) => c.startsWith("sb-") && c.includes("-auth-token"));
    if (!cookieSession) {
      setConnecte(false);
      return;
    }
    let annule = false;
    import("@/lib/supabase/client").then(({ createClient }) =>
      createClient()
        .auth.getUser()
        .then(({ data }) => {
          if (!annule) setConnecte(Boolean(data.user));
        })
    );
    return () => {
      annule = true;
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-md border-b border-ink/10">
      {/* Conteneur volontairement plus large (7xl) que le contenu des pages
          (6xl) : avec 8 liens de nav + logo + Connexion + CTA, l'ensemble
          dépassait la largeur 6xl au breakpoint xl. Un flex en overflow n'a
          plus d'espace à répartir, et justify-between collait alors le logo
          au premier lien ("CompyoAccueil") et "Contact" à "Connexion"
          (constaté en prod le 12/09). */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-6">
        {/* id ciblé par IntroAnimation.tsx : au terme de l'animation d'entrée,
            le logo de l'overlay se réduit et se déplace exactement jusqu'à
            cet endroit (mesuré via getBoundingClientRect), pour donner
            l'impression qu'il "devient" ce logo-ci plutôt que de simplement
            disparaître pendant qu'un autre apparaît. */}
        <Link id="ancre-logo-entete" href="/" className="flex items-center gap-2.5 shrink-0">
          <CompyoMark taille={30} />
          <span className="font-display font-semibold tracking-tight">Compyo</span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden lg:flex items-center gap-7">
          {LIENS_NAV.filter((lien) => lien.principal).map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              className="text-[13.5px] font-medium text-ink/65 hover:text-ink transition-colors whitespace-nowrap"
            >
              {lien.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {!masquerToggleTheme && (
            <ThemeToggle className="hidden sm:inline-block text-base leading-none hover:scale-110 transition-transform" />
          )}
          {connecte ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full bg-ink text-paper text-[13px] sm:text-sm font-medium px-3.5 py-1.5 sm:px-4 sm:py-2 hover:bg-signal hover:scale-[1.04] active:scale-[0.96] transition-all whitespace-nowrap"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden lg:block text-sm text-ink/70 hover:text-ink whitespace-nowrap">
                Connexion
              </Link>
              <Link
                href="/demander-acces"
                className={`inline-flex items-center gap-1.5 rounded-full bg-ink text-paper text-[13px] sm:text-sm font-medium px-3.5 py-1.5 sm:px-4 sm:py-2 hover:bg-signal hover:scale-[1.04] active:scale-[0.96] transition-all whitespace-nowrap ${
                  ctaTelephone ? "" : "max-md:hidden"
                }`}
              >
                Rejoindre<span className="hidden sm:inline"> la bêta</span>
              </Link>
            </>
          )}

          {/* Bouton hamburger — visible seulement en dessous de xl, là où
              la nav complète est cachée. */}
          <button
            type="button"
            onClick={() => setMenuOuvert((v) => !v)}
            aria-expanded={menuOuvert}
            aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
            className="lg:hidden grid place-items-center w-9 h-9 rounded-full border border-ink/15 text-ink hover:border-ink/30 transition-colors shrink-0"
          >
            <span className="relative w-4 h-3 block">
              <span
                className={`absolute left-0 top-0 w-4 h-px bg-ink transition-transform duration-200 ${menuOuvert ? "translate-y-[5px] rotate-45" : ""}`}
              />
              <span
                className={`absolute left-0 bottom-0 w-4 h-px bg-ink transition-transform duration-200 ${menuOuvert ? "-translate-y-[5px] -rotate-45" : ""}`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Panneau mobile : rendu conditionnellement (pas juste caché en
          opacity) pour ne jamais intercepter de clics quand il est fermé.
          25/09 — plein écran sous l'en-tête, comme le menu d'une
          application : de grands liens, faciles à toucher, qui arrivent
          l'un après l'autre ; la page derrière ne défile plus, Échap
          ferme. Il occupe tout l'écran restant (100dvh) et défile seul si
          l'écran est court. */}
      {menuOuvert && (
        <div className="menu-mobile lg:hidden absolute inset-x-0 top-full h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-ink/10 bg-paper">
          <nav aria-label="Menu" className="max-w-6xl mx-auto min-h-full px-5 sm:px-8 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex flex-col">
            <ul>
              {LIENS_NAV.map((lien, i) => (
                <li
                  key={lien.href}
                  className="menu-mobile-lien border-b border-ink/[0.07]"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <Link
                    href={lien.href}
                    onClick={() => setMenuOuvert(false)}
                    className="flex items-center justify-between gap-4 py-3 font-display text-[1.35rem] font-semibold tracking-[-0.02em] text-ink transition-colors active:text-signal"
                  >
                    {lien.label}
                    <span aria-hidden className="text-base font-normal text-ink/25">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div
              className="menu-mobile-lien mt-auto pt-6 flex flex-col gap-2.5"
              style={{ "--i": LIENS_NAV.length } as React.CSSProperties}
            >
              {/* Repéré (10/09) : le bouton mode sombre/clair de la barre
                  (juste au-dessus) est en "hidden sm:inline-block" — invisible
                  sur un téléphone en portrait — et n'avait jamais été repris
                  ici, dans le panneau qui, lui, est justement fait pour le
                  mobile. Résultat : totalement injoignable sur téléphone,
                  seul moyen de le voir était un écran large. */}
              {!masquerToggleTheme && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-medium text-ink/70">Thème</span>
                  <ThemeToggle className="text-lg leading-none text-ink/70 hover:text-ink transition-colors" />
                </div>
              )}
              {connecte ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOuvert(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-ink text-paper text-[15px] font-semibold px-4 py-4 hover:bg-signal transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/demander-acces"
                    onClick={() => setMenuOuvert(false)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-signal text-white text-[15px] font-semibold px-4 py-4 shadow-[0_12px_30px_-12px_rgb(201_107_74/0.9)] transition-transform active:scale-[0.98]"
                  >
                    Rejoindre la bêta privée
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMenuOuvert(false)}
                    className="py-2 text-center text-[15px] font-medium text-ink/70 hover:text-ink"
                  >
                    Connexion
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

// ============================================================
// Pied de page — sobre, sans lien mort.
// ============================================================
export function Footer() {
  return (
    // Même raison qu'ailleurs sur le site : bg-anthracite fixe + texte
    // blanc fixe, pas ink/paper qui s'inverseraient avec le mode.
    <footer className="bg-anthracite">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center sm:items-start gap-1.5">
            <div className="flex items-center gap-2.5">
              <CompyoMark variante="blanc" taille={26} />
              <span className="text-sm font-medium text-white/85">Compyo</span>
            </div>
            <p className="text-xs text-white/45 max-w-[220px] text-center sm:text-left leading-relaxed">
              Le copilote administratif des artisans du bâtiment.
            </p>
          </div>
          {/* Second niveau de navigation : le site étant maintenant réparti
              sur plusieurs pages, le pied de page redonne un accès complet
              à toutes, pas seulement aux pages légales. */}
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/60">
            <Link href="/fonctionnalites" className="hover:text-white transition-colors">
              Fonctionnalités
            </Link>
            <Link href="/comment-ca-fonctionne" className="hover:text-white transition-colors">
              Comment ça fonctionne
            </Link>
            <Link href="/pourquoi-compyo" className="hover:text-white transition-colors">
              Pourquoi Compyo
            </Link>
            <Link href="/carte-mentale" className="hover:text-white transition-colors">
              Carte mentale
            </Link>
            <Link href="/comparatif" className="hover:text-white transition-colors">
              Comparatif
            </Link>
            <Link href="/confiance" className="hover:text-white transition-colors">
              Sécurité & transparence
            </Link>
            <Link href="/beta" className="hover:text-white transition-colors">
              Bêta
            </Link>
            <Link href="/a-propos" className="hover:text-white transition-colors">
              À propos
            </Link>
            <Link href="/questions-frequentes" className="hover:text-white transition-colors">
              Questions fréquentes
            </Link>
            <Link href="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
            {/* 20/09 — Seul point d'entrée permanent vers l'installation :
                la carte de InstallPWA.tsx ne se propose qu'une fois par
                navigateur, donc un artisan qui l'a fermée n'avait plus
                aucun moyen d'installer Compyo depuis le site. */}
            <Link href="/installer" className="hover:text-white transition-colors">
              Installer l&apos;application
            </Link>
          </nav>
        </div>

        {/* 25/09 — Une page par métier, accessible de partout : pour
            l'artisan qui cherche la sienne, et pour les moteurs qui ne
            trouvaient ces pages que par le sitemap. */}
        <nav aria-label="Compyo pour votre métier" className="pt-6 border-t border-white/10">
          <p className="text-center sm:text-left text-[11px] font-mono uppercase tracking-[0.18em] text-white/40">
            <Link href="/metiers" className="hover:text-white/80 transition-colors">
              Compyo pour votre métier
            </Link>
          </p>
          <ul className="mt-3 flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs text-white/55">
            {FICHES_REDIGEES.map((f) => (
              <li key={f.slug}>
                <Link href={`/metiers/${f.slug}`} className="hover:text-white transition-colors">
                  {f.nom}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/50">
            <Link href="/mentions-legales" className="hover:text-white/80 transition-colors">
              Mentions légales
            </Link>
            <Link href="/politique-de-confidentialite" className="hover:text-white/80 transition-colors">
              Confidentialité
            </Link>
            <Link href="/cgu" className="hover:text-white/80 transition-colors">
              CGU
            </Link>
          </nav>
          <a
            href="mailto:proxima.saas@gmail.com"
            className="font-mono text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            proxima.saas@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}
