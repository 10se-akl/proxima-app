"use client";

import { useState } from "react";
import type { LigneDevisCalculee, LotDevis, ParametresEntreprise } from "@/types";
import {
  convertirLigneMainOeuvre,
  estLigneAjustementMinimum,
  estUniteHeure,
  estUniteJour,
} from "@/lib/moteur-metier/tempsMainOeuvre";
import { avecMinimum, lignesAvecValeur, lignesSansLigne } from "@/components/devis/lignesEdition";
import { IconeChevron, IconeEtincelle, IconeFermer, IconePlus } from "@/components/projet/icones";
import { AIDE, BOUTON_CREUX_LARGE, BOUTON_ICONE, BOUTON_TEXTE, CHAMP, ETIQUETTE, FORME_ETIQUETTE, GROUPE, MONTANT, SECONDAIRE, TITRE_CARTE, euros, CHAMP_COMPACT, SELECT, BOUTON_TEXTE_DISCRET, BOUTON_ICONE_DISCRET } from "@/components/ui/recettes";

// Tarifs de l'artisan : sans eux (paramètres pas encore chargés), l'éditeur
// fonctionne comme avant, sans conversion ni ajustement automatique.
export type TarifsEditeur = Pick<ParametresEntreprise, "cout_horaire" | "cout_journalier" | "heures_min_facturables">;

// ============================================================
// Lignes du devis, avec ou sans lots (17/09).
//
// Sans lots : une simple liste, comme avant — la plupart des devis
// (dépannage, petite intervention) n'en ont pas besoin, et l'artisan n'a
// rien de plus à comprendre. Avec lots : chaque lot se renomme, se replie,
// se déplace ; chaque ligne monte, descend ou change de lot. Pas de
// glisser-déposer : sur un téléphone, avec des gants ou en plein soleil,
// deux flèches restent plus sûres.
//
// Retirer un lot ne supprime jamais ses lignes : elles rejoignent le lot
// précédent (ou redeviennent une simple liste s'il n'en reste aucun).
// ============================================================

// Ligne en cours d'édition : une clé stable (pour que la saisie ne saute
// pas quand une ligne bouge) et son origine (IA ou artisan), jamais
// enregistrées — voir lignesAEnregistrer.
export type LigneEditee = LigneDevisCalculee & { cle: string; manuelle: boolean };

export function nouvelleCle(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function versLignesEditees(lignes: LigneDevisCalculee[], manuelle: boolean): LigneEditee[] {
  return lignes.map((l) => ({ ...l, cle: nouvelleCle(), manuelle }));
}

export function lignesAEnregistrer(lignes: LigneEditee[]): LigneDevisCalculee[] {
  return lignes.map(({ cle: _cle, manuelle: _manuelle, ...ligne }) => ligne);
}

// Une ligne ajoutée (poste fréquent, suggestion, ligne vide) va dans le
// dernier lot quand il y en a : c'est là que l'artisan est en train de
// travailler, et il peut toujours la déplacer.
export function avecLotParDefaut(ligne: LigneEditee, lots: LotDevis[]): LigneEditee {
  return lots.length > 0 ? { ...ligne, lot_id: lots[lots.length - 1].id } : ligne;
}

// Refonte (03/10, duel F lots 3 et 4) — changer une valeur et retirer une
// ligne vivent dans lignesEdition.ts, partagés avec la feuille d'une ligne
// sur téléphone ; on les ré-exporte ici pour les écrans qui les importaient.
export { lignesAvecValeur, lignesSansLigne };

// Design v3 (24/10) : les montants passent par euros() (espaces insécables,
// « 1 234,50 € » ne se coupe jamais) ; les champs et boutons par les
// recettes. Les champs des trois colonnes (quantité, unité, prix) gardent
// 12 px de marge intérieure au lieu de 16 : à 390 px, chaque colonne fait
// ~100 px.
const formatEuros = (n: number) => euros(n, true);

const champ = CHAMP_COMPACT;
// 27/09 — 48 px partout (32 px avant) : la croix de suppression est collée
// au libellé, un pouce ne doit pas la toucher par erreur.
const boutonIcone = `${BOUTON_ICONE_DISCRET} disabled:cursor-not-allowed disabled:opacity-40`;
// Design v3 (25/10) : plus de lien souligné utilisé comme bouton. Une action
// vraiment discrète (« Retirer le lot ») = le bouton texte, en steel.
const boutonDiscret = BOUTON_TEXTE.replace("text-ink", "text-steel");
// Les listes déroulantes : l'apparence maison (chevron steel), le <select>
// natif. Dans une colonne de ~100 px, un peu moins de marge à gauche et à
// droite du chevron.
const selectColonne = SELECT.replace("pl-4 pr-10", "pl-3 pr-9");
const selectLot = `${SELECT.replace("w-full ", "").replace("pl-4 pr-10", "pl-3 pr-9")} w-auto max-w-[11rem] truncate`;
const libelleColonne = "mb-1 block text-[13px] font-medium text-steel";
// La rangée « + Ajouter une ligne », dernière ligne du groupe.
const rangeeAjout = `flex min-h-14 w-full items-center gap-3 px-4 text-left text-base font-semibold text-ink active:bg-ink/10 sm:hover:bg-ink/[0.03] motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink`;

export function EditeurLignes({
  lignes,
  lots,
  onChange,
  tarifs,
}: {
  lignes: LigneEditee[];
  lots: LotDevis[];
  onChange: (lignes: LigneEditee[], lots: LotDevis[]) => void;
  tarifs?: TarifsEditeur | null;
}) {
  const [replies, setReplies] = useState<Set<string>>(new Set());
  const [lotAFocaliser, setLotAFocaliser] = useState<string | null>(null);

  const idsLots = new Set(lots.map((l) => l.id));
  const dansLot = (l: LigneEditee, lotId: string | null) =>
    lotId === null ? !l.lot_id || !idsLots.has(l.lot_id) : l.lot_id === lotId;

  // 21/09 — La ligne « Ajustement heures minimum facturables » suit les
  // heures réelles à chaque modification (voir lib/moteur-metier/
  // tempsMainOeuvre.ts) : sans ça, monter un poste de 0,5 h à 3 h laissait
  // le complément de 0,5 h, payé en trop par le client.
  const avecMinimumAJour = (l: LigneEditee[]) => avecMinimum(l, tarifs);

  // Heure ↔ jour sur une ligne de main-d'œuvre : le temps est conservé, le
  // prix unitaire devient le bon tarif. Passer « heure » en « jour » en
  // tapant le mot gardait le prix horaire (3 jours × 45 €).
  function changerUniteTemps(cle: string, vers: "heure" | "jour") {
    if (!tarifs) return;
    onChange(
      avecMinimumAJour(lignes.map((l) => (l.cle === cle ? convertirLigneMainOeuvre(l, vers, tarifs) : l))),
      lots
    );
  }

  // ---- lignes ----------------------------------------------------------
  function modifier(cle: string, cleChamp: keyof LigneDevisCalculee, valeur: string | null) {
    onChange(lignesAvecValeur(lignes, cle, cleChamp, valeur, tarifs), lots);
  }

  function supprimer(cle: string) {
    onChange(lignesSansLigne(lignes, cle, tarifs), lots);
  }

  function ajouter(lotId: string | null) {
    const nouvelle: LigneEditee = {
      cle: nouvelleCle(),
      manuelle: true,
      description: "",
      categorie: "forfait",
      quantite: 1,
      unite: "forfait",
      prix_unitaire: 0,
      total: 0,
      detail_calcul: "Ligne ajoutée manuellement",
      ...(lotId ? { lot_id: lotId } : {}),
    };
    // Juste après la dernière ligne du même lot, pour que l'ordre du
    // tableau reste lisible.
    const derniere = lignes.map((l) => dansLot(l, lotId)).lastIndexOf(true);
    const copie = [...lignes];
    copie.splice(derniere === -1 ? copie.length : derniere + 1, 0, nouvelle);
    onChange(copie, lots);
  }

  // Échange avec la ligne voisine DU MÊME lot.
  function deplacer(cle: string, sens: -1 | 1) {
    const index = lignes.findIndex((l) => l.cle === cle);
    if (index === -1) return;
    const lotId = lignes[index].lot_id && idsLots.has(lignes[index].lot_id!) ? lignes[index].lot_id! : null;
    let voisin = index + sens;
    while (voisin >= 0 && voisin < lignes.length && !dansLot(lignes[voisin], lotId)) voisin += sens;
    if (voisin < 0 || voisin >= lignes.length) return;
    const copie = [...lignes];
    [copie[index], copie[voisin]] = [copie[voisin], copie[index]];
    onChange(copie, lots);
  }

  function changerDeLot(cle: string, lotId: string) {
    const ligne = lignes.find((l) => l.cle === cle);
    if (!ligne) return;
    const autres = lignes.filter((l) => l.cle !== cle);
    const deplacee = { ...ligne, lot_id: lotId || null };
    // Elle arrive en fin de son nouveau lot.
    const derniere = autres.map((l) => dansLot(l, lotId || null)).lastIndexOf(true);
    autres.splice(derniere === -1 ? autres.length : derniere + 1, 0, deplacee);
    onChange(autres, lots);
  }

  // ---- lots ------------------------------------------------------------
  function organiserEnLots() {
    const lot: LotDevis = { id: nouvelleCle(), nom: "" };
    onChange(
      lignes.map((l) => ({ ...l, lot_id: lot.id })),
      [lot]
    );
    setLotAFocaliser(lot.id);
  }

  function nouveauLot() {
    const lot: LotDevis = { id: nouvelleCle(), nom: "" };
    const nouvelle: LigneEditee = {
      cle: nouvelleCle(),
      manuelle: true,
      description: "",
      categorie: "forfait",
      quantite: 1,
      unite: "forfait",
      prix_unitaire: 0,
      total: 0,
      detail_calcul: "Ligne ajoutée manuellement",
      lot_id: lot.id,
    };
    onChange([...lignes, nouvelle], [...lots, lot]);
    setLotAFocaliser(lot.id);
  }

  function renommerLot(id: string, nom: string) {
    onChange(
      lignes,
      lots.map((l) => (l.id === id ? { ...l, nom } : l))
    );
  }

  function deplacerLot(id: string, sens: -1 | 1) {
    const index = lots.findIndex((l) => l.id === id);
    const cible = index + sens;
    if (index === -1 || cible < 0 || cible >= lots.length) return;
    const copie = [...lots];
    [copie[index], copie[cible]] = [copie[cible], copie[index]];
    onChange(lignes, copie);
  }

  function retirerLot(id: string) {
    const index = lots.findIndex((l) => l.id === id);
    const restants = lots.filter((l) => l.id !== id);
    const accueil = restants.length === 0 ? null : restants[Math.max(0, index - 1)].id;
    onChange(
      lignes.map((l) => (l.lot_id === id ? { ...l, lot_id: accueil } : l)),
      restants
    );
  }

  function basculerRepli(id: string) {
    setReplies((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }

  // ---- rendu -----------------------------------------------------------
  // Design v3 (24/10) : une ligne = une rangée d'un groupe (carte unique,
  // filets entre les lignes), plus des cartes bordées empilées. Libellés des
  // colonnes en 13 px gris lisible (10 px pâle avant), montant de la ligne
  // en 17 px aligné à droite, chiffres à chasse fixe.
  function carteLigne(ligne: LigneEditee, position: number, nombreDansGroupe: number) {
    // Ligne d'ajustement minimum : calculée, pas saisie (voir
    // avecMinimumAJour). Ses montants sont en lecture seule ; l'artisan
    // peut toujours la supprimer ou la renommer pour la reprendre en main.
    const ajustement = Boolean(tarifs) && estLigneAjustementMinimum(ligne);
    const uniteTemps = estUniteJour(ligne.unite) ? "jour" : estUniteHeure(ligne.unite) ? "heure" : "autre";
    return (
      <div key={ligne.cle} className="px-4 py-4">
        {/* Design v3 (25/10) : « Proposée par l'IA » n'est plus répétée sur
            chaque ligne — une seule phrase en tête du lot (voir enteteIA) ;
            ici, une petite étincelle devant la description suffit. */}
        {ligne.unite === "jour" && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            <span
              title="Poste facturé au tarif journalier plutôt qu'horaire"
              className={`${FORME_ETIQUETTE} ${ETIQUETTE.neutre}`}
            >
              Tarif journalier
            </span>
          </div>
        )}
        <div className="flex items-start gap-1">
          {!ligne.manuelle && (
            <span className="grid h-12 w-5 shrink-0 place-items-center text-ink" title="Ligne proposée avec l'IA, à relire">
              <IconeEtincelle className="h-4 w-4" />
              <span className="sr-only">Ligne proposée avec l&apos;IA</span>
            </span>
          )}
          <input
            value={ligne.description}
            onChange={(e) => modifier(ligne.cle, "description", e.target.value)}
            placeholder="Description du poste"
            aria-label="Description du poste"
            className={`${CHAMP} min-w-0 flex-1 font-semibold`}
          />
          <button
            type="button"
            onClick={() => supprimer(ligne.cle)}
            className={`${boutonIcone} -mr-2`}
            aria-label="Supprimer cette ligne"
            title="Supprimer cette ligne"
          >
            <IconeFermer className="h-5 w-5" />
          </button>
        </div>
        {/* items-end : un libellé sur deux lignes (« Prix unitaire (€) » à
            390 px) ne décale pas les champs. */}
        <div className="mt-3 grid grid-cols-3 items-end gap-2">
          <div>
            <label className={libelleColonne}>Quantité</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={ligne.quantite}
              onChange={(e) => modifier(ligne.cle, "quantite", e.target.value)}
              aria-label="Quantité"
              readOnly={ajustement}
              className={`${champ} ${ajustement ? "opacity-60" : ""}`}
            />
          </div>
          <div>
            <label className={libelleColonne}>Unité</label>
            {/* Main-d'œuvre : un choix heure / jour qui CONVERTIT le prix,
                plutôt qu'un texte libre qui le laissait tel quel. */}
            {tarifs && ligne.categorie === "main_oeuvre" && !ajustement ? (
              <select
                value={uniteTemps}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "heure" || v === "jour") changerUniteTemps(ligne.cle, v);
                }}
                aria-label="Unité du poste"
                className={selectColonne}
              >
                <option value="heure">heure</option>
                <option value="jour">jour</option>
                {uniteTemps === "autre" && (
                  <option value="autre" disabled>
                    {ligne.unite}
                  </option>
                )}
              </select>
            ) : (
              <input
                value={ligne.unite}
                onChange={(e) => modifier(ligne.cle, "unite", e.target.value)}
                aria-label="Unité"
                readOnly={ajustement}
                className={`${champ} ${ajustement ? "opacity-60" : ""}`}
              />
            )}
          </div>
          <div>
            <label className={libelleColonne}>Prix unitaire (€)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={ligne.prix_unitaire}
              onChange={(e) => modifier(ligne.cle, "prix_unitaire", e.target.value)}
              aria-label="Prix unitaire (€)"
              readOnly={ajustement}
              className={`${champ} ${ajustement ? "opacity-60" : ""}`}
            />
          </div>
        </div>
        {ajustement && tarifs && (
          <p className={AIDE}>
            Calculée automatiquement pour atteindre votre minimum de {tarifs.heures_min_facturables}{" "}h
            facturable{tarifs.heures_min_facturables > 1 ? "s" : ""} : elle suit vos heures et
            disparaît dès qu&apos;il est atteint. Supprimez-la si vous ne voulez pas l&apos;appliquer.
          </p>
        )}
        {/* Explication proposée par l'IA : l'artisan la garde, la reformule
            ou la retire. Rien à écrire s'il n'en veut pas. */}
        {typeof ligne.explication === "string" && (
          <div className="mt-3">
            <span className={libelleColonne}>Pour le client</span>
            <div className="flex items-center gap-1">
              <input
                value={ligne.explication}
                onChange={(e) => modifier(ligne.cle, "explication", e.target.value)}
                placeholder="Explication courte (facultative)"
                aria-label="Explication de la ligne, visible par le client"
                className={`${CHAMP} min-w-0 flex-1 text-[15px]`}
              />
              <button
                type="button"
                onClick={() => modifier(ligne.cle, "explication", null)}
                className={`${BOUTON_TEXTE_DISCRET} -mr-3 shrink-0`}
                title="Retirer cette explication du devis"
              >
                Retirer
              </button>
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1">
          {nombreDansGroupe > 1 && (
            <>
              <button
                type="button"
                onClick={() => deplacer(ligne.cle, -1)}
                disabled={position === 0}
                className={`${boutonIcone} -ml-3`}
                aria-label="Monter la ligne"
                title="Monter"
              >
                <IconeChevron className="h-5 w-5 -rotate-90" />
              </button>
              <button
                type="button"
                onClick={() => deplacer(ligne.cle, 1)}
                disabled={position === nombreDansGroupe - 1}
                className={boutonIcone}
                aria-label="Descendre la ligne"
                title="Descendre"
              >
                <IconeChevron className="h-5 w-5 rotate-90" />
              </button>
            </>
          )}
          {lots.length > 0 && (
            <select
              value={ligne.lot_id && idsLots.has(ligne.lot_id) ? ligne.lot_id : ""}
              onChange={(e) => changerDeLot(ligne.cle, e.target.value)}
              aria-label="Lot de cette ligne"
              className={selectLot}
            >
              {lots.map((lot, i) => (
                <option key={lot.id} value={lot.id}>
                  {i + 1}. {lot.nom.trim() || "Lot sans nom"}
                </option>
              ))}
              <option value="">Hors lot</option>
            </select>
          )}
          <p className={`ml-auto whitespace-nowrap pl-2 text-[17px] ${MONTANT}`}>{formatEuros(ligne.total)}</p>
        </div>
      </div>
    );
  }

  // Rendu bien visible le 13/09 : l'artisan doit voir d'emblée qu'il peut
  // ajouter ses propres lignes, pas seulement accepter celles de l'IA.
  // Design v3 (24/10) : la dernière rangée du groupe, avec son « + ».
  const boutonAjouter = (lotId: string | null, libelle: string) => (
    <button type="button" onClick={() => ajouter(lotId)} className={rangeeAjout}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper-warm" aria-hidden>
        <IconePlus className="h-4 w-4" />
      </span>
      {libelle}
    </button>
  );

  // Design v3 (25/10) : une seule mention de l'IA en tête d'un groupe qui
  // contient des lignes proposées (au lieu d'une pastille par ligne).
  const enteteIA = (groupe: LigneEditee[]) =>
    groupe.some((l) => !l.manuelle) && (
      <p className="flex min-h-12 items-center gap-2 px-4 py-2 text-[15px] text-steel [text-wrap:pretty]">
        <IconeEtincelle className="h-4 w-4 shrink-0 text-ink" />
        Lignes proposées avec l&apos;IA, relisez les prix
      </p>
    );

  // Sans lots : la liste simple d'avant.
  if (lots.length === 0) {
    return (
      <div>
        <div className={GROUPE}>
          {enteteIA(lignes)}
          {lignes.map((l, i) => carteLigne(l, i, lignes.length))}
          {boutonAjouter(null, "Ajouter une ligne")}
        </div>
        {lignes.length >= 2 && (
          <button type="button" onClick={organiserEnLots} className={`${BOUTON_TEXTE} mt-1 text-left`}>
            Organiser en lots (cuisine, salle de bain, électricité…)
          </button>
        )}
      </div>
    );
  }

  const horsLot = lignes.filter((l) => dansLot(l, null));

  return (
    <div className="flex flex-col gap-6">
      {lots.map((lot, indexLot) => {
        const lignesDuLot = lignes.filter((l) => dansLot(l, lot.id));
        const replie = replies.has(lot.id);
        const sousTotal = lignesDuLot.reduce((s, l) => s + Math.round(l.total * 100), 0) / 100;
        return (
          <section key={lot.id}>
            <div className={GROUPE}>
              {/* L'en-tête du lot : replier, son nom, le déplacer. */}
              <div className="flex items-center gap-1 px-2 py-2">
                <button
                  type="button"
                  onClick={() => basculerRepli(lot.id)}
                  className={boutonIcone}
                  aria-expanded={!replie}
                  aria-label={replie ? "Déplier le lot" : "Replier le lot"}
                  title={replie ? "Déplier" : "Replier"}
                >
                  <IconeChevron className={`h-5 w-5 motion-safe:transition-transform ${replie ? "" : "rotate-90"}`} />
                </button>
                <span className="shrink-0 pr-1 text-[15px] font-semibold tabular-nums text-steel">{indexLot + 1}.</span>
                <input
                  value={lot.nom}
                  onChange={(e) => renommerLot(lot.id, e.target.value)}
                  placeholder="Nom du lot (ex : Salle de bain)"
                  aria-label="Nom du lot"
                  autoFocus={lotAFocaliser === lot.id}
                  onFocus={() => lotAFocaliser === lot.id && setLotAFocaliser(null)}
                  className={`${champ} min-w-0 flex-1 text-[17px] font-semibold`}
                />
                <button
                  type="button"
                  onClick={() => deplacerLot(lot.id, -1)}
                  disabled={indexLot === 0}
                  className={boutonIcone}
                  aria-label="Monter le lot"
                  title="Monter le lot"
                >
                  <IconeChevron className="h-5 w-5 -rotate-90" />
                </button>
                <button
                  type="button"
                  onClick={() => deplacerLot(lot.id, 1)}
                  disabled={indexLot === lots.length - 1}
                  className={boutonIcone}
                  aria-label="Descendre le lot"
                  title="Descendre le lot"
                >
                  <IconeChevron className="h-5 w-5 rotate-90" />
                </button>
              </div>
              {/* Le sous-total du lot, lisible même replié. */}
              <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-2">
                <span className={SECONDAIRE}>
                  {lignesDuLot.length} ligne{lignesDuLot.length > 1 ? "s" : ""} · sous-total
                </span>
                <span className={`whitespace-nowrap text-[17px] ${MONTANT}`}>{formatEuros(sousTotal)}</span>
              </div>

              {!replie && (
                <>
                  {enteteIA(lignesDuLot)}
                  {lignesDuLot.map((l, i) => carteLigne(l, i, lignesDuLot.length))}
                  {boutonAjouter(lot.id, "Ajouter une ligne à ce lot")}
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => retirerLot(lot.id)}
              className={`${boutonDiscret} mt-1`}
              title="Le lot disparaît, ses lignes sont conservées"
            >
              Retirer le lot (garder ses lignes)
            </button>
          </section>
        );
      })}

      {horsLot.length > 0 && (
        <section>
          <h3 className={TITRE_CARTE}>Hors lot</h3>
          <p className={`${SECONDAIRE} mb-2.5 [text-wrap:pretty]`}>
            Apparaissent sur le devis sous « Autres prestations ». Rangez-les dans un lot avec le
            menu de chaque ligne.
          </p>
          <div className={GROUPE}>
            {enteteIA(horsLot)}
            {horsLot.map((l, i) => carteLigne(l, i, horsLot.length))}
          </div>
        </section>
      )}

      <button type="button" onClick={nouveauLot} className={BOUTON_CREUX_LARGE}>
        <IconePlus className="h-5 w-5" />
        Nouveau lot
      </button>
    </div>
  );
}
