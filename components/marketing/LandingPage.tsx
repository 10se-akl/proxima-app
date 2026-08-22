"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CompyoMark } from "./CompyoMark";
import { IntroAnimation } from "./IntroAnimation";
import { ThemeToggle } from "@/components/ThemeToggle";

// ============================================================
// Refonte complète de l'architecture du site (demande d'Axel) : fini la
// longue page unique qui expliquait tout. L'accueil est maintenant
// volontairement très court — juste de quoi donner envie d'explorer —
// et chaque sujet vit sur sa propre page dédiée :
//   /fonctionnalites        (détail des 4 fonctionnalités + sécurité)
//   /comment-ca-fonctionne  (timeline complète du parcours d'un chantier)
//   /pourquoi-compyo        (philosophie : on ne remplace pas l'artisan)
//   /beta                   (pourquoi une bêta privée, comment la rejoindre)
//   /a-propos               (présentation honnête du projet)
//   /contact                (email + FAQ)
// Toutes réutilisent Header/Footer/Reveal/SectionLabel exportés d'ici.
// ============================================================

export function LandingPage() {
  return (
    <div>
      <IntroAnimation />
      {/* id="compyo-site" : tout le reste du site, dans un conteneur unique
          que IntroAnimation.tsx peut cacher (flou + fondu) pendant qu'elle
          joue, puis révéler progressivement pendant sa phase de transition
          finale — sans jamais toucher directement au JSX ci-dessous. Voir
          la classe .intro-masque dans globals.css : elle n'est ajoutée que
          par JavaScript, et seulement si l'animation va réellement jouer,
          donc sans elle (JS désactivé, ou animation déjà vue) le site
          reste visible immédiatement, par défaut. */}
      <div id="compyo-site">
        <Header />
        <Hero />
        <CartesApercu />
        <Footer />
      </div>
    </div>
  );
}

// ============================================================
// Révélation discrète au défilement — CSS pur (voir globals.css), pas de
// dépendance externe. Chaque section entre dans le viewport une seule
// fois, avec un léger fondu + glissement. Respecte prefers-reduced-motion
// nativement (la classe .reveal n'a d'effet que si l'utilisateur n'a pas
// demandé de réduire les animations, voir globals.css).
// ============================================================
function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const noeud = ref.current;
    if (!noeud) return;
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
// En-tête — refonte "site à plusieurs pages" : 7 pages dans la nav
// (Accueil, Fonctionnalités, Comment ça fonctionne, Pourquoi Compyo,
// Bêta, À propos, Contact) plutôt que des ancres vers des sections d'une
// page unique. Tous les liens sont en chemin absolu (/xxx), ce Header
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
const LIENS_NAV = [
  { href: "/", label: "Accueil" },
  { href: "/fonctionnalites", label: "Fonctionnalités" },
  { href: "/comment-ca-fonctionne", label: "Comment ça fonctionne" },
  { href: "/pourquoi-compyo", label: "Pourquoi Compyo" },
  { href: "/beta", label: "Bêta" },
  { href: "/a-propos", label: "À propos" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-md border-b border-ink/10">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        {/* id ciblé par IntroAnimation.tsx : au terme de l'animation d'entrée,
            le logo de l'overlay se réduit et se déplace exactement jusqu'à
            cet endroit (mesuré via getBoundingClientRect), pour donner
            l'impression qu'il "devient" ce logo-ci plutôt que de simplement
            disparaître pendant qu'un autre apparaît. */}
        <Link id="ancre-logo-entete" href="/" className="flex items-center gap-2.5 shrink-0">
          <CompyoMark taille={30} />
          <span className="font-display font-semibold tracking-tight">Compyo</span>
        </Link>

        <nav className="hidden xl:flex items-center gap-6">
          {LIENS_NAV.map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              className="text-[13px] font-medium text-ink/70 hover:text-ink transition-colors whitespace-nowrap"
            >
              {lien.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle className="hidden sm:inline-block text-base leading-none hover:scale-110 transition-transform" />
          <Link href="/login" className="hidden xl:block text-sm text-ink/70 hover:text-ink whitespace-nowrap">
            Connexion
          </Link>
          <Link
            href="/demander-acces"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-ink text-paper text-sm font-medium px-4 py-2 hover:bg-signal hover:scale-[1.04] active:scale-[0.96] transition-all whitespace-nowrap"
          >
            Rejoindre la bêta
          </Link>

          {/* Bouton hamburger — visible seulement en dessous de xl, là où
              la nav complète est cachée. */}
          <button
            type="button"
            onClick={() => setMenuOuvert((v) => !v)}
            aria-expanded={menuOuvert}
            aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
            className="xl:hidden grid place-items-center w-9 h-9 rounded-full border border-ink/15 text-ink hover:border-ink/30 transition-colors shrink-0"
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
          opacity) pour ne jamais intercepter de clics quand il est fermé. */}
      {menuOuvert && (
        <div className="xl:hidden border-t border-ink/10 bg-paper">
          <nav className="max-w-6xl mx-auto px-5 sm:px-8 py-4 flex flex-col gap-1">
            {LIENS_NAV.map((lien) => (
              <Link
                key={lien.href}
                href={lien.href}
                onClick={() => setMenuOuvert(false)}
                className="py-2.5 text-sm font-medium text-ink/80 hover:text-ink transition-colors"
              >
                {lien.label}
              </Link>
            ))}
            <div className="mt-2 pt-3 border-t border-ink/10 flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setMenuOuvert(false)}
                className="py-1 text-sm text-ink/70 hover:text-ink"
              >
                Connexion
              </Link>
              <Link
                href="/demander-acces"
                onClick={() => setMenuOuvert(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-ink text-paper text-sm font-medium px-4 py-2.5 hover:bg-signal transition-colors"
              >
                Rejoindre la bêta privée
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

// ============================================================
// Hero — extrêmement épuré, à la demande d'Axel : l'accueil ne doit
// "PAS tout expliquer", juste donner envie d'explorer le reste du site.
// Pas de maquette produit ici (elle a sa place sur /fonctionnalites, qui,
// elle, doit vraiment convaincre) — juste le titre, un court paragraphe,
// deux boutons. Beaucoup de vide, centré, comme les sites de référence
// cités (Linear, Raycast, Stripe).
// ============================================================
function Hero() {
  return (
    <section className="relative overflow-hidden bg-paper">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] rounded-full bg-signal/[0.07] blur-3xl"
      />

      <div className="relative max-w-2xl mx-auto px-5 sm:px-8 pt-28 pb-24 sm:pt-36 sm:pb-32 text-center">
        <Reveal>
          <SectionLabel>Le copilote administratif des artisans</SectionLabel>
          <h1 className="font-display text-[2.5rem] leading-[1.08] sm:text-6xl sm:leading-[1.05] font-semibold tracking-tight text-balance">
            Passez plus de temps
            <br />
            sur vos chantiers.
            <br />
            <span className="text-signal">Compyo s&apos;occupe du reste.</span>
          </h1>
          <p className="mt-6 text-lg text-ink/70 max-w-md mx-auto leading-relaxed">
            L&apos;assistant conçu pour les artisans du bâtiment : vos clients, vos chantiers et
            vos devis, réunis au même endroit.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/fonctionnalites"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 text-ink font-medium px-7 py-3.5 hover:border-ink/30 hover:bg-surface hover:scale-[1.03] active:scale-[0.97] transition-all"
            >
              Découvrir Compyo
            </Link>
            <Link
              href="/demander-acces"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-signal text-white font-medium px-7 py-3.5 hover:bg-signal-fonce hover:scale-[1.03] active:scale-[0.97] transition-all shadow-sm shadow-signal/20"
            >
              Demander un accès
            </Link>
          </div>

          <p className="mt-6 text-xs text-ink/40 font-mono tracking-wide">
            Bêta privée — sur candidature, réponse sous 48h.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ============================================================
// Les 4 grandes cartes de l'accueil — un aperçu, jamais une explication.
// Chacune ouvre la page /fonctionnalites, directement sur la bonne
// section (ancre déjà en place, voir app/fonctionnalites/page.tsx).
// Volontairement peu de texte par carte : le rôle de l'accueil s'arrête
// ici, le détail vit ailleurs.
// ============================================================
function CartesApercu() {
  const cartes = [
    {
      ancre: "import",
      titre: "Organisation",
      texte: "Clients, chantiers, photos, messages — tout au même endroit, sans ressaisie.",
    },
    {
      ancre: "planning",
      titre: "Planning",
      texte: "Rendez-vous et tâches réunis, sans double réservation possible.",
    },
    {
      ancre: "devis",
      titre: "Devis",
      texte: "L'IA propose, un moteur de calcul fixe les prix — vous validez toujours.",
    },
    {
      ancre: "notes-vocales",
      titre: "Assistant IA",
      texte: "Dictez sur la route, Compyo transcrit, range, et résume votre journée.",
    },
  ];

  return (
    <section className="bg-surface border-y border-ink/10">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <div className="grid sm:grid-cols-2 gap-5">
          {cartes.map((carte, i) => (
            <Reveal key={carte.ancre} delay={i * 70}>
              <Link
                href={`/fonctionnalites#${carte.ancre}`}
                className="group h-full flex flex-col rounded-2xl border border-ink/10 bg-paper p-8 sm:p-10 transition-all duration-300 hover:-translate-y-1 hover:border-signal/30 hover:shadow-lg hover:shadow-ink/[0.06]"
              >
                <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight">
                  {carte.titre}
                </h2>
                <p className="mt-3 text-sm text-ink/60 leading-relaxed flex-1">{carte.texte}</p>
                <span className="mt-6 text-xs font-medium text-signal opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
                  En savoir plus →
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <CompyoMark variante="blanc" taille={26} />
            <span className="text-sm text-white/70">Compyo — bêta privée</span>
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
            <Link href="/beta" className="hover:text-white transition-colors">
              Bêta
            </Link>
            <Link href="/a-propos" className="hover:text-white transition-colors">
              À propos
            </Link>
            <Link href="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
          </nav>
        </div>

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
