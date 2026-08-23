import { Reveal, SectionLabel } from "./LandingPage";

// ============================================================
// "Une journée avec Compyo" — section vedette demandée par Axel : moins
// une explication du fonctionnement (déjà traitée en détail sur
// /comment-ca-fonctionne) qu'une évocation sensible d'une vraie journée
// de travail, minute par minute. Volontairement très épuré : une seule
// idée par étape, beaucoup d'air, aucune statistique ni image — juste le
// texte, l'heure, et un emoji comme seul repère visuel. L'ambition est
// affichée par le développeur comme "digne d'Apple" : on s'y tient en
// gardant un conteneur étroit (max-w-2xl) et un rythme lent au défilement.
// ============================================================
const ETAPES = [
  {
    heure: "7h15",
    emoji: "☕",
    texte: "Vous ouvrez Compyo. Votre journée est déjà là, sans rien avoir préparé la veille.",
  },
  {
    heure: "8h30",
    emoji: "📞",
    texte: "Un client appelle pendant que vous êtes sur un chantier. Compyo prend le relais en arrière-plan.",
  },
  {
    heure: "11h40",
    emoji: "📸",
    texte: "Vous prenez 3 photos. Elles se rangent seules, au bon endroit, sans que vous y pensiez.",
  },
  {
    heure: "11h42",
    emoji: "🎤",
    texte: "Vous dictez une note vocale, entre deux tâches. Compyo l'écoute et la met en forme.",
  },
  {
    heure: "18h10",
    emoji: "📄",
    texte: "Votre devis est prêt. Vous n'avez rien tapé de la journée.",
  },
  {
    heure: "18h15",
    emoji: "📅",
    texte: "Votre semaine est déjà organisée. Il ne vous reste qu'à la vivre.",
  },
];

export function JourneeAvecCompyo() {
  return (
    <section className="bg-paper">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <div className="text-center mb-16 sm:mb-20">
          <Reveal>
            <SectionLabel>Une journée avec Compyo</SectionLabel>
            <h2 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight text-balance">
              Le produit, dans votre vraie journée.
            </h2>
            <p className="mt-5 text-base sm:text-lg text-ink/60 max-w-lg mx-auto leading-relaxed">
              Vous continuez à travailler. Compyo s&apos;occupe du reste, sans jamais vous le
              faire remarquer.
            </p>
          </Reveal>
        </div>

        <div className="relative">
          {/* Ligne verticale continue, dans l'esprit de celle utilisée sur
              /comment-ca-fonctionne, mais ici toujours à gauche (une seule
              colonne, pas d'alternance) : l'idée est de garder une lecture
              linéaire et intime, comme un fil du temps qu'on déroule. */}
          <div
            aria-hidden
            className="absolute left-[27px] top-2 bottom-2 w-px bg-ink/10"
          />

          <ol className="relative flex flex-col gap-3 sm:gap-4">
            {ETAPES.map((etape, i) => (
              <li key={etape.heure}>
                <Reveal delay={i * 90}>
                  <div className="group flex items-start gap-5 sm:gap-6 rounded-2xl p-3 -m-3 transition-transform duration-300 hover:translate-x-1.5">
                    {/* Pastille emoji */}
                    <div className="relative shrink-0 grid place-items-center w-14 h-14 rounded-full bg-surface border border-ink/10 text-2xl transition-colors duration-300 group-hover:border-signal/30">
                      <span aria-hidden>{etape.emoji}</span>
                    </div>

                    <div className="pt-2.5 sm:pt-3.5">
                      <span className="font-mono text-xl sm:text-2xl font-semibold tracking-tight text-ink">
                        {etape.heure}
                      </span>
                      <p className="mt-1.5 text-sm sm:text-base text-ink/65 leading-relaxed">
                        {etape.texte}
                      </p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
