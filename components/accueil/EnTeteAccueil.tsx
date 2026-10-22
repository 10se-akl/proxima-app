// ============================================================
// L'en-tête de l'accueil. Atelier (22/10) : la date, « Bonjour Thomas. »
// et, au besoin, une phrase — posés sur le fond. La carte « Maintenant »
// vient juste dessous (VueAccueil.tsx).
// ============================================================

export function EnTeteAccueil({
  dateDuJour,
  titre,
  sousTitre,
}: {
  dateDuJour: string;
  titre: string;
  /** 08/10 — seulement quand il dit quelque chose (« Votre premier projet
   *  commence ici. »). */
  sousTitre?: string;
}) {
  // Atelier (22/10) : un compagnon qui parle, posé sur le fond — plus de
  // carte bleu nuit. « Maintenant » vient juste dessous (VueAccueil).
  const phrase = /[.!?]$/.test(titre) ? titre : `${titre}.`;
  return (
    <header>
      <p className="text-sm text-steel first-letter:uppercase">{dateDuJour}</p>
      <h1 className="mt-1 font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-ink sm:text-4xl">{phrase}</h1>
      {sousTitre && <p className="mt-1 text-base text-steel">{sousTitre}</p>}
    </header>
  );
}
