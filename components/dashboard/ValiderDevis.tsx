"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { enregistrerEvenement } from "@/lib/timeline";
import { getOrganisationId } from "@/lib/organisation";
import { recalculerDevis, genererMentionTvaReduite } from "@/lib/moteur-metier/calculerDevis";
import { obtenirPostesFrequents, type PosteFrequent } from "@/lib/postesFrequents";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, TextareaField } from "@/components/ui/Input";
import type { Devis, LigneDevisCalculee } from "@/types";

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
  onValide,
}: {
  devis: Devis;
  demandeId: string;
  artisanId: string;
  onValide: () => void;
}) {
  const supabase = createClient();

  const [lignes, setLignes] = useState<LigneDevisCalculee[]>(devis.lignes);
  const [deplacement, setDeplacement] = useState(devis.deplacement);
  const [margePct, setMargePct] = useState(devis.marge_pct);
  const [tvaPct, setTvaPct] = useState(devis.tva_pct);
  const [commentaires, setCommentaires] = useState(devis.commentaires ?? "");
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
  }

  function ajouterSuggestion(index: number) {
    setSuggestionsRestantes((prev) => {
      const suggestion = prev[index];
      setLignes((l) => [...l, suggestion]);
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

    setEnregistrement(true);

    const { error } = await supabase
      .from("devis")
      .update({
        lignes,
        sous_total_ht: totaux.sous_total_ht,
        deplacement: totaux.deplacement,
        marge_pct: totaux.marge_pct,
        tva_pct: totaux.tva_pct,
        montant_tva: totaux.montant_tva,
        total_estime: totaux.total_ttc,
        commentaires: commentaires || null,
        mention_tva_reduite: totaux.tva_pct !== 20 ? mentionTvaReduite.trim() || null : null,
        statut: "a_valider",
      })
      .eq("id", devis.id);

    setEnregistrement(false);

    if (error) {
      setErreur("Impossible d'enregistrer les modifications. Réessayez.");
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
      <p className="text-xs font-medium text-ink/50 uppercase tracking-wider mb-1">
        Validation du devis
      </p>
      <p className="text-xs text-ink/40 mb-5">
        Relisez et ajustez chaque ligne si besoin. Rien n&apos;est exportable tant que ce
        n&apos;est pas validé.
      </p>

      <div className="flex flex-col gap-3">
        {lignes.map((ligne, i) => (
          <div
            key={i}
            className="rounded-xl border border-ink/10 p-3 transition-colors hover:border-ink/20"
          >
            <div className="flex items-start gap-2">
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

      <button
        type="button"
        onClick={ajouterLigne}
        className="mt-3 text-xs text-ink/50 underline decoration-ink/20 underline-offset-2 transition-colors hover:text-signal hover:decoration-signal/40"
      >
        + Ajouter une ligne
      </button>

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
        <div className="flex items-center justify-between text-ink/60">
          <span>TVA ({totaux.tva_pct}%)</span>
          <span className="font-mono">{formatEuros(totaux.montant_tva)}</span>
        </div>
        <div className="flex items-center justify-between font-semibold pt-2 border-t border-ink/10">
          <span>Total TTC</span>
          <span className="font-mono text-lg">{formatEuros(totaux.total_ttc)}</span>
        </div>
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
