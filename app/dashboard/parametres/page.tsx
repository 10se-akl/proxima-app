"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field, TextareaField } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PARAMETRES_PAR_DEFAUT } from "@/lib/moteur-metier/calculerDevis";
import { MonCompte } from "@/components/dashboard/MonCompte";
import { EquipeSection } from "@/components/dashboard/EquipeSection";

type FormState = typeof PARAMETRES_PAR_DEFAUT;
type Onglet = "entreprise" | "equipe" | "compte";

// Audit Cycle 2 (Agent Destructeur) : aucune de ces valeurs n'était bornée,
// ni côté client ni côté serveur — une faute de frappe (TVA négative, coût
// horaire à 1e8...) contaminait silencieusement tous les devis générés
// ensuite. Bornes larges mais réalistes pour un artisan du bâtiment.
// Revue métier (06/09) — "prix_km" et "rayon_max_km" ont été retirés d'ici
// (et du formulaire plus bas) : deux champs éditables, sauvegardés, mais
// jamais lus par lib/moteur-metier/calculerDevis.ts — le déplacement a
// toujours été un forfait fixe, jamais un calcul distance × prix au km.
// Un artisan qui réglait "prix au km" pensait légitimement que ça changeait
// quelque chose à ses devis ; ça ne faisait rien. Un vrai calcul par
// distance demanderait de géolocaliser chaque chantier (nouvelle
// dépendance externe) — disproportionné pour l'instant plutôt que de
// laisser deux réglages fantômes. Voir aussi calculerLigne() : "cout_
// journalier", lui, était dans le même cas et a été câblé pour de vrai
// (bascule automatique en tarif jour au-delà d'une journée de travail)
// plutôt que retiré, parce que plusieurs métiers (maçon, couvreur,
// charpentier, terrassier, façadier) raisonnent naturellement à la
// journée sur un gros chantier, pas à l'heure.
const BORNES: Partial<Record<keyof FormState, { min: number; max: number; label: string }>> = {
  tva_pct: { min: 0, max: 100, label: "TVA" },
  cout_horaire: { min: 0, max: 1000, label: "Coût horaire" },
  cout_journalier: { min: 0, max: 5000, label: "Coût journalier" },
  marge_defaut_pct: { min: 0, max: 500, label: "Marge par défaut" },
  heures_min_facturables: { min: 0, max: 24, label: "Heures minimum facturables" },
  forfait_deplacement: { min: 0, max: 2000, label: "Forfait déplacement" },
};

function validerForm(form: FormState): string | null {
  for (const [champ, bornes] of Object.entries(BORNES)) {
    const valeur = form[champ as keyof FormState];
    if (valeur === null || valeur === undefined) continue;
    if (typeof valeur !== "number" || !Number.isFinite(valeur)) {
      return `${bornes.label} : valeur invalide.`;
    }
    if (valeur < bornes.min || valeur > bornes.max) {
      return `${bornes.label} doit être compris entre ${bornes.min} et ${bornes.max}.`;
    }
  }
  return null;
}

export default function ParametresPage() {
  const supabase = createClient();

  const [form, setForm] = useState<FormState>(PARAMETRES_PAR_DEFAUT);
  const [onglet, setOnglet] = useState<Onglet>("entreprise");
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [confirme, setConfirme] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [envoiLogo, setEnvoiLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  // Les paramètres d'entreprise sont partagés par toute l'équipe (une seule
  // ligne par organisation, pas par personne) — voir Module 14 dans
  // supabase/schema.sql. On résout donc l'organisation_id une fois ici,
  // plutôt que de filtrer par artisan_id comme avant.
  const [organisationId, setOrganisationId] = useState<string | null>(null);

  useEffect(() => {
    async function charger() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from("memberships")
        .select("organisation_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        setChargement(false);
        return;
      }
      setOrganisationId(membership.organisation_id);

      const { data } = await supabase
        .from("parametres_entreprise")
        .select("*")
        .eq("organisation_id", membership.organisation_id)
        .maybeSingle();

      if (data) {
        setForm(data as FormState);
      }
      setChargement(false);
    }
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Le bucket "logos" est privé comme les photos de chantier : on génère
  // une URL signée temporaire pour l'aperçu plutôt que de le rendre public.
  useEffect(() => {
    async function chargerApercu() {
      if (!form.logo_url) {
        setLogoUrl(null);
        return;
      }
      const { data } = await supabase.storage
        .from("logos")
        .createSignedUrl(form.logo_url, 3600);
      setLogoUrl(data?.signedUrl ?? null);
    }
    chargerApercu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.logo_url]);

  async function changerLogo(fichier: File | null) {
    if (!fichier) return;
    setEnvoiLogo(true);
    setErreur(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErreur("Session expirée, reconnectez-vous.");
      setEnvoiLogo(false);
      return;
    }

    const chemin = `${user.id}/logo-${Date.now()}-${fichier.name}`;
    const { error } = await supabase.storage.from("logos").upload(chemin, fichier);

    setEnvoiLogo(false);

    if (error) {
      setErreur("Impossible d'envoyer le logo.");
      return;
    }

    // L'ancien fichier (s'il existe) reste dans le stockage mais n'est plus
    // référencé — sans conséquence pour un logo d'entreprise, et ça évite
    // un appel réseau supplémentaire pour le supprimer.
    setForm((f) => ({ ...f, logo_url: chemin }));
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  function update<K extends keyof FormState>(champ: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const brut = e.target.value;
      const estNumerique = typeof PARAMETRES_PAR_DEFAUT[champ] === "number";
      setForm({
        ...form,
        [champ]: estNumerique ? (brut === "" ? null : Number(brut)) : brut,
      });
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnregistrement(true);
    setConfirme(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !organisationId) {
      setErreur("Session expirée, reconnectez-vous.");
      setEnregistrement(false);
      return;
    }

    const erreurValidation = validerForm(form);
    if (erreurValidation) {
      setErreur(erreurValidation);
      setEnregistrement(false);
      return;
    }

    const { error } = await supabase
      .from("parametres_entreprise")
      .upsert(
        { organisation_id: organisationId, artisan_id: user.id, ...form },
        { onConflict: "organisation_id" }
      );

    setEnregistrement(false);

    if (error) {
      setErreur("Impossible d'enregistrer les paramètres.");
      return;
    }

    setConfirme(true);
  }

  if (chargement) {
    return <div className="p-8 text-sm text-ink/50">Chargement…</div>;
  }

  return (
    <div className="p-8 max-w-2xl">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-2">
        Paramètres
      </p>
      <h1 className="font-display text-2xl font-semibold">Paramètres</h1>

      <div className="mt-5 flex gap-2 border-b border-ink/10">
        {(["entreprise", "equipe", "compte"] as Onglet[]).map((o) => (
          <button
            key={o}
            onClick={() => setOnglet(o)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors duration-200 ${
              onglet === o
                ? "border-signal text-ink font-medium"
                : "border-transparent text-ink/50 hover:text-ink hover:border-ink/20"
            }`}
          >
            {o === "entreprise" ? "Mon entreprise" : o === "equipe" ? "Mon équipe" : "Mon compte"}
          </button>
        ))}
      </div>

      {onglet === "compte" ? (
        <div className="mt-6">
          <MonCompte />
        </div>
      ) : onglet === "equipe" ? (
        <div className="mt-6">
          <EquipeSection />
        </div>
      ) : (
        <>
      <p className="mt-6 text-sm text-ink/60">
        Ces valeurs sont utilisées automatiquement pour calculer chaque devis. Aucune IA
        n&apos;intervient dans ce calcul — vous gardez un contrôle total.
      </p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div>
            <h2 className="text-sm font-semibold text-ink/70 mb-4">Devis &amp; PDF</h2>
            <p className="text-xs text-ink/50 -mt-2 mb-4">
              Utilisés uniquement pour l&apos;export imprimé du devis — aucune IA n&apos;y touche.
            </p>
            <div className="flex items-center gap-4 mb-5">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo de l'entreprise"
                  className="w-16 h-16 rounded-xl object-contain border border-ink/10 bg-surface"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl grid place-items-center border border-dashed border-ink/15 text-[10px] text-ink/30 text-center">
                  Aucun logo
                </div>
              )}
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => changerLogo(e.target.files?.[0] ?? null)}
                  className="hidden"
                  id="logo-input"
                />
                <label
                  htmlFor="logo-input"
                  className="inline-flex items-center gap-2 rounded-xl border border-ink/15 text-sm px-4 py-2 transition-colors duration-200 hover:border-signal/30 hover:bg-ink/5 cursor-pointer"
                >
                  {envoiLogo ? "Envoi…" : logoUrl ? "Changer le logo" : "Ajouter un logo"}
                </label>
                <p className="mt-1.5 text-[11px] text-ink/40">Affiché en haut de chaque devis exporté.</p>
              </div>
            </div>
            <TextareaField
              label="Conditions générales (affichées en bas du devis)"
              rows={4}
              placeholder="Ex : Devis valable 30 jours. Acompte de 30% à la commande. TVA non applicable, art. 293B du CGI (le cas échéant)."
              value={form.conditions_generales ?? ""}
              onChange={(e) => setForm({ ...form, conditions_generales: e.target.value })}
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-ink/70 mb-4">Informations générales</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field
                label="Nom de l'entreprise"
                value={form.nom_entreprise ?? ""}
                onChange={update("nom_entreprise")}
              />
              <Field label="Adresse" value={form.adresse ?? ""} onChange={update("adresse")} />
              <Field
                label="Téléphone"
                type="tel"
                value={form.telephone ?? ""}
                onChange={update("telephone")}
              />
              <Field
                label="Email"
                type="email"
                value={form.email ?? ""}
                onChange={update("email")}
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-ink/70 mb-4">Informations légales</h2>
            <p className="text-xs text-ink/50 -mt-2 mb-4">
              Nécessaires uniquement pour émettre des factures (Module Factures) — un devis n&apos;en a pas besoin.
              Complétez-les avant votre première facture.
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="SIRET" value={form.siret ?? ""} onChange={update("siret")} placeholder="123 456 789 00012" />
              <Field
                label="Forme juridique"
                value={form.forme_juridique ?? ""}
                onChange={update("forme_juridique")}
                placeholder="Ex : Auto-entrepreneur, EURL, SARL…"
              />
              <Field
                label="N° TVA intracommunautaire"
                value={form.numero_tva_intracommunautaire ?? ""}
                onChange={update("numero_tva_intracommunautaire")}
                placeholder="FR00000000000"
              />
              <div className="flex items-end pb-2.5">
                <label className="flex items-center gap-2 text-sm text-ink/70">
                  <input
                    type="checkbox"
                    checked={form.mention_tva_non_applicable}
                    onChange={(e) => setForm({ ...form, mention_tva_non_applicable: e.target.checked })}
                    className="w-4 h-4 rounded border-ink/25 accent-signal"
                  />
                  Franchise en base de TVA (auto-entrepreneur)
                </label>
              </div>
              <Field
                label="Assurance décennale — compagnie"
                value={form.assurance_decennale_compagnie ?? ""}
                onChange={update("assurance_decennale_compagnie")}
              />
              <Field
                label="Assurance décennale — n° de police"
                value={form.assurance_decennale_police ?? ""}
                onChange={update("assurance_decennale_police")}
              />
              <Field
                label="IBAN (affiché sur les factures)"
                value={form.iban ?? ""}
                onChange={update("iban")}
                placeholder="FR76 0000 0000 0000 0000 0000 000"
              />
              <Field label="BIC" value={form.bic ?? ""} onChange={update("bic")} />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-ink/70 mb-4">Tarification</h2>
            <p className="text-xs text-ink/50 -mt-2 mb-4">
              Le coût journalier n&apos;est utilisé qu&apos;au-delà d&apos;une journée de travail
              estimée sur un même poste — sinon, c&apos;est le coût horaire qui s&apos;applique.
              Utile pour les gros chantiers (maçonnerie, toiture, charpente…) où le client
              raisonne au jour plutôt qu&apos;à l&apos;heure. Laissez-le vide pour toujours
              facturer à l&apos;heure.
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field
                label="TVA (%)"
                type="number"
                step="0.01"
                min={BORNES.tva_pct!.min}
                max={BORNES.tva_pct!.max}
                required
                value={form.tva_pct}
                onChange={update("tva_pct")}
              />
              <Field
                label="Coût horaire (€)"
                type="number"
                step="0.01"
                min={BORNES.cout_horaire!.min}
                max={BORNES.cout_horaire!.max}
                required
                value={form.cout_horaire}
                onChange={update("cout_horaire")}
              />
              <Field
                label="Coût journalier (€)"
                type="number"
                step="0.01"
                min={BORNES.cout_journalier!.min}
                max={BORNES.cout_journalier!.max}
                value={form.cout_journalier ?? ""}
                onChange={update("cout_journalier")}
              />
              <Field
                label="Marge par défaut (%)"
                type="number"
                step="0.01"
                min={BORNES.marge_defaut_pct!.min}
                max={BORNES.marge_defaut_pct!.max}
                required
                value={form.marge_defaut_pct}
                onChange={update("marge_defaut_pct")}
              />
              <Field
                label="Heures minimum facturables"
                type="number"
                step="0.5"
                min={BORNES.heures_min_facturables!.min}
                max={BORNES.heures_min_facturables!.max}
                required
                value={form.heures_min_facturables}
                onChange={update("heures_min_facturables")}
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-ink/70 mb-4">Déplacement</h2>
            <p className="text-xs text-ink/50 -mt-2 mb-4">
              Un forfait fixe, ajouté une fois par devis — pas de calcul de distance réelle
              pour l&apos;instant (ça demanderait de géolocaliser chaque chantier).
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field
                label="Forfait déplacement (€)"
                type="number"
                step="0.01"
                min={BORNES.forfait_deplacement!.min}
                max={BORNES.forfait_deplacement!.max}
                value={form.forfait_deplacement}
                onChange={update("forfait_deplacement")}
              />
            </div>
          </div>

          {erreur && <p className="text-sm text-signal">{erreur}</p>}
          {confirme && (
            <p className="text-sm text-steel">
              Paramètres enregistrés. Vos prochains devis les utiliseront automatiquement.
            </p>
          )}

          <Button type="submit" disabled={enregistrement} className="self-start">
            {enregistrement ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </Card>
        </>
      )}
    </div>
  );
}
