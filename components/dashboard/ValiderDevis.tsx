"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { enregistrerEvenement } from "@/lib/timeline";
import { getOrganisationId } from "@/lib/organisation";
import { recalculerDevis, genererMentionTvaReduite } from "@/lib/moteur-metier/calculerDevis";
import { lignesDeVente } from "@/lib/moteur-metier/prixDeVente";
import { obtenirPostesFrequents, type PosteFrequent } from "@/lib/postesFrequents";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, TextareaField } from "@/components/ui/Input";
import { estColonneManquante, MESSAGE_BASE_PAS_A_JOUR } from "@/lib/supabase/erreurs";
import type { Devis, LigneDevisCalculee, ParametresEntreprise } from "@/types";

function formatEuros(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

// Même garde-fou que pour quantité/prix unitaire (voir modifierLigne) :
// un déplacement, une marge ou une TVA négative passerait le contrôle
// final "total_ttc <= 0" tant que le total reste positif, réduisant
// silencieusement le montant réellement envoyé au client sans aucun
// avertissement — on refuse donc la saisie négative dès la source.
function valeurPositive(valeur: string): number {
  const nombre = Number(valeur);
  return !Number.isFinite(nombre) || nombre < 0 ? 0 : nombre;
}

// Étape intermédiaire entre "l'IA + le moteur métier ont préparé un
// brouillon" et "le PDF part au client". L'artisan relit, ajuste
// chaque ligne si besoin, et valide explicitement — jamais d'export
// PDF généré directement depuis un brouillon non relu.
export function ValiderDevis({
  devis,
  demandeId,
  artisanId,
  parametres,
  adresseClient,
  onValide,
}: {
  devis: Devis;
  demandeId: string;
  artisanId: string;
  parametres?: ParametresEntreprise | null;
  adresseClient?: string | null;
  onValide: () => void;
}) {
  const supabase = createClient();

  const [lignes, setLignes] = useState<LigneDevisCalculee[]>(devis.lignes);
  // Audit pré-bêta (09/09), point 🟡 n°19 — aucun repère ne distinguait un
  // poste généré par l'IA (déjà là au chargement, ou accepté depuis
  // "Postes probablement oubliés" — même origine, juste accepté un instant
  // plus tard) d'un poste ajouté par l'artisan lui-même (ligne vide, ou
  // repris de ses postes fréquents). Tableau parallèle à `lignes`, TOUJOURS
  // mis à jour aux mêmes endroits (ajout/suppression) — jamais sur
  // modifierLigne, qui ne change ni la longueur ni l'ordre du tableau.
  // Purement un repère visuel côté client, jamais persisté (voir
  // validerDevis, qui n'écrit que `lignes`).
  const [origineManuelle, setOrigineManuelle] = useState<boolean[]>(() => devis.lignes.map(() => false));
  const [deplacement, setDeplacement] = useState(devis.deplacement);
  const [margePct, setMargePct] = useState(devis.marge_pct);
  const [tvaPct, setTvaPct] = useState(devis.tva_pct);
  const [commentaires, setCommentaires] = useState(devis.commentaires ?? "");

  // Conditions de l'offre (Module 42). Un devis créé depuis le 17/09 arrive
  // déjà rempli (voir conditionsParDefaut) ; pour un devis plus ancien, on
  // retombe sur les paramètres de l'entreprise, pour que l'artisan n'ait
  // jamais de champ vide à remplir de lui-même.
  const [objet, setObjet] = useState(devis.objet ?? "");
  const [validiteJours, setValiditeJours] = useState<string>(
    String(devis.validite_jours ?? parametres?.devis_validite_jours ?? 30)
  );
  const [acomptePct, setAcomptePct] = useState<string>(
    devis.acompte_pct != null
      ? String(devis.acompte_pct)
      : parametres?.devis_acompte_pct != null
        ? String(parametres.devis_acompte_pct)
        : ""
  );
  const [dateDebut, setDateDebut] = useState(devis.date_debut_prevue ?? "");
  const [dureeEstimee, setDureeEstimee] = useState(devis.duree_estimee ?? "");
  // L'adresse du chantier n'est obligatoire que si elle diffère de celle du
  // client : le champ reste masqué tant que l'artisan ne dit pas le
  // contraire, pour éviter une saisie inutile dans la plupart des cas.
  const [chantierAilleurs, setChantierAilleurs] = useState(Boolean(devis.adresse_chantier));
  const [adresseChantier, setAdresseChantier] = useState(devis.adresse_chantier ?? "");
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Mention TVA réduite (08/09) — suggérée automatiquement si le devis a
  // déjà un taux réduit au chargement, sinon vide. Reste éditable, et se
  // met à jour automatiquement UNIQUEMENT si l'artisan change le taux de
  // TVA lui-même et n'a encore rien tapé — jamais écrasée une fois modifiée
  // à la main (voir gestionnaireTvaPct plus bas).
  const [mentionTvaReduite, setMentionTvaReduite] = useState(
    devis.mention_tva_reduite ?? genererMentionTvaReduite(devis.tva_pct) ?? ""
  );
  const [mentionModifieeManuellement, setMentionModifieeManuellement] = useState(
    Boolean(devis.mention_tva_reduite)
  );

  function gestionnaireTvaPct(valeur: number) {
    setTvaPct(valeur);
    if (!mentionModifieeManuellement) {
      setMentionTvaReduite(genererMentionTvaReduite(valeur) ?? "");
    }
  }

  // Anti-oubli (06/09) — suggestions détectées à la génération, déjà
  // chiffrées par le même moteur déterministe que le reste du devis (voir
  // app/api/ai/generer-devis/route.ts). État local uniquement : "Ignorer"
  // fait juste disparaître la suggestion de cet écran, "Ajouter au devis"
  // la déplace dans les lignes normales, éditable comme n'importe quelle
  // autre. Ne survit pas à un rechargement de page une fois traité — la
  // colonne suggestions_oublis en base garde son contenu d'origine, sans
  // conséquence puisque ce bloc ne s'affiche que sur un devis "brouillon".
  const [suggestionsRestantes, setSuggestionsRestantes] = useState<LigneDevisCalculee[]>(
    devis.suggestions_oublis ?? []
  );

  // Postes fréquents (08/09) — voir lib/postesFrequents.ts : les propres
  // postes déjà utilisés par cet artisan dans ses devis récents, pas une
  // bibliothèque de prix générique. Chargé une fois au montage, best-effort
  // (une liste vide en cas d'échec ne doit jamais bloquer la validation du
  // devis, qui reste l'action principale de cet écran).
  const [postesFrequents, setPostesFrequents] = useState<PosteFrequent[]>([]);

  useEffect(() => {
    let annule = false;
    (async () => {
      const organisationId = await getOrganisationId(supabase, artisanId);
      if (!organisationId || annule) return;
      const postes = await obtenirPostesFrequents(supabase, organisationId, demandeId);
      if (!annule) setPostesFrequents(postes);
    })();
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ajouterPosteFrequent(poste: PosteFrequent) {
    setLignes((prev) => [
      ...prev,
      {
        description: poste.description,
        categorie: poste.categorie,
        quantite: 1,
        unite: poste.unite,
        prix_unitaire: poste.prix_unitaire,
        total: poste.prix_unitaire,
        detail_calcul: `Prix repris de votre dernière utilisation — à ajuster si besoin`,
      },
    ]);
    setOrigineManuelle((prev) => [...prev, true]);
  }

  function ajouterSuggestion(index: number) {
    setSuggestionsRestantes((prev) => {
      const suggestion = prev[index];
      setLignes((l) => [...l, suggestion]);
      // Origine IA, pas manuelle : cette ligne vient de l'anti-oubli
      // (postes_oublies_probables), simplement acceptée un instant après
      // la génération plutôt qu'au premier chargement.
      setOrigineManuelle((o) => [...o, false]);
      return prev.filter((_, i) => i !== index);
    });
  }

  function ignorerSuggestion(index: number) {
    setSuggestionsRestantes((prev) => prev.filter((_, i) => i !== index));
  }

  const totaux = useMemo(
    () => recalculerDevis(lignes, deplacement, margePct, tvaPct),
    [lignes, deplacement, margePct, tvaPct]
  );

  function modifierLigne(index: number, champ: keyof LigneDevisCalculee, valeur: string) {
    setLignes((prev) =>
      prev.map((ligne, i) => {
        if (i !== index) return ligne;
        if (champ === "quantite" || champ === "prix_unitaire") {
          const nombre = Number(valeur);
          // On refuse les valeurs négatives ou non numériques dès la saisie :
          // une quantité ou un prix négatif produirait une ligne qui
          // "réduit" silencieusement le devis sans aucun signalement visuel.
          const valeurSure = !Number.isFinite(nombre) || nombre < 0 ? 0 : nombre;
          const majee = { ...ligne, [champ]: valeurSure };
          majee.total = Math.round(majee.quantite * majee.prix_unitaire * 100) / 100;
          return majee;
        }
        return { ...ligne, [champ]: valeur };
      })
    );
  }

  function supprimerLigne(index: number) {
    setLignes((prev) => prev.filter((_, i) => i !== index));
    setOrigineManuelle((prev) => prev.filter((_, i) => i !== index));
  }

  function ajouterLigne() {
    setLignes((prev) => [
      ...prev,
      {
        description: "",
        categorie: "forfait",
        quantite: 1,
        unite: "forfait",
        prix_unitaire: 0,
        total: 0,
        detail_calcul: "Ligne ajoutée manuellement",
      },
    ]);
    setOrigineManuelle((prev) => [...prev, true]);
  }

  async function validerDevis() {
    setErreur(null);

    // Un devis sans ligne (tout supprimé par erreur) ou à 0€ n'a rien à
    // faire chez un client — mieux vaut le dire clairement maintenant que
    // de laisser l'artisan l'envoyer sans s'en apercevoir.
    if (lignes.length === 0) {
      setErreur("Ajoutez au moins une ligne avant de valider ce devis.");
      return;
    }
    const ligneSansDescription = lignes.some((l) => !l.description.trim());
    if (ligneSansDescription) {
      setErreur("Une ligne n'a pas de description — complétez-la avant de valider.");
      return;
    }
    // "<= 0" ne suffit pas : NaN <= 0 vaut false en JavaScript, donc un
    // total corrompu passerait ce contrôle. On vérifie explicitement que
    // le total est un nombre fini.
    if (!Number.isFinite(totaux.total_ttc) || totaux.total_ttc <= 0) {
      setErreur("Le total du devis est à 0 € (ou invalide) — vérifiez les prix unitaires avant de valider.");
      return;
    }

    const validite = validiteJours.trim() === "" ? null : Number(validiteJours);
    if (validite !== null && (!Number.isInteger(validite) || validite < 1 || validite > 365)) {
      setErreur("La durée de validité doit être un nombre de jours entre 1 et 365.");
      return;
    }
    const acompte = acomptePct.trim() === "" ? null : Number(acomptePct);
    if (acompte !== null && (!Number.isFinite(acompte) || acompte < 0 || acompte > 100)) {
      setErreur("L'acompte doit être un pourcentage entre 0 et 100.");
      return;
    }
    if (chantierAilleurs && !adresseChantier.trim()) {
      setErreur("Indiquez l'adresse du chantier, ou décochez « Le chantier est à une autre adresse ».");
      return;
    }

    setEnregistrement(true);

    // Les lignes telles que le client les lira, figées avec le reste
    // (Module 42) : c'est tout ce que la page de signature reçoit.
    const lignesVente = lignesDeVente({
      lignes,
      deplacement: totaux.deplacement,
      marge_pct: totaux.marge_pct,
      total_estime: totaux.total_ttc,
      montant_tva: totaux.montant_tva,
    });

    const { error } = await supabase
      .from("devis")
      .update({
        lignes,
        lignes_vente: lignesVente,
        sous_total_ht: totaux.sous_total_ht,
        deplacement: totaux.deplacement,
        marge_pct: totaux.marge_pct,
        tva_pct: totaux.tva_pct,
        montant_tva: totaux.montant_tva,
        total_estime: totaux.total_ttc,
        commentaires: commentaires || null,
        mention_tva_reduite: totaux.tva_pct !== 20 ? mentionTvaReduite.trim() || null : null,
        objet: objet.trim() || null,
        adresse_chantier: chantierAilleurs ? adresseChantier.trim() : null,
        validite_jours: validite,
        date_debut_prevue: dateDebut || null,
        duree_estimee: dureeEstimee.trim() || null,
        acompte_pct: acompte,
        statut: "a_valider",
      })
      .eq("id", devis.id);

    setEnregistrement(false);

    if (error) {
      console.error("Validation du devis :", error);
      setErreur(
        estColonneManquante(error)
          ? MESSAGE_BASE_PAS_A_JOUR
          : "Impossible d'enregistrer les modifications. Réessayez."
      );
      return;
    }

    const organisationId = await getOrganisationId(supabase, artisanId);
    if (organisationId) {
      await enregistrerEvenement(supabase, {
        demandeId,
        artisanId,
        organisationId,
        type: "devis_valide",
        titre: "Devis validé",
        detail: `${formatEuros(totaux.total_ttc)} TTC`,
      });
    }

    onValide();
  }

  return (
    <Card className="mt-4 p-6">
      {/* Renommé le 17/09 (audit des écarts concurrents, §6) : "Validation
          du devis" disait "relis et confirme", pas "modifie". Axel lui-même,
          qui a construit l'écran, en avait conclu qu'on ne pouvait rien y
          écrire — aucun artisan ne l'aurait découvert seul. */}
      <p className="text-xs font-medium text-ink/50 uppercase tracking-wider mb-1">
        Modifier le devis
      </p>
      <p className="text-xs text-ink/40 mb-5">
        Changez tout ce que vous voulez : lignes, prix, conditions. Rien n&apos;est envoyé au
        client avant que vous validiez.
      </p>

      <div className="mb-5">
        <TextareaField
          label="Objet des travaux"
          rows={2}
          value={objet}
          onChange={(e) => setObjet(e.target.value)}
          placeholder="Ex : Rénovation de la salle de bain avec pose d'une douche à l'italienne."
        />
        <p className="mt-1.5 text-[11px] text-ink/40">
          La première phrase que lit votre client, avant le détail chiffré.
        </p>
      </div>

      {/* Passe visuelle (10/09), guidée par la recherche terrain sur la
          charge mentale des artisans BTP : le Total TTC — le chiffre le
          plus important de tout cet écran, celui qui permet un premier
          "ça a l'air correct" — était auparavant tout en bas, après
          chaque ligne éditable. Un artisan fatigué qui relit un devis le
          soir doit pouvoir le voir en un coup d'œil AVANT de dérouler le
          détail, sans que ce détail (le vrai garde-fou anti-erreur) soit
          raccourci ou retiré pour autant — il reste identique plus bas.
          Recalculé en direct (useMemo totaux) à chaque modification. */}
      <div className="mb-5 rounded-2xl border border-ink/10 bg-paper-warm px-4 py-3.5 flex items-center justify-between">
        <span className="text-xs text-ink/50">Total TTC (mis à jour en direct)</span>
        <span className="font-mono text-xl font-semibold">{formatEuros(totaux.total_ttc)}</span>
      </div>

      {devis.parametres_configures === false && (
        <div className="mb-5 rounded-xl border border-signal/25 bg-signal/5 px-4 py-3">
          <p className="text-sm font-medium text-signal">
            Paramètres d&apos;entreprise non configurés
          </p>
          <p className="mt-1 text-xs text-ink/60">
            Ce devis a été chiffré avec des valeurs par défaut (tarif horaire, marge, TVA) —
            vérifiez qu&apos;elles correspondent bien aux vôtres avant de l&apos;envoyer, ou{" "}
            <a
              href="/dashboard/parametres"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-signal"
            >
              configurez votre entreprise
            </a>{" "}
            puis régénérez-le.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {lignes.map((ligne, i) => (
          <div
            key={i}
            className="rounded-xl border border-ink/10 p-3 transition-colors hover:border-ink/20"
          >
            <div className="flex items-start gap-2">
              {/* Audit pré-bêta (09/09), point 🟡 n°19 — badge discret,
                  affiché uniquement sur les postes générés par l'IA (les
                  seuls qui méritent vraiment une relecture attentive) plutôt
                  que sur les deux catégories, pour rester lisible. */}
              {!origineManuelle[i] && (
                <span
                  title="Poste généré par l'IA — à relire"
                  className="shrink-0 mt-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-signal/10 text-signal"
                >
                  IA
                </span>
              )}
              {/* Audit pré-bêta (09/09), point 🟡 n°20 — le basculement
                  heures→jour (voir SEUIL_HEURES_JOURNEE, calculerDevis.ts)
                  n'était mentionné que dans le petit texte gris de
                  detail_calcul, facile à ne pas lire en diagonale. Repère
                  visuel au même endroit que le badge IA ci-dessus. */}
              {ligne.unite === "jour" && (
                <span
                  title="Poste facturé au tarif journalier plutôt qu'horaire"
                  className="shrink-0 mt-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-steel/10 text-steel"
                >
                  JOUR
                </span>
              )}
              <input
                value={ligne.description}
                onChange={(e) => modifierLigne(i, "description", e.target.value)}
                placeholder="Description du poste"
                className="flex-1 rounded-xl border border-ink/15 bg-paper px-2.5 py-1.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
              />
              <button
                type="button"
                onClick={() => supprimerLigne(i)}
                className="shrink-0 w-8 h-8 grid place-items-center rounded-xl text-ink/40 border border-ink/10 transition-colors hover:text-signal hover:border-signal/30"
                title="Supprimer cette ligne"
              >
                ✕
              </button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-ink/40 mb-1">Quantité</label>
                <input
                  type="number"
                  step="0.01"
                  value={ligne.quantite}
                  onChange={(e) => modifierLigne(i, "quantite", e.target.value)}
                  className="w-full rounded-xl border border-ink/15 bg-paper px-2 py-1.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
                />
              </div>
              <div>
                <label className="block text-[10px] text-ink/40 mb-1">Unité</label>
                <input
                  value={ligne.unite}
                  onChange={(e) => modifierLigne(i, "unite", e.target.value)}
                  className="w-full rounded-xl border border-ink/15 bg-paper px-2 py-1.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
                />
              </div>
              <div>
                <label className="block text-[10px] text-ink/40 mb-1">Prix unitaire (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={ligne.prix_unitaire}
                  onChange={(e) => modifierLigne(i, "prix_unitaire", e.target.value)}
                  className="w-full rounded-xl border border-ink/15 bg-paper px-2 py-1.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
                />
              </div>
            </div>
            <p className="mt-2 text-right font-mono text-sm">{formatEuros(ligne.total)}</p>
          </div>
        ))}
      </div>

      {/* Remonté et rendu visible le 13/09 — c'était un minuscule lien gris
          souligné, placé APRÈS les raccourcis, alors que les suggestions de
          l'IA, elles, avaient de vrais boutons. Axel en a conclu qu'on ne
          pouvait pas ajouter sa propre ligne et qu'on ne pouvait
          qu'accepter ce que l'IA proposait — exactement l'inverse de ce que
          doit faire cet écran, où l'artisan décide. */}
      <button
        type="button"
        onClick={ajouterLigne}
        className="mt-3 w-full rounded-xl border border-dashed border-ink/25 px-4 py-3 text-sm font-medium text-ink/70 transition-colors hover:border-signal hover:text-signal"
      >
        + Ajouter une ligne
      </button>

      {postesFrequents.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-medium text-ink/40 uppercase tracking-wider mb-2">
            Vos postes fréquents — un clic pour ajouter
          </p>
          <div className="flex flex-wrap gap-2">
            {postesFrequents.map((poste, i) => (
              <button
                key={`${poste.description}-${i}`}
                type="button"
                onClick={() => ajouterPosteFrequent(poste)}
                title={`Déjà utilisé ${poste.nb_utilisations} fois — ${formatEuros(poste.prix_unitaire)}`}
                className="rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink/70 transition-colors hover:border-signal/40 hover:text-signal"
              >
                + {poste.description}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 pt-5 border-t border-ink/10 grid sm:grid-cols-3 gap-4">
        <Field
          label="Déplacement (€)"
          type="number"
          step="0.01"
          min={0}
          value={deplacement}
          onChange={(e) => setDeplacement(valeurPositive(e.target.value))}
        />
        <Field
          label="Marge (%)"
          type="number"
          step="0.01"
          min={0}
          value={margePct}
          onChange={(e) => setMargePct(valeurPositive(e.target.value))}
        />
        <Field
          label="TVA (%)"
          type="number"
          step="0.01"
          min={0}
          value={tvaPct}
          onChange={(e) => gestionnaireTvaPct(valeurPositive(e.target.value))}
        />
      </div>

      <div className="mt-6 pt-5 border-t border-ink/10">
        <p className="text-xs font-medium text-ink/50 uppercase tracking-wider mb-1">
          Conditions de l&apos;offre
        </p>
        <p className="text-xs text-ink/40 mb-4">
          Reprises de vos paramètres — modifiables pour ce devis seulement.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Validité (jours)"
            type="number"
            step="1"
            min={1}
            max={365}
            value={validiteJours}
            onChange={(e) => setValiditeJours(e.target.value)}
          />
          <Field
            label="Acompte à la signature (%)"
            type="number"
            step="1"
            min={0}
            max={100}
            value={acomptePct}
            onChange={(e) => setAcomptePct(e.target.value)}
            placeholder="Aucun"
          />
          <Field
            label="Début des travaux prévu"
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
          />
          <Field
            label="Durée estimée"
            value={dureeEstimee}
            onChange={(e) => setDureeEstimee(e.target.value)}
            placeholder="Ex : 3 jours"
          />
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={chantierAilleurs}
            onChange={(e) => setChantierAilleurs(e.target.checked)}
            className="w-4 h-4 rounded border-ink/25 accent-signal"
          />
          Le chantier est à une autre adresse que celle du client
        </label>
        {chantierAilleurs && (
          <div className="mt-3">
            <Field
              label="Adresse du chantier"
              value={adresseChantier}
              onChange={(e) => setAdresseChantier(e.target.value)}
              placeholder={adresseClient ? `Différente de : ${adresseClient}` : "Adresse complète"}
            />
          </div>
        )}
      </div>

      {tvaPct !== 20 && (
        <div className="mt-5">
          <TextareaField
            label="Mention TVA réduite (visible sur le devis puis la facture)"
            rows={3}
            value={mentionTvaReduite}
            onChange={(e) => {
              setMentionTvaReduite(e.target.value);
              setMentionModifieeManuellement(true);
            }}
          />
          <p className="mt-1.5 text-[11px] text-ink/40 leading-relaxed">
            Texte suggéré à titre indicatif — la formulation officielle exacte n&apos;est pas
            garantie, à vérifier avec votre comptable avant un premier envoi.
          </p>
        </div>
      )}

      <div className="mt-5">
        <TextareaField
          label="Commentaires (optionnel, visible sur le devis)"
          rows={2}
          value={commentaires}
          onChange={(e) => setCommentaires(e.target.value)}
        />
      </div>

      <div className="mt-6 pt-5 border-t border-ink/10 text-sm space-y-1.5">
        <div className="flex items-center justify-between text-ink/60">
          <span>Sous-total HT</span>
          <span className="font-mono">{formatEuros(totaux.sous_total_ht)}</span>
        </div>
        <div className="flex items-center justify-between text-ink/60">
          <span>Déplacement</span>
          <span className="font-mono">{formatEuros(totaux.deplacement)}</span>
        </div>
        {/* Audit "vérification systématique" (10/09) — cette ligne
            manquait ici alors que DevisPreview.tsx l'affiche déjà : sans
            elle, Sous-total HT + Déplacement + TVA ne fait PAS le Total
            TTC affiché juste en dessous (l'écart, c'est la marge) — un
            artisan qui vérifie le calcul à la main sur cet écran précis
            tombait sur un total qu'il ne pouvait pas reconstituer. */}
        <div className="flex items-center justify-between text-ink/60">
          <span>Marge ({totaux.marge_pct}%)</span>
          <span className="font-mono">{formatEuros(totaux.montant_marge)}</span>
        </div>
        <div className="flex items-center justify-between text-ink/60">
          <span>TVA ({totaux.tva_pct}%)</span>
          <span className="font-mono">{formatEuros(totaux.montant_tva)}</span>
        </div>
        <div className="flex items-center justify-between font-semibold pt-2 border-t border-ink/10">
          <span>Total TTC</span>
          <span className="font-mono text-lg">{formatEuros(totaux.total_ttc)}</span>
        </div>
        {/* 17/09 — les prix saisis ici sont vos prix de revient ; le
            client, lui, lit des prix marge incluse (voir prixDeVente.ts).
            Sans cette phrase, l'écart entre les deux écrans surprendrait. */}
        <p className="pt-2 text-[11px] text-ink/40 leading-relaxed">
          Vous saisissez vos prix de revient. Sur le devis du client, la marge est
          répartie dans le prix de chaque ligne et le déplacement apparaît en ligne à
          part : il ne voit jamais votre marge, et ses lignes tombent juste sur le total.
        </p>
      </div>

      {suggestionsRestantes.length > 0 && (
        <div className="mt-6 pt-5 border-t border-ink/10">
          <p className="text-xs font-medium text-ink/50 uppercase tracking-wider mb-1">
            Postes probablement oubliés
          </p>
          <p className="text-xs text-ink/40 mb-3">
            Déjà chiffrés selon vos paramètres — à vous de juger si c&apos;est pertinent ici.
          </p>
          <div className="flex flex-col gap-2">
            {suggestionsRestantes.map((s, i) => (
              <div
                key={`${s.description}-${i}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-paper px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink/80 truncate">{s.description}</p>
                  <p className="text-xs text-ink/40 font-mono">{formatEuros(s.total)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => ajouterSuggestion(i)}
                    className="text-xs font-medium text-signal hover:text-signal-fonce transition-colors"
                  >
                    + Ajouter au devis
                  </button>
                  <button
                    type="button"
                    onClick={() => ignorerSuggestion(i)}
                    className="text-xs text-ink/40 hover:text-ink/60 underline transition-colors"
                  >
                    Ignorer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {erreur && <p className="mt-4 text-sm text-signal">{erreur}</p>}

      <Button onClick={validerDevis} disabled={enregistrement} className="mt-5">
        {enregistrement ? "Validation…" : "Valider ce devis"}
      </Button>
    </Card>
  );
}
