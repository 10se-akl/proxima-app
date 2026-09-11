"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { detecterPlateforme } from "@/lib/pwa/plateforme";

// ============================================================
// "Premier contact sans friction" (26/08) — Porte B (ouvrir Compyo
// directement, sans passer par un partage). Un seul menu, une seule
// logique : le contenu s'adapte à la plateforme détectée plutôt que
// d'avoir trois écrans différents (voir lib/pwa/plateforme.ts).
//
// - Android : "Importer un message" disparaît — le parcours recommandé
//   est désormais WhatsApp/SMS/Mail → Partager → Compyo (Web Share
//   Target, voir app/manifest.ts + app/api/partage/route.ts), qui ne
//   passe jamais par cet écran.
// - iPhone/Desktop : "Importer un message" reste, car le partage natif
//   n'offre pas les mêmes possibilités sur ces plateformes (voir
//   onboarding-mobile-pwa-faisabilite.md).
// ============================================================

export function NouveauProjetMenu({ libelle = "+ Nouveau projet" }: { libelle?: string }) {
  const [ouvert, setOuvert] = useState(false);
  // Sprint Beta Final (27/08) — 🔴I : le menu apparaissait/disparaissait
  // d'un coup sec ({ouvert && (...)}), seul élément de l'app sans
  // transition alors que le reste (cartes PWA, boutons...) en a partout —
  // détail visible à chaque ouverture, plusieurs fois par jour pour un
  // artisan qui crée régulièrement des projets. "monte" garde l'élément
  // dans le DOM le temps de la sortie en fondu/translation avant de le
  // retirer, plutôt qu'un simple affichage conditionnel.
  const [monte, setMonte] = useState(false);
  // Visible pilote les classes de transition ; monté pilote la présence
  // dans le DOM. Décalés d'une frame à l'ouverture pour que le navigateur
  // parte bien de l'état "fermé" avant de transitionner vers "ouvert" —
  // sans ce décalage, l'élément apparaîtrait déjà dans son état final,
  // sans aucune animation visible.
  const [visible, setVisible] = useState(false);
  const [plateformeAndroid, setPlateformeAndroid] = useState(false);
  const conteneurRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPlateformeAndroid(detecterPlateforme() === "android");
  }, []);

  useEffect(() => {
    if (ouvert) {
      setMonte(true);
      const trame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(trame);
    }
    setVisible(false);
    const minuteur = setTimeout(() => setMonte(false), 150);
    return () => clearTimeout(minuteur);
  }, [ouvert]);

  useEffect(() => {
    if (!ouvert) return;
    function surClicExterieur(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", surClicExterieur);
    return () => document.removeEventListener("mousedown", surClicExterieur);
  }, [ouvert]);

  const items = [
    { href: "/dashboard/demandes/nouvelle", label: "Créer manuellement" },
    ...(!plateformeAndroid
      ? [{ href: "/dashboard/demandes/importer", label: "Importer un message" }]
      : []),
    { href: "/dashboard/demandes/importer-capture", label: "Importer une capture" },
    { href: "/dashboard/demandes/nouvelle?dictee=1", label: "Dictée vocale" },
  ];

  return (
    <div ref={conteneurRef} className="relative">
      <Button onClick={() => setOuvert((v) => !v)}>{libelle}</Button>
      {monte && (
        <div
          className={`absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-ink/10 bg-surface shadow-lg shadow-ink/10 transition-all duration-150 ease-out ${
            visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-1 scale-95"
          }`}
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOuvert(false)}
              className="block px-4 py-2.5 text-sm text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
