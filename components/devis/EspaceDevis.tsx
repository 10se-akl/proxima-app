"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { Button } from "@/components/ui/Button";
import { EtatErreur } from "@/components/ui/EtatErreur";
import { Skeleton } from "@/components/ui/Skeleton";
import { ValiderDevis } from "@/components/dashboard/ValiderDevis";
import { ApercuPdf } from "@/components/devis/ApercuPdf";
import { SuiviDevis, type ProjetDuDevis } from "@/components/devis/SuiviDevis";
import {
  partageDeFichierPossible,
  partagerPdfDevis,
  telechargerPdfDevis,
} from "@/components/devis/pdf/genererPdf";
import { adresseEspaceDevis } from "@/lib/devis/actions";
import { mentionsEffectives, nomEntreprise } from "@/lib/devis/mentionsLegales";
import {
  construireModeleDevis,
  formatMontant,
  sourceDepuisDevis,
  type SourceDocumentDevis,
} from "@/lib/devis/modeleDocument";
import { statutAffiche } from "@/lib/devis/statut";
import type { Devis, ParametresEntreprise } from "@/types";

// ============================================================
// Espace devis (17/09) — un écran pour un devis, et rien d'autre.
//
// À gauche, ce que l'artisan fait (modifier le brouillon, puis l'envoyer et
// suivre la réponse). À droite, le vrai PDF, qui suit chaque modification.
// Sur téléphone, les deux se consultent l'un après l'autre (bascule en
// haut de l'écran), sans rien perdre.
//
// Retour d'Axel du 16/09 : le devis prenait toute la place de la fiche
// projet ; il a désormais son propre espace, la fiche n'en garde qu'un
// résumé.
// ============================================================

type AutreVersion = Pick<Devis, "id" | "numero" | "statut" | "created_at">;

export type DonneesEspaceDevis = {
  devis: Devis;
  projet: ProjetDuDevis & { adresse_client: string | null };
  parametres: ParametresEntreprise | null;
  nomArtisan: string;
  logoUrl: string | null;
  artisanId: string;
  organisationId: string | null;
  versions: AutreVersion[];
};

export function EspaceDevis({ devisId }: { devisId: string }) {
  const [donnees, setDonnees] = useState<DonneesEspaceDevis | null>(null);
  const [etat, setEtat] = useState<"chargement" | "pret" | "introuvable" | "erreur">("chargement");

  const charger = useCallback(async () => {
    const supabase = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setEtat("erreur");
        return;
      }

      const [{ data: devisData, error: erreurDevis }, organisationId] = await Promise.all([
        supabase.from("devis").select("*").eq("id", devisId).maybeSingle(),
        getOrganisationId(supabase, user.id),
      ]);
      if (erreurDevis) throw erreurDevis;
      if (!devisData) {
        setEtat("introuvable");
        return;
      }
      const devis = devisData as Devis;

      const [{ data: projet }, { data: parametres }, { data: profil }, { data: versions }] = await Promise.all([
        supabase
          .from("demandes")
          .select("id, nom_client, telephone_client, email_client, adresse_client, statut, accepte_le")
          .eq("id", devis.demande_id)
          .maybeSingle(),
        organisationId
          ? supabase.from("parametres_entreprise").select("*").eq("organisation_id", organisationId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("profils").select("nom").eq("id", user.id).maybeSingle(),
        supabase
          .from("devis")
          .select("id, numero, statut, created_at")
          .eq("demande_id", devis.demande_id)
          .neq("id", devis.id)
          .order("created_at", { ascending: false }),
      ]);
      if (!projet) {
        setEtat("introuvable");
        return;
      }

      let logoUrl: string | null = null;
      const cheminLogo = (parametres as ParametresEntreprise | null)?.logo_url;
      if (cheminLogo) {
        const { data: signe } = await supabase.storage.from("logos").createSignedUrl(cheminLogo, 3600);
        logoUrl = signe?.signedUrl ?? null;
      }

      setDonnees({
        devis,
        projet: projet as DonneesEspaceDevis["projet"],
        parametres: (parametres as ParametresEntreprise | null) ?? null,
        nomArtisan: profil?.nom ?? "",
        logoUrl,
        artisanId: user.id,
        organisationId,
        versions: (versions as AutreVersion[] | null) ?? [],
      });
      setEtat("pret");
    } catch (e) {
      console.error("Chargement de l'espace devis :", e);
      setEtat("erreur");
    }
  }, [devisId]);

  useEffect(() => {
    setEtat("chargement");
    charger();
  }, [charger]);

  if (etat === "chargement") {
    return (
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-8 w-64" />
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <Skeleton className="h-[480px]" />
          <Skeleton className="hidden aspect-[210/297] lg:block" />
        </div>
      </div>
    );
  }

  if (etat === "introuvable") {
    return (
      <div className="px-4 py-10 sm:px-8">
        <p className="text-sm text-ink/70">Ce devis n&apos;existe pas, ou vous n&apos;y avez pas accès.</p>
        <Link href="/dashboard/devis" className="mt-3 inline-block text-sm text-signal underline-offset-2 hover:underline">
          Voir tous les devis
        </Link>
      </div>
    );
  }

  if (etat === "erreur" || !donnees) {
    return (
      <div className="px-4 py-10 sm:px-8">
        <EtatErreur
          message="Impossible de charger ce devis. Vérifiez votre connexion."
          onReessayer={() => {
            setEtat("chargement");
            charger();
          }}
        />
      </div>
    );
  }

  return <VueEspaceDevis donnees={donnees} onRecharger={charger} />;
}

// L'écran lui-même, séparé du chargement : il ne dépend que des données
// qu'on lui passe.
export function VueEspaceDevis({
  donnees,
  onRecharger,
}: {
  donnees: DonneesEspaceDevis;
  onRecharger: () => Promise<void>;
}) {
  const [brouillon, setBrouillon] = useState<SourceDocumentDevis | null>(null);
  const [vue, setVue] = useState<"edition" | "apercu">("edition");
  const [pdfEnCours, setPdfEnCours] = useState<"telechargement" | "partage" | null>(null);
  const [erreurPdf, setErreurPdf] = useState<string | null>(null);
  const [partageFichier, setPartageFichier] = useState(false);

  useEffect(() => setPartageFichier(partageDeFichierPossible()), []);

  const modele = useMemo(() => {
    const { devis, projet, parametres, nomArtisan, logoUrl } = donnees;
    const source = devis.statut === "brouillon" && brouillon ? brouillon : sourceDepuisDevis(devis);
    return construireModeleDevis({
      source,
      mentions: mentionsEffectives(devis, parametres),
      client: { nom: projet.nom_client, adresse: projet.adresse_client, telephone: projet.telephone_client },
      logoUrl,
      nomDeRepli: nomArtisan || "Votre entreprise",
      signature: devis.signe_le
        ? { nom: devis.signature_nom, le: devis.signe_le, image: devis.signature_data }
        : null,
    });
  }, [donnees, brouillon]);

  async function actionPdf(type: "telechargement" | "partage") {
    if (!modele) return;
    setErreurPdf(null);
    setPdfEnCours(type);
    try {
      if (type === "telechargement") await telechargerPdfDevis(modele);
      else await partagerPdfDevis(modele);
    } catch (e) {
      console.error("PDF du devis :", e);
      setErreurPdf("Le PDF n'a pas pu être préparé. Vérifiez votre connexion et réessayez.");
    } finally {
      setPdfEnCours(null);
    }
  }

  const { devis, projet, parametres, artisanId, organisationId, versions } = donnees;
  const estBrouillon = devis.statut === "brouillon";
  const statut = statutAffiche(devis, projet.statut);
  const totalAffiche = estBrouillon && brouillon ? brouillon.total_estime : devis.total_estime;

  return (
    <div className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
      <Link
        href={`/dashboard/demandes/${projet.id}`}
        className="text-xs text-ink/50 transition-colors hover:text-ink"
      >
        ← Projet · {projet.nom_client}
      </Link>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold">Devis n° {devis.numero}</h1>
            <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${statut.classe}`}>{statut.texte}</span>
          </div>
          <p className="mt-1 text-sm text-ink/55">
            {projet.nom_client} · <span className="font-medium text-ink/80">{formatMontant(totalAffiche)} TTC</span>
          </p>
          {versions.length > 0 && (
            <p className="mt-1 text-xs text-ink/45">
              Autres versions :{" "}
              {versions.map((v, i) => (
                <span key={v.id}>
                  {i > 0 && ", "}
                  <Link href={adresseEspaceDevis(v.id)} className="underline-offset-2 hover:text-ink hover:underline">
                    n° {v.numero}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() => actionPdf("telechargement")}
            loading={pdfEnCours === "telechargement"}
            disabled={pdfEnCours !== null}
            title={estBrouillon ? "Brouillon : à valider avant de l'envoyer au client" : undefined}
          >
            Télécharger le PDF
          </Button>
          {partageFichier && !estBrouillon && (
            <Button
              variant="ghost"
              onClick={() => actionPdf("partage")}
              loading={pdfEnCours === "partage"}
              disabled={pdfEnCours !== null}
            >
              Partager le PDF
            </Button>
          )}
        </div>
      </div>
      {erreurPdf && <p className="mt-2 text-sm text-signal">{erreurPdf}</p>}

      {estBrouillon && (
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-ink/10 bg-surface p-1 lg:hidden" role="tablist">
          {(
            [
              ["edition", "Modifier"],
              ["apercu", "Aperçu du PDF"],
            ] as const
          ).map(([cle, libelle]) => (
            <button
              key={cle}
              type="button"
              role="tab"
              aria-selected={vue === cle}
              onClick={() => setVue(cle)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                vue === cle ? "bg-ink text-paper" : "text-ink/60 hover:text-ink"
              }`}
            >
              {libelle}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className={`min-w-0 ${estBrouillon && vue === "apercu" ? "hidden lg:block" : ""}`}>
          {estBrouillon ? (
            <ValiderDevis
              // Remonté à chaque nouvelle version chargée : l'éditeur repart
              // toujours de ce qui est enregistré.
              key={devis.id}
              devis={devis}
              demandeId={projet.id}
              artisanId={artisanId}
              parametres={parametres}
              adresseClient={projet.adresse_client}
              onApercu={setBrouillon}
              onValide={onRecharger}
            />
          ) : (
            <SuiviDevis
              devis={devis}
              projet={projet}
              parametres={parametres}
              nomEntreprise={nomEntreprise(mentionsEffectives(devis, parametres), donnees.nomArtisan || "")}
              artisanId={artisanId}
              organisationId={organisationId}
              onChange={onRecharger}
            />
          )}
        </section>

        <aside
          className={`min-w-0 lg:sticky lg:top-6 ${estBrouillon && vue === "edition" ? "hidden lg:block" : ""}`}
          aria-label="Aperçu du PDF"
        >
          <p className="mb-3 text-xs text-ink/45">
            {estBrouillon
              ? "Aperçu exact du PDF, mis à jour à chaque modification."
              : "Le PDF tel que votre client le reçoit."}
          </p>
          <div className="lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-2">
            <ApercuPdf modele={modele} />
          </div>
        </aside>
      </div>
    </div>
  );
}
