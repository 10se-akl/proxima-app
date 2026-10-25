"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import {
  adresseEspaceDevis,
  dupliquerDevis,
  lienSignature,
  marquerDevisAccepte,
  marquerDevisEnvoye,
  marquerDevisRefuse,
  type ContexteAction,
} from "@/lib/devis/actions";
import { finDeValidite } from "@/lib/devis/mentionsLegales";
import { dateLongue, formatMontant } from "@/lib/devis/modeleDocument";
import { devisAccepte } from "@/lib/devis/statut";
import { numeroWhatsApp, ouvrirMessage, type Canal } from "@/lib/messagesClient";
import { Feuille } from "@/components/projet/Feuille";
import { IconeCoche } from "@/components/projet/icones";
import {
  BOUTON_ALERTE,
  BOUTON_PLEIN_LARGE,
  BOUTON_TEXTE,
  CARTE_PLEINE,
  CREUX,
  SECONDAIRE,
  TITRE_CARTE,
} from "@/components/ui/recettes";
import type { Devis, ParametresEntreprise } from "@/types";

// ============================================================
// Suivi d'un devis validé (17/09) : l'envoyer, le transmettre, noter la
// réponse du client. Un seul bouton principal à chaque étape — l'artisan
// n'a jamais à se demander quoi faire ensuite.
//
// Rien ne part chez le client sans un clic de l'artisan : "Envoyer" fige le
// devis et ouvre le lien de signature ; c'est lui qui le transmet, par le
// moyen qu'il veut.
// ============================================================

// Design v3 (24/10) : chaque étape est une carte (surface + ombre douce),
// un seul bouton plein, le reste en creux ; les boutons s'empilent en
// pleine largeur sur téléphone, côte à côte sur ordinateur.
const RANGEE_BOUTONS = "mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3";
// Une action tertiaire après une question (« Le noter comme envoyé »).
// Design v3 (25/10) : plus de lien souligné utilisé comme bouton — le bouton
// texte (encre, sans soulignement).
const LIEN_ACTION = `${BOUTON_TEXTE} disabled:cursor-not-allowed disabled:opacity-60`;
// La roue d'un bouton en cours (même dessin que <Button loading>).
const ROUE = "h-3.5 w-3.5 shrink-0 motion-safe:animate-spin rounded-full border-2 border-current border-t-transparent";

export type ProjetDuDevis = {
  id: string;
  nom_client: string;
  telephone_client: string | null;
  email_client: string | null;
  statut: string;
  accepte_le?: string | null;
};

function messageClient(devis: Devis, projet: ProjetDuDevis, nomEntreprise: string): string {
  const pour = devis.objet?.trim() ? ` pour ${devis.objet.trim().replace(/\.$/, "").toLowerCase()}` : "";
  return [
    `Bonjour ${projet.nom_client},`,
    "",
    `Voici votre devis n° ${devis.numero}${pour}, d'un montant de ${formatMontant(devis.total_estime)} TTC :`,
    lienSignature(devis.id),
    "",
    "Vous pouvez le lire et le signer en ligne, directement depuis votre téléphone.",
    "",
    nomEntreprise,
  ].join("\n");
}

export function SuiviDevis({
  devis,
  projet,
  parametres,
  nomEntreprise,
  artisanId,
  organisationId,
  onChange,
  pointsManquants = [],
}: {
  devis: Devis;
  projet: ProjetDuDevis;
  parametres: ParametresEntreprise | null;
  nomEntreprise: string;
  artisanId: string | null;
  organisationId: string | null;
  onChange: () => Promise<void>;
  /** Les points de conformité non tenus (score du devis) : une question
   *  les rappelle avant de figer le devis. */
  pointsManquants?: string[];
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState<"lien" | "message" | null>(null);
  const [confirmerRefus, setConfirmerRefus] = useState(false);
  // Refonte (02/10, duel F lot 1) — le canal choisi, en attente de la
  // réponse à « Il manque … ».
  const [questionEnvoi, setQuestionEnvoi] = useState<Canal | "deja" | null>(null);
  const telephone = projet.telephone_client?.trim() || null;
  const whatsappPossible = !!telephone && numeroWhatsApp(telephone) !== null;

  const ctx: ContexteAction = { supabase: createClient(), artisanId, organisationId };
  const accepte = devisAccepte(devis, projet.statut);
  const fin = finDeValidite(devis);
  const expire = Boolean(fin && fin.getTime() < Date.now());
  const partageLienPossible = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function executer(cle: string, action: () => Promise<{ ok: boolean; erreur?: string }>) {
    setErreur(null);
    setEnCours(cle);
    try {
      const resultat = await action();
      if (!resultat.ok) {
        setErreur(resultat.erreur ?? "Une erreur est survenue. Réessayez.");
        return;
      }
      await onChange();
    } finally {
      setEnCours(null);
    }
  }

  async function nouvelleVersion() {
    setErreur(null);
    setEnCours("version");
    const resultat = await dupliquerDevis(ctx, { devisId: devis.id, demandeId: projet.id });
    if (!resultat.ok) {
      setEnCours(null);
      setErreur(resultat.erreur);
      return;
    }
    router.push(adresseEspaceDevis(resultat.nouveauDevisId));
  }

  async function copier(quoi: "lien" | "message") {
    try {
      await navigator.clipboard.writeText(
        quoi === "lien" ? lienSignature(devis.id) : messageClient(devis, projet, nomEntreprise)
      );
      setCopie(quoi);
      setTimeout(() => setCopie(null), 2000);
    } catch {
      setErreur("La copie n'a pas fonctionné. Sélectionnez le texte et copiez-le à la main.");
    }
  }

  async function partagerLien() {
    try {
      await navigator.share({
        title: `Devis n° ${devis.numero}`,
        text: messageClient(devis, projet, nomEntreprise),
      });
    } catch {
      // Feuille de partage fermée : rien à signaler.
    }
  }

  // Refonte (02/10, duel F lot 1) — « Envoyer au client » ne faisait que figer
  // le devis : il fallait ensuite « Partager », choisir l'application, puis
  // retrouver le client (7 gestes). Maintenant, un appui fige le devis (le
  // lien de signature ne marche qu'une fois le devis noté envoyé) PUIS ouvre
  // WhatsApp ou les SMS au numéro du client, message et lien prêts. C'est
  // l'artisan qui appuie sur envoyer. L'ouverture suit l'enregistrement de
  // près : le navigateur la permet encore (activation de l'utilisateur), et
  // « Pas parti ? Rouvrir » rattrape le cas contraire.
  async function envoyer(canal: Canal | "deja") {
    setQuestionEnvoi(null);
    setErreur(null);
    setEnCours(canal);
    try {
      const titre =
        canal === "whatsapp" ? "Devis prêt dans WhatsApp" : canal === "sms" ? "Devis prêt dans les SMS" : "Devis noté envoyé";
      const resultat = await marquerDevisEnvoye(ctx, { devis, demandeId: projet.id, parametres }, titre);
      if (!resultat.ok) {
        setErreur(resultat.erreur);
        return;
      }
      if (canal !== "deja" && telephone) ouvrirMessage(canal, telephone, messageClient(devis, projet, nomEntreprise));
      await onChange();
    } finally {
      setEnCours(null);
    }
  }

  function demanderEnvoi(canal: Canal | "deja") {
    if (pointsManquants.length > 0) setQuestionEnvoi(canal);
    else void envoyer(canal);
  }

  const erreurAffichee = erreur && (
    <p role="alert" className="mt-3 text-[15px] font-semibold text-signal-fonce">
      {erreur}
    </p>
  );

  // ---- Prêt à partir ------------------------------------------------------
  if (devis.statut === "a_valider") {
    const sansContact = !projet.telephone_client?.trim() && !projet.email_client?.trim();
    return (
      <section className={CARTE_PLEINE}>
        <h2 className={TITRE_CARTE}>Prêt à partir</h2>
        <p className={`${SECONDAIRE} mt-1`}>Une fois parti, le devis ne se modifie plus.</p>
        {sansContact && (
          <p className={`${SECONDAIRE} mt-3`}>Pas de numéro pour ce client : partagez le lien vous-même.</p>
        )}
        <div className={RANGEE_BOUTONS}>
          {telephone ? (
            <>
              <Button
                onClick={() => demanderEnvoi(whatsappPossible ? "whatsapp" : "sms")}
                loading={enCours === "whatsapp" || (!whatsappPossible && enCours === "sms")}
                disabled={enCours !== null}
              >
                {whatsappPossible ? "Envoyer par WhatsApp" : "Envoyer par SMS"}
              </Button>
              {whatsappPossible && (
                <Button variant="secondary" onClick={() => demanderEnvoi("sms")} loading={enCours === "sms"} disabled={enCours !== null}>
                  Par SMS
                </Button>
              )}
            </>
          ) : (
            <Button onClick={() => demanderEnvoi("deja")} loading={enCours === "deja"} disabled={enCours !== null}>
              Valider et partager le lien
            </Button>
          )}
          <Button variant="secondary" onClick={nouvelleVersion} loading={enCours === "version"} disabled={enCours !== null}>
            Modifier (nouvelle version)
          </Button>
        </div>
        {/* 27/09 (Axel) — Déjà envoyé en PDF ou à la main : le noter sans
            rouvrir de messagerie. */}
        {telephone && (
          <p className={`${SECONDAIRE} mt-2 flex flex-wrap items-center gap-x-1`}>
            Déjà envoyé autrement&nbsp;?
            <button
              type="button"
              onClick={() => demanderEnvoi("deja")}
              disabled={enCours !== null}
              className={LIEN_ACTION}
            >
              {enCours === "deja" ? "Enregistrement…" : "Le noter comme envoyé"}
            </button>
          </p>
        )}
        {erreurAffichee}

        <Feuille
          ouverte={questionEnvoi !== null}
          titre={`Il manque : ${pointsManquants.join(", ").toLowerCase()}`}
          surFermer={() => setQuestionEnvoi(null)}
        >
          <p className="text-base text-steel [text-wrap:pretty]">Le devis partira sans, et ne se modifiera plus.</p>
          {/* Design v3 (24/10) : le bouton plein (le geste prudent) en bas,
              sous le pouce, comme dans les autres feuilles. */}
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => questionEnvoi && void envoyer(questionEnvoi)}
              className={`${BOUTON_TEXTE} w-full justify-center`}
            >
              Envoyer quand même
            </button>
            <button
              type="button"
              onClick={() => {
                setQuestionEnvoi(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={BOUTON_PLEIN_LARGE}
            >
              Compléter d&apos;abord
            </button>
          </div>
        </Feuille>
      </section>
    );
  }

  // ---- Accepté ------------------------------------------------------------
  if (accepte) {
    return (
      <section className={CARTE_PLEINE}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-succes-fond text-succes" aria-hidden>
            <IconeCoche className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className={TITRE_CARTE}>Devis accepté</h2>
            <p className={SECONDAIRE}>
              {devis.signe_le
                ? `Signé en ligne${devis.signature_nom ? ` par ${devis.signature_nom}` : ""} le ${dateLongue(devis.signe_le)}.`
                : projet.accepte_le
                  ? `Accepté le ${dateLongue(projet.accepte_le)}.`
                  : "Le client a donné son accord."}
            </p>
          </div>
        </div>
        <p className={`${SECONDAIRE} mt-4`}>
          La suite se passe sur le projet : acompte, factures et suivi du chantier.
        </p>
        <div className={RANGEE_BOUTONS}>
          <Button onClick={() => router.push(`/dashboard/demandes/${projet.id}`)}>Aller au projet</Button>
          <Button variant="secondary" onClick={nouvelleVersion} loading={enCours === "version"} disabled={enCours !== null}>
            Créer une nouvelle version
          </Button>
        </div>
        {erreurAffichee}
      </section>
    );
  }

  // ---- Refusé -------------------------------------------------------------
  if (devis.statut === "refuse") {
    return (
      <section className={CARTE_PLEINE}>
        <h2 className={TITRE_CARTE}>Devis refusé</h2>
        <p className={`${SECONDAIRE} mt-1`}>
          Si le client a seulement tiqué sur un poste ou sur le prix, repartez de celui-ci.
        </p>
        <div className={RANGEE_BOUTONS}>
          <Button onClick={nouvelleVersion} loading={enCours === "version"} disabled={enCours !== null}>
            Créer une nouvelle version
          </Button>
          <Button variant="secondary" onClick={() => router.push(`/dashboard/demandes/${projet.id}`)}>
            Retour au projet
          </Button>
        </div>
        {erreurAffichee}
      </section>
    );
  }

  // ---- Envoyé, en attente -------------------------------------------------
  return (
    <div className="space-y-4">
      <section className={CARTE_PLEINE}>
        <h2 className={TITRE_CARTE}>En attente de la réponse du client</h2>
        <p className={`${SECONDAIRE} mt-1`}>
          {devis.envoye_le ? `Noté envoyé le ${dateLongue(devis.envoye_le)}` : "Noté envoyé"}
          {fin && (
            <span className={expire ? "font-semibold text-alerte-orange" : ""}>
              {expire ? ` · offre expirée depuis le ${dateLongue(fin.toISOString())}` : ` · valable jusqu'au ${dateLongue(fin.toISOString())}`}
            </span>
          )}
        </p>

        {/* Refonte (02/10, duel F lot 1) — Compyo ne voit jamais le message
            partir : s'il n'est pas parti (réseau, mauvais contact), on le
            rouvre tel quel, en un appui. */}
        {telephone && (
          <p className={`${SECONDAIRE} mt-2 flex flex-wrap items-center gap-x-1`}>
            Pas parti&nbsp;?
            {whatsappPossible && (
              <button
                type="button"
                onClick={() => ouvrirMessage("whatsapp", telephone, messageClient(devis, projet, nomEntreprise))}
                className={LIEN_ACTION}
              >
                Rouvrir WhatsApp
              </button>
            )}
            <button
              type="button"
              onClick={() => ouvrirMessage("sms", telephone, messageClient(devis, projet, nomEntreprise))}
              className={LIEN_ACTION}
            >
              {whatsappPossible ? "SMS" : "Rouvrir les SMS"}
            </button>
          </p>
        )}

        {/* Design v3 (24/10) : un sous-titre en clair (plus de capitales
            espacées), le message dans un encart en creux, lisible en 15 px. */}
        <div className="mt-5 border-t border-gris-clair pt-5">
          <h3 className="text-[17px] font-semibold text-ink">Transmettre le devis</h3>
          <p className={`${SECONDAIRE} mt-1`}>
            Le lien permet à votre client de lire le devis et de le signer en ligne.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
            {partageLienPossible && (
              <Button onClick={partagerLien}>Partager (SMS, WhatsApp, mail…)</Button>
            )}
            <Button variant="secondary" onClick={() => copier("lien")}>
              {copie === "lien" ? "✓ Lien copié" : "Copier le lien"}
            </Button>
          </div>

          <div className={`${CREUX} mt-4 px-4 pb-1 pt-3`}>
            <p className="whitespace-pre-line break-words text-[15px] leading-relaxed text-ink">
              {messageClient(devis, projet, nomEntreprise)}
            </p>
            <button type="button" onClick={() => copier("message")} className={`${BOUTON_TEXTE} -ml-3`}>
              {copie === "message" ? "✓ Message copié" : "Copier ce message"}
            </button>
          </div>
        </div>
      </section>

      <section className={CARTE_PLEINE}>
        <h2 className={TITRE_CARTE}>Le client a répondu ?</h2>
        <p className={`${SECONDAIRE} mt-1`}>
          S&apos;il signe en ligne, c&apos;est automatique. Sinon, notez sa réponse ici.
        </p>
        {confirmerRefus ? (
          <div className={`${CREUX} mt-4 px-4 py-4`}>
            <p className="text-base font-semibold text-ink">Noter ce devis comme refusé ?</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
              {/* Une réponse négative n'est jamais pleine : creux d'alerte. */}
              <button
                type="button"
                onClick={() =>
                  executer("refus", () => marquerDevisRefuse(ctx, { devisId: devis.id, demandeId: projet.id }))
                }
                disabled={enCours !== null}
                className={BOUTON_ALERTE}
              >
                {enCours === "refus" && <span className={ROUE} aria-hidden="true" />}
                {enCours === "refus" ? "Enregistrement…" : "Oui, refusé"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmerRefus(false)}
                disabled={enCours !== null}
                className={`${BOUTON_TEXTE} justify-center`}
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
            <Button
              variant="secondary"
              onClick={() => executer("accepte", () => marquerDevisAccepte(ctx, { demandeId: projet.id }))}
              loading={enCours === "accepte"}
              disabled={enCours !== null}
            >
              {enCours !== "accepte" && <IconeCoche className="h-5 w-5" />}
              Accepté
            </Button>
            <Button variant="secondary" onClick={() => setConfirmerRefus(true)} disabled={enCours !== null}>
              Refusé
            </Button>
            <Button variant="secondary" onClick={nouvelleVersion} loading={enCours === "version"} disabled={enCours !== null}>
              Ajuster (nouvelle version)
            </Button>
          </div>
        )}
        <p className={`${SECONDAIRE} mt-4 flex flex-wrap items-center gap-x-1`}>
          Pas de nouvelles&nbsp;?
          <Link href={`/dashboard/demandes/${projet.id}`} className={LIEN_ACTION}>
            Préparer une relance depuis le projet
          </Link>
        </p>
        {erreurAffichee}
      </section>
    </div>
  );
}
