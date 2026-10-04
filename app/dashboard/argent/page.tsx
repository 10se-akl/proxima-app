import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrganisationId } from "@/lib/organisation";
import { aplatirClient, calculerArgent, euros, JOURS_PAUSE_RELANCE, type LigneEnAttente } from "@/lib/argent";
import { CLASSE_BOUTON_TEXTE, CLASSE_FIN_TEXTE, FinRelancer, LigneAccueil } from "@/components/accueil/Blocs";
import { BlocDepliable } from "@/components/accueil/BlocDepliable";
import { LienAncre } from "@/components/accueil/LienAncre";
import { Pastille } from "@/components/ui/Pastille";
import { EnTetePage } from "@/components/ui/EnTetePage";
import { IconeCloche, IconeDocument, IconeEuro } from "@/components/projet/icones";

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

  return (
    <div className="max-w-2xl px-4 pb-8 pt-4 sm:p-8">
      {/* Refonte visuelle (04/10) : l'en-tête bleu nuit, et dedans ce qui
          reste dû, maintenant. */}
      <EnTetePage
        titre="Argent"
        sousTitre="Ce qu'on vous doit, et ce qui reste à faire."
        icone={
          <Pastille couleur="violet" taille="grande">
            <IconeEuro className="h-6 w-6" />
          </Pastille>
        }
      >
        <section aria-label="À encaisser" className="rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/15">
          {aEncaisser.nombre > 0 ? (
            <>
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-display text-3xl font-semibold tabular-nums">{euros(aEncaisser.total)}</span>
                <span className="text-base text-white/70">à encaisser</span>
              </p>
              <Link
                href="/dashboard/factures?statut=emise"
                className="-ml-3 inline-flex min-h-12 items-center px-3 text-sm text-white/70 underline decoration-white/30 underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                {aEncaisser.nombre} {aEncaisser.nombre > 1 ? "factures émises" : "facture émise"}
                {aEncaisser.enRetard > 0 && ` · ${aEncaisser.enRetard} après échéance`}
              </Link>
            </>
          ) : (
            <p className="text-base text-white/80">Rien à encaisser.</p>
          )}
        </section>
      </EnTetePage>

      {/* 2. En attente du client, au complet. */}
      {enAttente.length > 0 && (
        <BlocDepliable
          titre="En attente du client"
          icone={
            <Pastille couleur="orange" variante="doux" taille="petite">
              <IconeCloche className="h-4 w-4" />
            </Pastille>
          }
          lignes={enAttente.map((l) => (
            <LigneAccueil
              key={l.id}
              href={l.href}
              repere={`${l.jours} j`}
              principal={l.nom}
              secondaire={detailEnAttente(l)}
              fin={l.relance ? <FinRelancer href={l.relance} /> : undefined}
            />
          ))}
        />
      )}

      {/* 3. Devis à envoyer (et à relire avant). */}
      {devisAEnvoyer.length > 0 && (
        <BlocDepliable
          titre="Devis à envoyer"
          icone={
            <Pastille couleur="vert" variante="doux" taille="petite">
              <IconeDocument className="h-4 w-4" />
            </Pastille>
          }
          lienTous="/dashboard/devis?statut=a_traiter"
          lignes={devisAEnvoyer.map((d) => (
            <LigneAccueil
              key={d.id}
              href={d.href}
              principal={d.nom}
              secondaire={[d.quoi === "Devis à relire" ? "À relire" : "Prêt à envoyer", d.montant != null && euros(d.montant)]
                .filter(Boolean)
                .join(" · ")}
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
          icone={
            <Pastille couleur="violet" variante="doux" taille="petite">
              <IconeEuro className="h-4 w-4" />
            </Pastille>
          }
          lignes={aFacturer.map((l) => (
            <LigneAccueil
              key={l.demandeId}
              href={l.href}
              repere={`${l.jours} j`}
              principal={l.nom}
              secondaire={`Reste ${euros(l.solde)}`}
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
      <nav aria-label="Listes" className="-ml-3 mt-7 flex flex-wrap items-center">
        <Link href="/dashboard/devis" className={CLASSE_BOUTON_TEXTE}>
          Tous les devis
        </Link>
        <span aria-hidden className="text-steel">
          ·
        </span>
        <Link href="/dashboard/factures" className={CLASSE_BOUTON_TEXTE}>
          Toutes les factures
        </Link>
        <span aria-hidden className="text-steel">
          ·
        </span>
        <Link href="/dashboard/bilan" className={CLASSE_BOUTON_TEXTE}>
          Bilan du mois
        </Link>
      </nav>
    </div>
  );
}

// « Facture · 1 250 € · relancée » : court, pour tenir sur une ligne à côté
// de « Relancer » (règle 2).
function detailEnAttente(l: LigneEnAttente): string {
  return [
    l.genre === "facture" ? "Facture" : "Devis",
    l.montant != null && euros(l.montant),
    l.relanceeRecemment && (l.genre === "facture" ? "relancée" : "relancé"),
  ]
    .filter(Boolean)
    .join(" · ");
}
