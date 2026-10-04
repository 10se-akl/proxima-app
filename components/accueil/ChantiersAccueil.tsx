import Link from "next/link";
import type { ReactNode } from "react";
import { CLASSE_ETIQUETTE, Pastille, type CouleurPastille } from "@/components/ui/Pastille";
import { IconeDossier } from "@/components/ui/Icones";
import { IconeChevron, IconeLieu, IconeMessage, IconeTelephone } from "@/components/projet/icones";
import { numeroSms, numeroWhatsApp } from "@/lib/messagesClient";
import { CLASSE_CARTE_BLOC, TitreBloc } from "./Blocs";

// ============================================================
// « Mes projets » sur l'accueil (refonte visuelle 04/10, maquette d'Axel).
//
// Les chantiers en cours, les plus récemment touchés d'abord : la photo
// (on reconnaît un chantier avant de lire le nom), qui, quoi, où, l'étape
// en couleur, le prochain rendez-vous, et trois gestes à portée : appeler,
// écrire sur WhatsApp, y aller. Écrire ouvre seulement la conversation :
// aucun message ne part sans que l'artisan l'écrive et l'envoie lui-même.
// ============================================================

export type ChantierAccueil = {
  id: string;
  nom: string;
  quoi: string | null;
  lieu: string | null;
  etape: string;
  couleur: CouleurPastille;
  /** « Rendez-vous demain à 9h », ou rien. */
  info: string | null;
  telephone: string | null;
  adresse: string | null;
  /** URL signée de la première photo, valable une heure. */
  photo: string | null;
  urgent: boolean;
  /** Un chantier terminé, montré en retrait (page Projets). */
  estompe?: boolean;
};

const CIVILITES = new Set(["m", "m.", "mme", "mlle", "monsieur", "madame"]);

function initiales(nom: string): string {
  const mots = nom
    .trim()
    .split(/\s+/)
    .filter((m) => m && !CIVILITES.has(m.toLowerCase()));
  if (mots.length === 0) return "?";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink";

export function ChantiersAccueil({ chantiers, total }: { chantiers: ChantierAccueil[]; total: number }) {
  if (chantiers.length === 0) return null;
  return (
    <section aria-label="Mes projets" className={CLASSE_CARTE_BLOC}>
      <div className="flex items-center justify-between gap-3">
        <TitreBloc
          titre="Mes projets"
          nombre={total}
          icone={
            <Pastille couleur="signal" variante="doux" taille="petite">
              <IconeDossier taille={16} />
            </Pastille>
          }
        />
        <Link href="/dashboard/demandes" className={`inline-flex min-h-12 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-steel sm:hover:text-ink ${FOCUS}`}>
          Voir tous <IconeChevron className="h-4 w-4" />
        </Link>
      </div>
      <ul className="mt-1.5 flex flex-col gap-2">
        {chantiers.map((c) => (
          <LigneChantier key={c.id} c={c} />
        ))}
      </ul>
    </section>
  );
}

/** Une ligne de projet : l'accueil et la page Projets la partagent. */
export function LigneChantier({ c }: { c: ChantierAccueil }) {
  const whatsapp = c.telephone ? numeroWhatsApp(c.telephone) : null;
  const tel = c.telephone ? numeroSms(c.telephone) : "";
  const etiquette = (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${CLASSE_ETIQUETTE[c.couleur]}`}>{c.etape}</span>
      {c.urgent && (
        <span className="inline-flex rounded-full bg-signal/15 px-2.5 py-0.5 text-xs font-semibold text-signal-fonce dark:text-signal-clair">Urgent</span>
      )}
    </span>
  );

  return (
    <li className={`flex items-center gap-2 rounded-2xl bg-paper/70 p-2 ring-1 ring-ink/10 sm:gap-3 ${c.estompe ? "opacity-70" : ""}`}>
      <Link href={`/dashboard/demandes/${c.id}`} className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl ${FOCUS}`}>
        {c.photo ? (
          // Une miniature signée, déjà petite : pas besoin de next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.photo} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-xl object-cover sm:w-20" />
        ) : (
          <span
            aria-hidden
            className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-signal/25 to-violet/25 font-display text-lg font-semibold text-ink sm:w-20"
          >
            {initiales(c.nom)}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-ink">{c.nom}</span>
          {c.quoi && <span className="block truncate text-sm text-steel">{c.quoi}</span>}
          {c.lieu && <span className="block truncate text-sm font-medium text-ink/80">{c.lieu}</span>}
          <span className="mt-1 block md:hidden">{etiquette}</span>
        </span>
        <span className="hidden w-40 shrink-0 md:block">
          {etiquette}
          {c.info && <span className="mt-1 block text-sm leading-snug text-steel">{c.info}</span>}
        </span>
      </Link>
      {/* Largeur fixe à partir de la tablette : les colonnes restent
          alignées même quand un projet n'a ni numéro ni adresse. */}
      <span className="flex shrink-0 items-center justify-end gap-1.5 sm:w-[9.75rem]">
        {tel && (
          <BoutonRond href={`tel:${tel}`} libelle={`Appeler ${c.nom}`}>
            <IconeTelephone className="h-5 w-5" />
          </BoutonRond>
        )}
        {whatsapp && (
          <BoutonRond href={`https://wa.me/${whatsapp}`} libelle={`Écrire à ${c.nom} sur WhatsApp`} externe className="hidden sm:grid">
            <IconeMessage className="h-5 w-5" />
          </BoutonRond>
        )}
        {c.adresse && (
          <BoutonRond
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.adresse)}`}
            libelle={`Itinéraire vers le chantier de ${c.nom}`}
            externe
            className="hidden sm:grid"
          >
            <IconeLieu className="h-5 w-5" />
          </BoutonRond>
        )}
      </span>
    </li>
  );
}

function BoutonRond({
  href,
  libelle,
  externe = false,
  className = "grid",
  children,
}: {
  href: string;
  libelle: string;
  externe?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={libelle}
      title={libelle}
      {...(externe ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`${className} h-12 w-12 place-items-center rounded-full bg-ink/[0.06] text-ink active:bg-ink/15 sm:hover:bg-ink/10 motion-safe:transition-colors ${FOCUS}`}
    >
      {children}
    </a>
  );
}
