import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrganisationId } from "@/lib/organisation";
import type { ReactNode } from "react";
import { aplatirClient, calculerArgent, JOURS_PAUSE_RELANCE, type LigneEnAttente } from "@/lib/argent";
import { CLASSE_FIN_TEXTE, FinRelancer } from "@/components/accueil/Blocs";
import { BlocDepliable } from "@/components/accueil/BlocDepliable";
import { LienAncre } from "@/components/accueil/LienAncre";
import { CLASSE_PAGE_ETROITE, EnTetePage } from "@/components/ui/EnTetePage";
import { BOUTON_TEXTE, CARTE_PLEINE, MONTANT, SECONDAIRE, euros } from "@/components/ui/recettes";

// ============================================================
// Argent (refonte 03/10 — duel B, lot 2).
//
// La question de la conjointe, le soir : « qu'est-ce qu'on nous doit, et
// qui faut-il relancer ? ». Avant, il fallait ouvrir Plus, Factures,
// Émises, puis Devis, sans total à côté des lignes. Ici, en une colonne :
//   1. le total à encaisser, le même chiffre que le Bilan ;
//   2. En attente du client : les mêmes lignes que l'accueil, mais toutes,
//      y compris celles qui n'appellent pas encore de relance ;
//   3. Devis à envoyer ;
//   4. À facturer (lot 4) : les chantiers terminés dont le devis accepté
//      n'est pas encore entièrement facturé, avec « Facturer » ;
//   5. en pied : Tous les devis · Toutes les factures · Bilan du mois.
// Aucune pastille : rien ici n'est urgent au point de clignoter.
// Design v3 (24/10) : le gros chiffre de l'accueil, et chaque ligne porte
// son montant à droite.
// Les lignes viennent de lib/argent.ts, la fonction que l'accueil appelle.
// ============================================================

export const dynamic = "force-dynamic";

const JOUR_MS = 86400000;

export default async function ArgentPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const organisationId = await getOrganisationId(supabase, user?.id ?? "");
  const maintenant = new Date();

  const [{ data: projets, error: e1 }, { data: devis, error: e2 }, { data: factures, error: e3 }, { data: messages }] =
    await Promise.all([
      supabase
        .from("demandes")
        .select("id, nom_client, statut, accepte_le, termine_le, artisan_id")
        .eq("organisation_id", organisationId),
      supabase
        .from("devis")
        .select("id, statut, numero, envoye_le, created_at, demande_id, artisan_id, total_estime, signe_le, demandes(nom_client)")
        .eq("organisation_id", organisationId),
      // Toutes les factures, pas seulement les émises : « À facturer »
      // déduit aussi les payées, les annulées et leurs avoirs (lib/argent.ts).
      supabase
        .from("factures")
        .select("id, numero, demande_id, statut, type, total_ttc, date_emission, date_echeance, artisan_id, demandes(nom_client)")
        .eq("organisation_id", organisationId),
      // Les relances préparées depuis une semaine : « relancé » sur la ligne.
      supabase
        .from("evenements_projet")
        .select("demande_id, created_at, metadata")
        .eq("organisation_id", organisationId)
        .eq("type", "message_prepare")
        .gte("created_at", new Date(maintenant.getTime() - JOURS_PAUSE_RELANCE * JOUR_MS).toISOString()),
    ]);

  // Un total faux est pire qu'une erreur : « 0 € à encaisser » parce que
  // la lecture a échoué ferait croire que tout est payé. app/dashboard/
  // error.tsx propose de réessayer.
  const erreur = e1 ?? e2 ?? e3;
  if (erreur) throw new Error(`Argent : lecture impossible (${erreur.message})`);

  const { enAttente, devisAEnvoyer, aEncaisser, aFacturer } = calculerArgent({
    projets: projets ?? [],
    devis: aplatirClient(devis),
    factures: aplatirClient(factures),
    messages: messages ?? [],
    avecAFacturer: true,
    maintenant,
  });

  const retard =
    aEncaisser.enRetard > 0 ? `${aEncaisser.enRetard} ${aEncaisser.enRetard > 1 ? "factures" : "facture"} en retard` : null;

  return (
    // Design v3 (24/10) : la grille commune ; en tête, le même gros chiffre
    // « À encaisser » que la carte de l'accueil (ChiffresMois), puis les
    // listes en cartes groupées, chaque ligne avec son montant à droite.
    <div className={CLASSE_PAGE_ETROITE}>
      <EnTetePage titre="Argent" sousTitre="Ce qu'on vous doit, et ce qui reste à faire." />

      <section aria-label="À encaisser" className={`mt-6 ${CARTE_PLEINE}`}>
        {aEncaisser.nombre > 0 ? (
          <>
            <p className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-medium text-steel">À encaisser</span>
              <span className="text-[13px] text-steel">TTC</span>
            </p>
            <p className="mt-1 whitespace-nowrap font-display text-[2rem] font-bold leading-10 tracking-[-0.03em] tabular-nums text-ink min-[400px]:text-[2.25rem]">
              {euros(Math.round(aEncaisser.total))}
            </p>
            {retard && (
              <p className="mt-1 flex items-center gap-2 text-[15px] font-semibold text-signal-fonce">
                <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-signal" />
                dont {retard}
              </p>
            )}
            <div className="mt-3 border-t border-gris-clair pt-1">
              <Link href="/dashboard/factures?statut=emise" className={`-mb-2 -ml-3 ${BOUTON_TEXTE}`}>
                {aEncaisser.nombre} {aEncaisser.nombre > 1 ? "factures émises" : "facture émise"}
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-[15px] font-medium text-steel">À encaisser</p>
            <p className="mt-1 text-[17px] font-semibold text-ink">Rien à encaisser.</p>
          </>
        )}
      </section>

      {/* 2. En attente du client, au complet. */}
      {enAttente.length > 0 && (
        <BlocDepliable
          titre="En attente du client"
          lignes={enAttente.map((l) => (
            <LigneArgent
              key={l.id}
              href={l.href}
              principal={l.nom}
              secondaire={detailEnAttente(l)}
              montant={l.montant}
              fin={l.relance ? <FinRelancer href={l.relance} /> : undefined}
            />
          ))}
        />
      )}

      {/* 3. Devis à envoyer (et à relire avant). */}
      {devisAEnvoyer.length > 0 && (
        <BlocDepliable
          titre="Devis à envoyer"
          lienTous="/dashboard/devis?statut=a_traiter"
          lignes={devisAEnvoyer.map((d) => (
            <LigneArgent
              key={d.id}
              href={d.href}
              principal={d.nom}
              secondaire={d.quoi === "Devis à relire" ? "À relire" : "Prêt à envoyer"}
              montant={d.montant}
            />
          ))}
        />
      )}

      {/* 4. À facturer : le chantier est fini, le client a dit oui, et tout
          n'est pas encore facturé. « Facturer » ouvre la fiche sur son bloc
          Facturation ; la facture se crée là, comme avant. */}
      {aFacturer.length > 0 && (
        <BlocDepliable
          titre="À facturer"
          lignes={aFacturer.map((l) => (
            <LigneArgent
              key={l.demandeId}
              href={l.href}
              principal={l.nom}
              secondaire={`Reste à facturer · ${l.jours} j`}
              montant={l.solde}
              fin={
                <LienAncre href={l.href} ancre="facturation" className={CLASSE_FIN_TEXTE}>
                  Facturer
                </LienAncre>
              }
            />
          ))}
        />
      )}

      {/* Le pied : les listes complètes, en boutons texte. */}
      <nav aria-label="Listes" className="-ml-3 mt-8 flex flex-wrap items-center">
        <Link href="/dashboard/devis" className={BOUTON_TEXTE}>
          Tous les devis
        </Link>
        <span aria-hidden className="text-steel">
          ·
        </span>
        <Link href="/dashboard/factures" className={BOUTON_TEXTE}>
          Toutes les factures
        </Link>
        <span aria-hidden className="text-steel">
          ·
        </span>
        <Link href="/dashboard/bilan" className={BOUTON_TEXTE}>
          Bilan du mois
        </Link>
      </nav>
    </div>
  );
}

/** Design v3 (24/10) — une ligne d'argent : qui, quoi, et le montant à
 *  droite (le chiffre se lit d'un coup d'œil, sans coupure) ; le geste
 *  (Relancer, Facturer) reste hors du lien, en pastille creuse. */
function LigneArgent({
  href,
  principal,
  secondaire,
  montant,
  fin,
}: {
  href: string;
  principal: string;
  secondaire: string;
  montant: number | null;
  fin?: ReactNode;
}) {
  return (
    <div className="flex min-h-[4.25rem] items-center">
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-3 active:bg-ink/10 sm:hover:bg-ink/5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
      >
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-[17px] font-semibold leading-snug text-ink">{principal}</span>
          <span className={`line-clamp-2 block ${SECONDAIRE}`}>{secondaire}</span>
        </span>
        {montant != null && (
          <span className={`shrink-0 whitespace-nowrap text-[17px] ${MONTANT}`}>{euros(montant, !Number.isInteger(montant))}</span>
        )}
      </Link>
      {fin && <span className="flex shrink-0 items-center py-2 pr-3">{fin}</span>}
    </div>
  );
}

// « Facture · 12 j · relancée » : court, pour tenir à côté du montant et
// de « Relancer » (règle 2). Design v3 (24/10) : le montant est à droite
// de la ligne, il ne se répète plus dans le détail ; le repère « 12 j »
// (l'ancienne colonne de gauche) passe dans le détail.
function detailEnAttente(l: LigneEnAttente): string {
  return [
    l.genre === "facture" ? "Facture" : "Devis",
    `${l.jours} j`,
    l.relanceeRecemment && (l.genre === "facture" ? "relancée" : "relancé"),
  ]
    .filter(Boolean)
    .join(" · ");
}
