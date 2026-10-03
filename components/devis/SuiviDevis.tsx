"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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

  const erreurAffichee = erreur && <p className="mt-3 text-sm text-signal-fonce dark:text-signal-clair">{erreur}</p>;

  // ---- Prêt à partir ------------------------------------------------------
  if (devis.statut === "a_valider") {
    const sansContact = !projet.telephone_client?.trim() && !projet.email_client?.trim();
    return (
      <Card className="p-6">
        <p className="font-display text-lg font-semibold">Prêt à partir</p>
        <p className="mt-1 text-sm text-steel">Une fois parti, le devis ne se modifie plus.</p>
        {sansContact && (
          <p className="mt-3 text-sm text-steel">Pas de numéro pour ce client : partagez le lien vous-même.</p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
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
                <Button variant="ghost" onClick={() => demanderEnvoi("sms")} loading={enCours === "sms"} disabled={enCours !== null}>
                  Par SMS
                </Button>
              )}
            </>
          ) : (
            <Button onClick={() => demanderEnvoi("deja")} loading={enCours === "deja"} disabled={enCours !== null}>
              Valider et partager le lien
            </Button>
          )}
          <Button variant="ghost" onClick={nouvelleVersion} loading={enCours === "version"} disabled={enCours !== null}>
            Modifier (nouvelle version)
          </Button>
        </div>
        {/* 27/09 (Axel) — Déjà envoyé en PDF ou à la main : le noter sans
            rouvrir de messagerie. */}
        {telephone && (
          <p className="mt-2 text-sm text-steel">
            Déjà envoyé autrement ?{" "}
            <button
              type="button"
              onClick={() => demanderEnvoi("deja")}
              disabled={enCours !== null}
              className="inline-flex min-h-12 items-center font-semibold text-ink underline decoration-ink/30 underline-offset-4 disabled:opacity-50"
            >
              {enCours === "deja" ? "Enregistrement…" : "Le noter comme envoyé"}
            </button>
          </p>
        )}
        {erreurAffichee}

        <Feuille
          ouverte={questionEnvoi !== null}
          titre={`Il manque : ${pointsManquants.join(", ").toLowerCase()}`}
          surFermer={() => setQuestionEnvoi(null)}
        >
          <p className="text-base text-steel">Le devis partira sans, et ne se modifiera plus.</p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setQuestionEnvoi(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="min-h-14 w-full rounded-2xl bg-ink px-5 text-base font-semibold text-paper active:bg-ink/80"
            >
              Compléter d&apos;abord
            </button>
            <button
              type="button"
              onClick={() => questionEnvoi && void envoyer(questionEnvoi)}
              className="min-h-12 w-full px-3 text-base font-semibold text-ink underline decoration-ink/30 underline-offset-4"
            >
              Envoyer quand même
            </button>
          </div>
        </Feuille>
      </Card>
    );
  }

  // ---- Accepté ------------------------------------------------------------
  if (accepte) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-succes/12 text-lg text-succes">✓</span>
          <div>
            <p className="font-display text-lg font-semibold">Devis accepté</p>
            <p className="text-sm text-ink/60">
              {devis.signe_le
                ? `Signé en ligne${devis.signature_nom ? ` par ${devis.signature_nom}` : ""} le ${dateLongue(devis.signe_le)}.`
                : projet.accepte_le
                  ? `Accepté le ${dateLongue(projet.accepte_le)}.`
                  : "Le client a donné son accord."}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-ink/60">
          La suite se passe sur le projet : acompte, factures et suivi du chantier.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => router.push(`/dashboard/demandes/${projet.id}`)}>Aller au projet</Button>
          <Button variant="ghost" onClick={nouvelleVersion} loading={enCours === "version"} disabled={enCours !== null}>
            Créer une nouvelle version
          </Button>
        </div>
        {erreurAffichee}
      </Card>
    );
  }

  // ---- Refusé -------------------------------------------------------------
  if (devis.statut === "refuse") {
    return (
      <Card className="p-6">
        <p className="font-display text-lg font-semibold">Devis refusé</p>
        <p className="mt-1 text-sm text-ink/60">
          Si le client a seulement tiqué sur un poste ou sur le prix, repartez de celui-ci.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={nouvelleVersion} loading={enCours === "version"} disabled={enCours !== null}>
            Créer une nouvelle version
          </Button>
          <Button variant="ghost" onClick={() => router.push(`/dashboard/demandes/${projet.id}`)}>
            Retour au projet
          </Button>
        </div>
        {erreurAffichee}
      </Card>
    );
  }

  // ---- Envoyé, en attente -------------------------------------------------
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <p className="font-display text-lg font-semibold">En attente de la réponse du client</p>
        <p className="mt-1 text-sm text-ink/60">
          {devis.envoye_le ? `Noté envoyé le ${dateLongue(devis.envoye_le)}` : "Noté envoyé"}
          {fin && (
            <span className={expire ? "text-alerte-orange" : ""}>
              {expire ? ` · offre expirée depuis le ${dateLongue(fin.toISOString())}` : ` · valable jusqu'au ${dateLongue(fin.toISOString())}`}
            </span>
          )}
        </p>

        {/* Refonte (02/10, duel F lot 1) — Compyo ne voit jamais le message
            partir : s'il n'est pas parti (réseau, mauvais contact), on le
            rouvre tel quel, en un appui. */}
        {telephone && (
          <p className="mt-3 flex flex-wrap items-center gap-x-3 text-sm text-steel">
            Pas parti ?
            {whatsappPossible && (
              <button
                type="button"
                onClick={() => ouvrirMessage("whatsapp", telephone, messageClient(devis, projet, nomEntreprise))}
                className="inline-flex min-h-12 items-center font-semibold text-ink underline decoration-ink/30 underline-offset-4"
              >
                Rouvrir WhatsApp
              </button>
            )}
            <button
              type="button"
              onClick={() => ouvrirMessage("sms", telephone, messageClient(devis, projet, nomEntreprise))}
              className="inline-flex min-h-12 items-center font-semibold text-ink underline decoration-ink/30 underline-offset-4"
            >
              {whatsappPossible ? "SMS" : "Rouvrir les SMS"}
            </button>
          </p>
        )}

        <p className="mt-5 text-xs font-medium uppercase tracking-wider text-ink/50">Transmettre le devis</p>
        <p className="mt-1 text-xs text-ink/45">
          Le lien permet à votre client de lire le devis et de le signer en ligne.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {partageLienPossible && (
            <Button onClick={partagerLien}>Partager (SMS, WhatsApp, mail…)</Button>
          )}
          <Button variant="ghost" onClick={() => copier("lien")}>
            {copie === "lien" ? "✓ Lien copié" : "Copier le lien"}
          </Button>
        </div>

        <div className="mt-4 rounded-xl border border-ink/10 bg-paper px-4 py-3">
          <p className="whitespace-pre-line text-xs leading-relaxed text-ink/70">
            {messageClient(devis, projet, nomEntreprise)}
          </p>
          <button
            type="button"
            onClick={() => copier("message")}
            className="mt-2 text-xs font-medium text-signal underline-offset-2 hover:underline"
          >
            {copie === "message" ? "✓ Message copié" : "Copier ce message"}
          </button>
        </div>
      </Card>

      <Card className="p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-ink/50">Le client a répondu ?</p>
        <p className="mt-1 text-xs text-ink/45">
          S&apos;il signe en ligne, c&apos;est automatique. Sinon, notez sa réponse ici.
        </p>
        {confirmerRefus ? (
          <div className="mt-3 rounded-xl border border-ink/10 bg-paper px-4 py-3">
            <p className="text-sm text-ink/80">Noter ce devis comme refusé ?</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button
                variant="danger"
                onClick={() =>
                  executer("refus", () => marquerDevisRefuse(ctx, { devisId: devis.id, demandeId: projet.id }))
                }
                loading={enCours === "refus"}
                disabled={enCours !== null}
              >
                Oui, refusé
              </Button>
              <Button variant="ghost" onClick={() => setConfirmerRefus(false)} disabled={enCours !== null}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={() => executer("accepte", () => marquerDevisAccepte(ctx, { demandeId: projet.id }))}
              loading={enCours === "accepte"}
              disabled={enCours !== null}
            >
              ✓ Accepté
            </Button>
            <Button variant="ghost" onClick={() => setConfirmerRefus(true)} disabled={enCours !== null}>
              Refusé
            </Button>
            <Button variant="ghost" onClick={nouvelleVersion} loading={enCours === "version"} disabled={enCours !== null}>
              Ajuster (nouvelle version)
            </Button>
          </div>
        )}
        <p className="mt-4 text-xs text-ink/45">
          Pas de nouvelles ?{" "}
          <Link href={`/dashboard/demandes/${projet.id}`} className="text-signal underline-offset-2 hover:underline">
            Préparer une relance depuis le projet
          </Link>
        </p>
        {erreurAffichee}
      </Card>
    </div>
  );
}
