import { DessinMetier } from "@/components/marketing/illustrations/Outils";

// ============================================================
// Les quatre écrans du parcours, reconstruits en HTML/CSS (20/09).
//
// Pas de captures d'image : une capture pèse, se floute sur les écrans
// haute densité, vieillit au premier changement de l'app et ne se traduit
// pas en mode sombre. Reconstruits en balises, ces écrans utilisent les
// mêmes tokens que le produit — ils suivent donc le thème, restent nets à
// toutes les tailles, et pèsent quelques kilo-octets.
//
// Le contenu affiché est un exemple cohérent (un plombier, un chauffe-eau),
// jamais un client réel. Les montants correspondent à l'exemple plombier
// de components/marketing/metiers/exemplesMetiers.ts.
// ============================================================

// Cadre commun : un écran de téléphone, légèrement incliné dans l'espace.
// `perspective` + `rotate3d` en CSS pur coûtent zéro calcul continu, à la
// différence d'une vraie scène 3D — le public est sur des téléphones
// d'entrée de gamme.
export function CadreEcran({
  children,
  incline = "gauche",
  className = "",
}: {
  children: React.ReactNode;
  incline?: "gauche" | "droite" | "aucune";
  className?: string;
}) {
  const rotation =
    incline === "gauche"
      ? "rotate3d(1, 1, 0, 6deg)"
      : incline === "droite"
        ? "rotate3d(1, -1, 0, 6deg)"
        : "none";
  return (
    <div className={`[perspective:1400px] ${className}`}>
      <div
        style={{ transform: rotation }}
        className="rounded-[1.6rem] border border-ink/10 bg-surface p-3 shadow-[0_24px_60px_-28px_rgb(var(--c-ink)/0.45)] transition-transform duration-700 ease-out motion-safe:hover:[transform:none]"
      >
        <div className="overflow-hidden rounded-[1.1rem] bg-paper">{children}</div>
      </div>
    </div>
  );
}

function BarreTitre({ titre }: { titre: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-ink/10 px-4 py-3">
      <span className="h-2 w-2 rounded-full bg-signal/70" aria-hidden />
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-steel">{titre}</span>
    </div>
  );
}

// 1. Le message du client, partagé depuis la messagerie vers Compyo.
export function EcranMessage() {
  return (
    <>
      <BarreTitre titre="Message reçu" />
      <div className="space-y-3 p-4">
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-paper-warm px-3.5 py-2.5 text-[13px] leading-relaxed text-ink">
          Bonjour, mon chauffe-eau fuit depuis hier soir. Il doit avoir une quinzaine
          d&apos;années. Vous pourriez passer cette semaine ?
        </div>
        <p className="pl-1 font-mono text-[10px] text-steel">Mme Leroy · 18:47</p>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-signal/40 px-3 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-signal">Partager vers</span>
          <span className="text-[13px] font-semibold text-ink">Compyo</span>
        </div>
        <p className="text-[12px] leading-relaxed text-steel">
          Projet créé. Le client, l&apos;adresse et la demande sont rangés.
        </p>
      </div>
    </>
  );
}

// 2. La note dictée sur place, transcrite.
export function EcranNote() {
  return (
    <>
      <BarreTitre titre="Note vocale" />
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Le "niveau sonore" : des barres de hauteurs fixes, animées très
              lentement et seulement si le visiteur ne demande pas moins de
              mouvement (voir .onde-son dans globals.css). */}
          <span className="flex h-10 items-end gap-[3px]" aria-hidden>
            {[40, 70, 100, 55, 85, 35, 65, 90, 45, 75].map((h, i) => (
              <span
                key={i}
                className="onde-son w-[3px] rounded-full bg-signal/70"
                style={{ height: `${h}%`, animationDelay: `${i * 120}ms` }}
              />
            ))}
          </span>
          <span className="font-mono text-[10px] text-steel">0:38</span>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-ink">
          «&nbsp;Chauffe-eau 200 litres au garage, vertical. Groupe de sécurité à changer aussi.
          L&apos;ancien est à évacuer. Trois heures avec l&apos;évacuation.&nbsp;»
        </p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-steel">
          Transcrit · rangé dans le projet
        </p>
      </div>
    </>
  );
}

// 3. Le devis qui se remplit — les vrais chiffres de l'exemple plombier.
export function EcranDevis() {
  const lignes = [
    { d: "Chauffe-eau électrique vertical 200 L", q: "1 u", t: "690,00" },
    { d: "Groupe de sécurité et raccords", q: "1 u", t: "48,00" },
    { d: "Dépose et évacuation de l'ancien", q: "1 forfait", t: "90,00" },
    { d: "Main-d'œuvre", q: "3 h", t: "165,00" },
  ];
  return (
    <>
      <BarreTitre titre="Devis · brouillon" />
      <div className="p-4">
        <ul className="divide-y divide-ink/10">
          {lignes.map((l, i) => (
            <li
              key={l.d}
              className="ligne-devis flex items-baseline justify-between gap-3 py-2.5"
              style={{ animationDelay: `${300 + i * 160}ms` }}
            >
              <span className="min-w-0 text-[12.5px] leading-snug text-ink">{l.d}</span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-[9px] uppercase tracking-wider text-steel">{l.q}</span>
                <span className="block font-mono text-[12px] tabular-nums text-ink">{l.t}&nbsp;€</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-baseline justify-between border-t-2 border-ink/80 pt-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-steel">Total TTC</span>
          <span className="font-display text-xl font-semibold tabular-nums text-ink">1&nbsp;091,30&nbsp;€</span>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-steel">
          Chiffré avec vos tarifs. Chaque ligne se modifie.
        </p>
      </div>
    </>
  );
}

// 4. Le suivi : où en est le devis, sans avoir à relancer au hasard.
export function EcranSuivi() {
  const etapes = [
    { l: "Envoyé", d: "mardi 18:02", fait: true },
    { l: "Ouvert par le client", d: "mardi 18:44", fait: true },
    { l: "Signé en ligne", d: "mercredi 09:12", fait: true },
    { l: "Facture à envoyer", d: "à la fin du chantier", fait: false },
  ];
  return (
    <>
      <BarreTitre titre="Suivi du devis" />
      <div className="p-4">
        <ol className="relative space-y-4 pl-6">
          <span className="absolute left-[7px] top-2 h-[calc(100%-1rem)] w-px bg-ink/15" aria-hidden />
          {etapes.map((e) => (
            <li key={e.l} className="relative">
              <span
                aria-hidden
                className={`absolute -left-6 top-1 h-[15px] w-[15px] rounded-full border-2 ${
                  e.fait ? "border-signal bg-signal/20" : "border-ink/25 bg-paper"
                }`}
              />
              <p className={`text-[13px] leading-tight ${e.fait ? "text-ink" : "text-steel"}`}>{e.l}</p>
              <p className="font-mono text-[10px] text-steel">{e.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}

// Le dessin d'un métier, posé dans son cadre — utilisé par la section
// "votre métier" et par les pages /metiers/[slug].
export function CadreDessin({ id, titre, className = "" }: { id: string; titre: string; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 rounded-[1.6rem] bg-paper-warm" aria-hidden />
      <DessinMetier
        id={id}
        titre={titre}
        className="derive-lente relative h-full w-full p-8 text-ink/70"
      />
    </div>
  );
}
