"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field, TextareaField } from "@/components/ui/Input";
import { PARAMETRES_PAR_DEFAUT } from "@/lib/moteur-metier/calculerDevis";
import { MonCompte } from "@/components/dashboard/MonCompte";
import { EquipeSection } from "@/components/dashboard/EquipeSection";
import { estEntrepreneurIndividuel } from "@/lib/devis/mentionsLegales";
import {
  BORNES,
  CHAMPS_NUMERIQUES,
  aCompleter,
  enregistrerParametres,
  type FormulaireParametres,
} from "@/lib/parametres";
import { IconeChevron } from "@/components/projet/icones";
import { Engagements } from "@/components/confiance/Engagements";

type FormState = FormulaireParametres;

// ============================================================
// Paramètres (26/09 — « moins mais mieux », lot F).
//
// Trente et un champs d'un seul tenant faisaient un mur. Chaque groupe est
// maintenant replié et ne montre que son état : « Complet », ou « 2 à
// compléter » (seulement ce que les devis et les factures utilisent — voir
// aCompleter dans lib/parametres). On ouvre un groupe pour le modifier.
// Aucun champ n'a été retiré. Les mentions obligatoires se complètent aussi
// directement depuis le devis (components/devis/CompletionMention.tsx),
// avec la même validation.
// Un groupe s'ouvre directement avec un lien : /dashboard/parametres#assurances.
// Le chargement est fait par app/dashboard/parametres/page.tsx.
// ============================================================

type Groupe = "entreprise" | "mentions" | "assurances" | "paiement" | "tarifs" | "conditions" | "equipe" | "compte";

export function VueParametres({
  initial,
  organisationId,
}: {
  initial: FormState | null;
  organisationId: string | null;
}) {
  const supabase = createClient();

  const [form, setForm] = useState<FormState>(initial ?? PARAMETRES_PAR_DEFAUT);
  // Ce qui est réellement enregistré : c'est lui qui donne l'état des
  // pastilles (une saisie non enregistrée n'est pas « complète »).
  const [enregistre, setEnregistre] = useState<FormState>(initial ?? PARAMETRES_PAR_DEFAUT);
  const [ouvert, setOuvert] = useState<Groupe | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [confirme, setConfirme] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [envoiLogo, setEnvoiLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Un lien vers un groupe (#mentions, #assurances…) l'ouvre directement.
  useEffect(() => {
    const ouvrirDepuisAncre = () => {
      const cible = window.location.hash.slice(1) as Groupe;
      if (cible) setOuvert(cible);
    };
    ouvrirDepuisAncre();
    window.addEventListener("hashchange", ouvrirDepuisAncre);
    return () => window.removeEventListener("hashchange", ouvrirDepuisAncre);
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
      const estNumerique = CHAMPS_NUMERIQUES.has(champ);
      setConfirme(false);
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

    const resultat = await enregistrerParametres(supabase, { organisationId, artisanId: user.id, form });
    setEnregistrement(false);
    if (resultat.erreur) {
      setErreur(resultat.erreur);
      return;
    }
    setEnregistre(form);
    setConfirme(true);
  }

  const manques = aCompleter(enregistre);
  const basculer = (g: Groupe) => {
    setErreur(null);
    setConfirme(false);
    setOuvert((o) => (o === g ? null : g));
  };
  const groupe = (g: Groupe, titre: string, manque: number | null, contenu: ReactNode) => (
    <GroupeReplie id={g} titre={titre} manque={manque} ouvert={ouvert === g} surBasculer={() => basculer(g)}>
      {contenu}
    </GroupeReplie>
  );

  // Le bouton d'un groupe du formulaire : il enregistre tout le formulaire,
  // comme avant (une saisie faite dans un autre groupe n'est pas perdue).
  const piedFormulaire = (
    <div className="mt-6 flex flex-col gap-3">
      {erreur && <p className="text-sm text-signal">{erreur}</p>}
      {confirme && <p className="text-sm text-steel">Enregistré. Vos prochains devis l&apos;utiliseront.</p>}
      <button
        type="submit"
        disabled={enregistrement}
        className="min-h-12 self-start rounded-xl bg-ink px-6 text-[15px] font-semibold text-paper transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
      >
        {enregistrement ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  );

  return (
    <div className="px-4 pt-5 pb-8 sm:p-8 max-w-2xl">
      <h1 className="font-display text-[1.6rem] font-semibold leading-tight text-ink sm:text-3xl">Paramètres</h1>

      <div className="mt-5 overflow-hidden rounded-2xl bg-surface ring-1 ring-ink/10">
      <form onSubmit={handleSubmit}>
        {groupe(
          "entreprise",
          "Entreprise",
          manques.entreprise,
          <>
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
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-ink/15 text-sm px-4 py-2 transition-colors duration-200 hover:border-signal/30 hover:bg-ink/5 cursor-pointer"
                >
                  {envoiLogo ? "Envoi…" : logoUrl ? "Changer le logo" : "Ajouter un logo"}
                </label>
                <p className="mt-1.5 text-[11px] text-ink/40">Affiché en haut de chaque devis exporté.</p>
              </div>
            </div>
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
            {piedFormulaire}
          </>
        )}

        {/* Corrigé le 17/09 : cette section annonçait "Nécessaires
            uniquement pour émettre des factures — un devis n'en a pas
            besoin". C'est faux, et dangereux : l'assurance décennale est
            obligatoire sur le devis, sous peine de 75 000 € d'amende
            (art. L243-3 du code des assurances). */}
        {groupe(
          "mentions",
          "Mentions légales",
          manques.mentions,
          <>
            <p className="text-xs text-ink/50 mb-4">Imprimées sur chaque devis et chaque facture. À remplir une seule fois.</p>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field
                label="Forme juridique"
                value={form.forme_juridique ?? ""}
                onChange={update("forme_juridique")}
                placeholder="Ex : Micro-entrepreneur, EURL, SARL…"
              />
              <Field label="SIRET" value={form.siret ?? ""} onChange={update("siret")} placeholder="123 456 789 00012" />
              {/* RCS et capital ne concernent que les sociétés : masqués pour
                  un entrepreneur individuel, pour ne pas lui faire croire
                  qu'il lui manque quelque chose. */}
              {!estEntrepreneurIndividuel(form.forme_juridique) && (
                <>
                  <Field
                    label="Capital social (€)"
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.capital_social ?? ""}
                    onChange={update("capital_social")}
                  />
                  <Field
                    label="N° RCS"
                    value={form.rcs_numero ?? ""}
                    onChange={update("rcs_numero")}
                    placeholder="123 456 789"
                  />
                  <Field
                    label="Ville du greffe (RCS)"
                    value={form.rcs_ville ?? ""}
                    onChange={update("rcs_ville")}
                    placeholder="Lyon"
                  />
                </>
              )}
              <Field
                label="N° au Répertoire des Métiers"
                value={form.rm_numero ?? ""}
                onChange={update("rm_numero")}
                placeholder="Si vous êtes artisan"
              />
              <Field
                label="N° TVA intracommunautaire"
                value={form.numero_tva_intracommunautaire ?? ""}
                onChange={update("numero_tva_intracommunautaire")}
                placeholder="FR00000000000"
              />
              <div className="flex items-end pb-2.5">
                <label className="flex min-h-12 items-center gap-2 text-sm text-ink/70">
                  <input
                    type="checkbox"
                    checked={form.mention_tva_non_applicable}
                    // 21/09 — En franchise, pas de TVA : le taux passe à 0 %
                    // avec la case, et revient à 20 % quand on la décoche
                    // (s'il était resté à 0). Le devis applique de toute
                    // façon 0 % en franchise (voir calculerDevis), mais un
                    // champ « TVA 20 % » à côté de la case cochée semait le
                    // doute.
                    onChange={(e) => {
                      const franchise = e.target.checked;
                      setConfirme(false);
                      setForm({
                        ...form,
                        mention_tva_non_applicable: franchise,
                        tva_pct: franchise ? 0 : form.tva_pct === 0 ? 20 : form.tva_pct,
                      });
                    }}
                    className="w-5 h-5 rounded border-ink/25 accent-signal"
                  />
                  Franchise en base de TVA (art. 293 B du CGI)
                </label>
              </div>
            </div>
            {estEntrepreneurIndividuel(form.forme_juridique) && (
              <p className="mt-3 text-xs text-ink/50">
                Entrepreneur individuel : la mention « EI » sera ajoutée automatiquement à côté de
                votre nom, comme la loi l&apos;exige.
              </p>
            )}

            <h3 className="mt-7 text-sm font-semibold text-ink/70 mb-1">Médiateur de la consommation</h3>
            <p className="text-xs text-ink/50 mb-4">
              Obligatoire dès que vous travaillez pour des particuliers : vous devez adhérer à un
              médiateur et l&apos;indiquer sur vos devis. Si ce n&apos;est pas encore fait, votre
              fédération professionnelle peut vous en indiquer un.
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field
                label="Nom du médiateur"
                value={form.mediateur_nom ?? ""}
                onChange={update("mediateur_nom")}
              />
              <Field
                label="Site internet du médiateur"
                value={form.mediateur_url ?? ""}
                onChange={update("mediateur_url")}
                placeholder="www.exemple-mediation.fr"
              />
            </div>
            {piedFormulaire}
          </>
        )}

        {groupe(
          "assurances",
          "Assurances",
          manques.assurances,
          <>
            <p className="text-xs text-ink/50 mb-4">
              Obligatoires sur vos devis et vos factures — avec l&apos;assureur <em>et</em> la zone
              couverte. Leur absence est la mention la plus sanctionnée du bâtiment.
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field
                label="Décennale — assureur"
                value={form.assurance_decennale_compagnie ?? ""}
                onChange={update("assurance_decennale_compagnie")}
              />
              <Field
                label="Décennale — n° de police"
                value={form.assurance_decennale_police ?? ""}
                onChange={update("assurance_decennale_police")}
              />
              <Field
                label="Décennale — zone couverte"
                value={form.assurance_decennale_zone ?? ""}
                onChange={update("assurance_decennale_zone")}
                placeholder="Ex : France métropolitaine"
              />
              <div className="hidden sm:block" />
              <Field
                label="RC Pro — assureur"
                value={form.rc_pro_compagnie ?? ""}
                onChange={update("rc_pro_compagnie")}
              />
              <Field
                label="RC Pro — zone couverte"
                value={form.rc_pro_zone ?? ""}
                onChange={update("rc_pro_zone")}
                placeholder="Ex : France métropolitaine"
              />
            </div>
            {piedFormulaire}
          </>
        )}

        {groupe(
          "paiement",
          "Paiement et banque",
          manques.paiement,
          <>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field
                label="Moyens de paiement acceptés"
                value={form.moyens_paiement ?? ""}
                onChange={update("moyens_paiement")}
                placeholder="Ex : virement, chèque"
              />
              <div className="hidden sm:block" />
              <Field
                label="IBAN (affiché sur les factures)"
                value={form.iban ?? ""}
                onChange={update("iban")}
                placeholder="FR76 0000 0000 0000 0000 0000 000"
              />
              <Field label="BIC" value={form.bic ?? ""} onChange={update("bic")} />
            </div>
            {piedFormulaire}
          </>
        )}

        {groupe(
          "tarifs",
          "Tarifs",
          0,
          <>
            <p className="text-xs text-ink/50 mb-4">
              Utilisés pour calculer chaque devis, sans IA. Le coût journalier ne s&apos;applique
              qu&apos;au-delà d&apos;une journée de travail sur un même poste ; laissez-le vide pour
              toujours facturer à l&apos;heure.
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <Field
                  label="TVA (%)"
                  type="number"
                  step="0.01"
                  min={BORNES.tva_pct!.min}
                  max={BORNES.tva_pct!.max}
                  required
                  value={form.tva_pct}
                  onChange={update("tva_pct")}
                  disabled={form.mention_tva_non_applicable}
                />
                {form.mention_tva_non_applicable && (
                  <p className="mt-1.5 text-xs text-ink/50">
                    Franchise en base de TVA : vos devis et factures sont sans TVA.
                  </p>
                )}
              </div>
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
              {/* Un forfait fixe, ajouté une fois par devis — pas de calcul
                  de distance réelle pour l'instant (ça demanderait de
                  géolocaliser chaque chantier). */}
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
            {piedFormulaire}
          </>
        )}

        {groupe(
          "conditions",
          "Conditions générales",
          0,
          <>
            <p className="text-xs text-ink/50 mb-4">
              Chaque nouveau devis part avec ces valeurs — vous pouvez toujours les changer devis par devis.
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field
                label="Validité des devis (jours)"
                type="number"
                step="1"
                min={BORNES.devis_validite_jours!.min}
                max={BORNES.devis_validite_jours!.max}
                required
                value={form.devis_validite_jours ?? ""}
                onChange={update("devis_validite_jours")}
              />
              <Field
                label="Acompte demandé (%)"
                type="number"
                step="1"
                min={BORNES.devis_acompte_pct!.min}
                max={BORNES.devis_acompte_pct!.max}
                value={form.devis_acompte_pct ?? ""}
                onChange={update("devis_acompte_pct")}
                placeholder="Ex : 30"
              />
            </div>
            <div className="mt-5">
              <TextareaField
                label="Conditions générales (affichées en bas du devis)"
                rows={4}
                placeholder="Ex : garanties, service après-vente, conditions d'accès au chantier… (la validité, l'acompte et les mentions obligatoires sont déjà ajoutés automatiquement)"
                value={form.conditions_generales ?? ""}
                onChange={(e) => {
                  setConfirme(false);
                  setForm({ ...form, conditions_generales: e.target.value });
                }}
              />
            </div>
            {piedFormulaire}
          </>
        )}

      </form>
        {/* Hors du formulaire de l'entreprise : chacun a ses propres
            formulaires (inviter, enregistrer mon profil…). */}
        {groupe("equipe", "Équipe", null, <EquipeSection />)}
        {groupe(
          "compte",
          "Mon compte",
          null,
          <>
            {/* Lot G — en haut de Mon compte, derrière son drapeau. */}
            <Engagements className="mb-5" />
            <MonCompte />
          </>
        )}
      </div>
    </div>
  );
}

function GroupeReplie({
  id,
  titre,
  manque,
  ouvert,
  surBasculer,
  children,
}: {
  id: Groupe;
  titre: string;
  /** null : pas d'état à afficher (équipe, compte). */
  manque: number | null;
  ouvert: boolean;
  surBasculer: () => void;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-ink/[0.07] [form>&:first-child]:border-t-0">
      <h2>
        <button
          type="button"
          onClick={surBasculer}
          aria-expanded={ouvert}
          aria-controls={`groupe-${id}`}
          className="flex w-full min-h-14 items-center gap-3 px-4 text-left transition-colors hover:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal/50 sm:px-5"
        >
          <span className="min-w-0 flex-1 text-[16px] font-medium text-ink">{titre}</span>
          {manque !== null &&
            (manque === 0 ? (
              <span className="shrink-0 rounded-full bg-succes/12 px-2.5 py-1 text-[12.5px] font-medium text-succes">Complet</span>
            ) : (
              <span className="shrink-0 rounded-full bg-alerte-orange/15 px-2.5 py-1 text-[12.5px] font-medium text-alerte-orange">
                {manque} à compléter
              </span>
            ))}
          <IconeChevron className={`h-4 w-4 shrink-0 text-ink/40 motion-safe:transition-transform ${ouvert ? "rotate-90" : ""}`} />
        </button>
      </h2>
      {ouvert && (
        <div id={`groupe-${id}`} className="px-4 pb-6 pt-1 sm:px-5">
          {children}
        </div>
      )}
    </section>
  );
}
