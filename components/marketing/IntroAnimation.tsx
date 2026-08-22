"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// ============================================================
// Animation d'entrée "premium" de la landing page — deuxième version,
// entièrement repensée sur demande d'Axel (référence : Apple / Linear /
// Raycast / Vercel / Stripe — pas de logo qui "pop" simplement).
//
// Choix technique important : demandé en Framer Motion, livré en CSS/SVG
// pur + un peu de JS pour la mesure de position (getBoundingClientRect).
// Raison : mon environnement de développement n'a pas accès au registre
// npm, donc je ne peux pas installer ni tester une nouvelle dépendance
// avant de la livrer — exactement ce qui avait fait échouer l'essai
// Three.js précédent (code jamais vérifiable avant que Axel ne le teste
// en local). Le CSS pur, lui, est garanti de fonctionner et reste
// largement suffisant pour tout ce qui est demandé ici (aucune 3D réelle
// n'est nécessaire, juste des transitions de transform/opacity/filter).
//
// Déroulé (chaque étape correspond à une valeur de `etat`) :
//   1. "noir"        — écran noir, silence visuel, ~350ms.
//   2. "construction" — le symbole (arc + cœur) se dessine, accompagné
//                        de quelques étincelles discrètes le long de
//                        l'arc et d'une lueur terracotta qui monte.
//   3. "respiration"  — le symbole "respire" une fois construit : léger
//                        pulse d'échelle + lueur qui s'intensifie, pour
//                        donner une impression de matière vivante.
//   4. "nom"          — le mot "Compyo" apparaît à côté, avec un léger
//                        glissement + flou-vers-net (pas un simple fondu).
//   5. "attente"      — courte tenue, le temps que l'œil lise l'ensemble.
//   6. "transition"   — le groupe (symbole + nom) se réduit et glisse
//                        jusqu'à sa place exacte dans l'en-tête (mesurée
//                        via getBoundingClientRect sur #ancre-logo-entete,
//                        voir Header dans LandingPage.tsx), pendant que
//                        le reste du site apparaît derrière (flou + fondu
//                        sur #compyo-site, voir globals.css). Aucune
//                        coupure : le symbole de l'overlay et celui du
//                        vrai en-tête se superposent exactement avant que
//                        l'overlay ne s'efface.
//   7. "invisible"    — overlay démonté, sessionStorage marqué comme vu.
//
// Jouée une seule fois par session, désactivée si prefers-reduced-motion.
// ============================================================

const CLE_SESSION = "compyo-intro-vue-v2";
const ID_CIBLE_ENTETE = "ancre-logo-entete";
const ID_SITE = "compyo-site";
const CLASSE_MASQUE = "intro-masque";

const TRACE_COEUR =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

// Sept points répartis sur l'arc (cercle centré (50,50), rayon 34, en
// évitant l'ouverture côté droit où se loge le cœur) — voir CompyoMark.tsx
// pour la géométrie d'origine. Purement décoratif : de petites étincelles
// qui s'allument brièvement pendant que l'arc se dessine.
const ETINCELLES = [
  { x: 61.6, y: 82.0 },
  { x: 38.4, y: 82.0 },
  { x: 20.6, y: 67.0 },
  { x: 16.5, y: 44.1 },
  { x: 28.1, y: 24.0 },
  { x: 50.0, y: 16.0 },
  { x: 71.9, y: 24.0 },
];

type Etat =
  | "invisible"
  | "noir"
  | "construction"
  | "respiration"
  | "nom"
  | "attente"
  | "transition";

// Durées en ms — regroupées ici pour être facilement ajustables sans
// devoir retrouver chaque setTimeout dans le code.
const DUREES = {
  noir: 350,
  construction: 850,
  respiration: 550,
  nom: 550,
  attente: 350,
  transition: 780,
  fonduFinal: 200,
};

export function IntroAnimation() {
  const [etat, setEtat] = useState<Etat>("invisible");
  const groupeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dejaVue = sessionStorage.getItem(CLE_SESSION) === "1";
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (dejaVue || reduit) {
      sessionStorage.setItem(CLE_SESSION, "1");
      return;
    }

    // Cache le site (flou + fondu, voir .intro-masque dans globals.css)
    // AVANT le premier rendu visible de l'overlay, pour éviter un
    // clignotement où le site apparaîtrait net une fraction de seconde.
    document.getElementById(ID_SITE)?.classList.add(CLASSE_MASQUE);
    setEtat("noir");

    // Chaîne de minuteurs plutôt qu'un seul : chaque étape est planifiée
    // depuis t=0, pas les unes après les autres, pour que le nettoyage
    // (React 18 Strict Mode exécute cet effet deux fois en développement :
    // montage → nettoyage → montage) annule proprement TOUS les minuteurs
    // du premier passage sans jamais écrire dans sessionStorage entre
    // temps — la même classe de bug que la version précédente de ce
        // composant avait révélée doit être évitée ici aussi : sessionStorage
    // n'est écrit qu'au tout dernier callback, celui qui marque
    // l'animation comme réellement terminée.
    const t: ReturnType<typeof setTimeout>[] = [];
    let tCumul = DUREES.noir;

    t.push(setTimeout(() => setEtat("construction"), tCumul));
    tCumul += DUREES.construction;

    t.push(setTimeout(() => setEtat("respiration"), tCumul));
    tCumul += DUREES.respiration;

    t.push(setTimeout(() => setEtat("nom"), tCumul));
    tCumul += DUREES.nom;

    t.push(setTimeout(() => setEtat("attente"), tCumul));
    tCumul += DUREES.attente;

    t.push(setTimeout(() => setEtat("transition"), tCumul));
    tCumul += DUREES.transition;

    t.push(
      setTimeout(() => {
        setEtat("invisible");
        sessionStorage.setItem(CLE_SESSION, "1");
      }, tCumul + DUREES.fonduFinal)
    );

    return () => {
      t.forEach(clearTimeout);
      // Si le composant est démonté avant la fin (navigation très rapide,
      // ou le double-passage de Strict Mode), on s'assure que le site
      // n'est jamais laissé flouté indéfiniment.
      document.getElementById(ID_SITE)?.classList.remove(CLASSE_MASQUE);
    };
  }, []);

  // Révèle le site DÈS le début de la transition — sans délai, dans un
  // effet layout classique : la classe qui le cachait est déjà peinte
  // depuis plusieurs secondes (toutes les étapes précédentes), donc
  // retirer la classe ici anime bien depuis cet état déjà visible vers
  // l'état révélé, sans problème de "premier rendu".
  useLayoutEffect(() => {
    if (etat !== "transition") return;
    document.getElementById(ID_SITE)?.classList.remove(CLASSE_MASQUE);
  }, [etat]);

  // Mesure la position réelle du logo dans l'en-tête pour faire glisser le
  // groupe jusque là. Important : les variables --intro-dx/--intro-dy/
  // --intro-echelle n'existent pas encore sur cet élément avant ce point,
  // donc si on les posait dans le MÊME rendu que celui qui ajoute la
  // classe .intro-groupe-2--transition, le navigateur ne peindrait jamais
  // l'état "translate(0,0) scale(1)" intermédiaire — la transition CSS
  // n'aurait alors aucun point de départ à interpoler et le logo
  // sauterait instantanément à sa position finale au lieu de glisser.
  // On laisse donc un premier rendu se peindre avec les valeurs par
  // défaut (0, 0, 1 — via `var(--intro-dx, 0)` etc. dans le CSS, qui
  // correspond de toute façon à la position actuelle du groupe, donc
  // invisible), puis on ne pose les valeurs réelles qu'au requestAnimationFrame
  // suivant, une fois ce premier état garanti peint.
  useEffect(() => {
    if (etat !== "transition") return;

    const idRaf = requestAnimationFrame(() => {
      const groupe = groupeRef.current;
      const cible = document.getElementById(ID_CIBLE_ENTETE);
      if (!groupe || !cible) return;

      const rectGroupe = groupe.getBoundingClientRect();
      const rectCible = cible.getBoundingClientRect();
      if (rectGroupe.width === 0 || rectCible.width === 0) return;

      const echelle = rectCible.width / rectGroupe.width;
      const dx = rectCible.left + rectCible.width / 2 - (rectGroupe.left + rectGroupe.width / 2);
      const dy = rectCible.top + rectCible.height / 2 - (rectGroupe.top + rectGroupe.height / 2);

      groupe.style.setProperty("--intro-dx", `${dx}px`);
      groupe.style.setProperty("--intro-dy", `${dy}px`);
      groupe.style.setProperty("--intro-echelle", `${echelle}`);
    });

    return () => cancelAnimationFrame(idRaf);
  }, [etat]);

  if (etat === "invisible") return null;

  const construit = etat !== "noir";
  const respire = etat === "respiration" || etat === "nom" || etat === "attente" || etat === "transition";
  const nomVisible = etat === "nom" || etat === "attente" || etat === "transition";
  const enTransition = etat === "transition";

  return (
    <div aria-hidden className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
      {/* Couche de fond séparée du groupe logo : elle doit s'effacer DÈS
          le début de la transition (pour révéler le site derrière), alors
          que le groupe logo, lui, doit rester parfaitement net pendant
          tout son trajet et ne s'effacer qu'une fois arrivé pile sur le
          vrai logo de l'en-tête — sinon le site resterait cadré derrière
          un fond encore opaque pendant que le logo se déplace, contraire
          à l'effet demandé ("la landing page apparaît progressivement
          derrière lui"). */}
      <div className={`absolute inset-0 bg-[#0b0a09] intro-fond-2 ${enTransition ? "intro-fond-2--sortie" : ""}`}>
        <div className="intro-vignette-2" />
        <div
          className={`intro-halo-2 ${construit ? "intro-halo-2--visible" : ""} ${respire ? "intro-halo-2--respire" : ""}`}
        />
      </div>

      <div
        ref={groupeRef}
        className={`relative flex items-center gap-3.5 intro-groupe-2 ${enTransition ? "intro-groupe-2--transition" : ""}`}
      >
        <svg
          viewBox="0 0 100 100"
          width={108}
          height={108}
          role="presentation"
          className={`relative ${respire ? "intro-symbole-2--respire" : ""}`}
        >
          {ETINCELLES.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={1.4}
              fill="#E8A487"
              className={construit ? "intro-etincelle-2" : ""}
              style={{ animationDelay: `${120 + i * 70}ms` }}
              opacity={0}
            />
          ))}
          <path
            d="M 74.04 74.04 A 34 34 0 1 1 74.04 25.96"
            fill="none"
            stroke="#C96B4A"
            strokeWidth={16}
            strokeLinecap="round"
            pathLength={100}
            className={construit ? "intro-arc-2" : ""}
            style={{ strokeDasharray: 100, strokeDashoffset: construit ? undefined : 100 }}
          />
          <g
            transform="translate(71.6,35.39) scale(1.2)"
            className={construit ? "intro-coeur-2" : ""}
            style={{ opacity: construit ? undefined : 0 }}
          >
            <path d={TRACE_COEUR} fill="#E8C5B6" />
          </g>
        </svg>

        <p
          className={`relative font-display font-semibold text-4xl tracking-tight text-white ${
            nomVisible ? "intro-nom-2" : ""
          }`}
          style={{ opacity: nomVisible ? undefined : 0 }}
        >
          Compyo
        </p>
      </div>
    </div>
  );
}
