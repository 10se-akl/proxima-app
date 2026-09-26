import { CONTACT_HUMAIN, ENGAGEMENTS, ENGAGEMENTS_ACTIFS, lienContact } from "@/lib/confiance";
import { IconeDocument, IconeEuro, IconeMessage } from "@/components/projet/icones";

// ============================================================
// Trois lignes calmes (lot G) : pas de bandeau, pas de « garanties » en
// gros caractères. Le texte et le drapeau sont dans lib/confiance.ts.
// ============================================================

type Ton = "clair" | "sombre";

/** Derrière le drapeau ENGAGEMENTS_ACTIFS (désactivé par défaut). */
export function Engagements({ ton = "clair", className = "" }: { ton?: Ton; className?: string }) {
  if (!ENGAGEMENTS_ACTIFS) return null;
  return <ListeEngagements ton={ton} contact={CONTACT_HUMAIN} className={className} />;
}

/** L'affichage seul, sans le drapeau (vérifiable avec un contact simulé). */
export function ListeEngagements({ ton, contact, className = "" }: { ton: Ton; contact: string; className?: string }) {
  const texte = ton === "sombre" ? "text-white/75" : "text-ink/70";
  const icone = ton === "sombre" ? "text-white/45" : "text-steel";
  const lignes = [
    { cle: "prix", Icone: IconeEuro, texte: ENGAGEMENTS.prix },
    { cle: "donnees", Icone: IconeDocument, texte: ENGAGEMENTS.donnees },
  ];
  return (
    <ul className={`flex flex-col gap-2 text-left text-[14px] leading-snug ${texte} ${className}`}>
      {lignes.map(({ cle, Icone, texte: t }) => (
        <li key={cle} className="flex items-start gap-2.5">
          <Icone className={`mt-0.5 h-4 w-4 shrink-0 ${icone}`} />
          <span>{t}</span>
        </li>
      ))}
      {contact.trim() && (
        <li className="flex items-start gap-2.5">
          <IconeMessage className={`mt-0.5 h-4 w-4 shrink-0 ${icone}`} />
          <span>
            {ENGAGEMENTS.humain}{" "}
            <a
              href={lienContact(contact.trim())}
              className={`inline-flex min-h-0 font-medium underline underline-offset-4 ${
                ton === "sombre" ? "text-white decoration-white/40" : "text-ink decoration-ink/30"
              }`}
            >
              {contact.trim()}
            </a>
          </span>
        </li>
      )}
    </ul>
  );
}
