"use client";

import { useState } from "react";
import type { LigneDevisCalculee, LotDevis } from "@/types";

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

function formatEuros(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

const champ =
  "w-full rounded-xl border border-ink/15 bg-paper px-2 py-1.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15";
const boutonIcone =
  "grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-ink/10 text-ink/45 transition-colors hover:border-ink/25 hover:text-ink disabled:opacity-30 disabled:hover:border-ink/10 disabled:hover:text-ink/45";

export function EditeurLignes({
  lignes,
  lots,
  onChange,
}: {
  lignes: LigneEditee[];
  lots: LotDevis[];
  onChange: (lignes: LigneEditee[], lots: LotDevis[]) => void;
}) {
  const [replies, setReplies] = useState<Set<string>>(new Set());
  const [lotAFocaliser, setLotAFocaliser] = useState<string | null>(null);

  const idsLots = new Set(lots.map((l) => l.id));
  const dansLot = (l: LigneEditee, lotId: string | null) =>
    lotId === null ? !l.lot_id || !idsLots.has(l.lot_id) : l.lot_id === lotId;

  // ---- lignes ----------------------------------------------------------
  function modifier(cle: string, cleChamp: keyof LigneDevisCalculee, valeur: string | null) {
    onChange(
      lignes.map((ligne) => {
        if (ligne.cle !== cle) return ligne;
        // null = on retire complètement le champ (explication).
        if (valeur === null) {
          const copie = { ...ligne };
          delete copie[cleChamp];
          return copie;
        }
        if (cleChamp === "quantite" || cleChamp === "prix_unitaire") {
          const nombre = Number(valeur);
          // Jamais de quantité ou de prix négatif : la ligne "réduirait" le
          // devis en silence.
          const valeurSure = !Number.isFinite(nombre) || nombre < 0 ? 0 : nombre;
          const majee = { ...ligne, [cleChamp]: valeurSure };
          majee.total = Math.round(majee.quantite * majee.prix_unitaire * 100) / 100;
          return majee;
        }
        return { ...ligne, [cleChamp]: valeur };
      }),
      lots
    );
  }

  function supprimer(cle: string) {
    onChange(
      lignes.filter((l) => l.cle !== cle),
      lots
    );
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
  function carteLigne(ligne: LigneEditee, position: number, nombreDansGroupe: number) {
    return (
      <div key={ligne.cle} className="rounded-xl border border-ink/10 bg-surface p-3 transition-colors hover:border-ink/20">
        <div className="flex items-start gap-2">
          {/* Badge discret sur les postes générés par l'IA, les seuls qui
              méritent vraiment une relecture attentive. */}
          {!ligne.manuelle && (
            <span
              title="Poste généré par l'IA — à relire"
              className="mt-1.5 shrink-0 rounded-md bg-signal/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-signal"
            >
              IA
            </span>
          )}
          {ligne.unite === "jour" && (
            <span
              title="Poste facturé au tarif journalier plutôt qu'horaire"
              className="mt-1.5 shrink-0 rounded-md bg-steel/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-steel"
            >
              JOUR
            </span>
          )}
          <input
            value={ligne.description}
            onChange={(e) => modifier(ligne.cle, "description", e.target.value)}
            placeholder="Description du poste"
            aria-label="Description du poste"
            className="flex-1 min-w-0 rounded-xl border border-ink/15 bg-paper px-2.5 py-1.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
          />
          <button
            type="button"
            onClick={() => supprimer(ligne.cle)}
            className={`${boutonIcone} hover:!border-signal/30 hover:!text-signal`}
            aria-label="Supprimer cette ligne"
            title="Supprimer cette ligne"
          >
            ✕
          </button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-[10px] text-ink/40">Quantité</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={ligne.quantite}
              onChange={(e) => modifier(ligne.cle, "quantite", e.target.value)}
              className={champ}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-ink/40">Unité</label>
            <input value={ligne.unite} onChange={(e) => modifier(ligne.cle, "unite", e.target.value)} className={champ} />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-ink/40">Prix unitaire (€)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={ligne.prix_unitaire}
              onChange={(e) => modifier(ligne.cle, "prix_unitaire", e.target.value)}
              className={champ}
            />
          </div>
        </div>
        {/* Explication proposée par l'IA : l'artisan la garde, la reformule
            ou la retire. Rien à écrire s'il n'en veut pas. */}
        {typeof ligne.explication === "string" && (
          <div className="mt-2 flex items-center gap-2">
            <span className="shrink-0 text-[11px] text-ink/40">Pour le client</span>
            <input
              value={ligne.explication}
              onChange={(e) => modifier(ligne.cle, "explication", e.target.value)}
              placeholder="Explication courte (facultative)"
              aria-label="Explication de la ligne, visible par le client"
              className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-paper px-2 py-1 text-xs italic text-ink/70 transition-colors focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/15"
            />
            <button
              type="button"
              onClick={() => modifier(ligne.cle, "explication", null)}
              className="shrink-0 text-[11px] text-ink/40 underline-offset-2 transition-colors hover:text-signal hover:underline"
              title="Retirer cette explication du devis"
            >
              Retirer
            </button>
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {nombreDansGroupe > 1 && (
            <>
              <button
                type="button"
                onClick={() => deplacer(ligne.cle, -1)}
                disabled={position === 0}
                className={boutonIcone}
                aria-label="Monter la ligne"
                title="Monter"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => deplacer(ligne.cle, 1)}
                disabled={position === nombreDansGroupe - 1}
                className={boutonIcone}
                aria-label="Descendre la ligne"
                title="Descendre"
              >
                ↓
              </button>
            </>
          )}
          {lots.length > 0 && (
            <select
              value={ligne.lot_id && idsLots.has(ligne.lot_id) ? ligne.lot_id : ""}
              onChange={(e) => changerDeLot(ligne.cle, e.target.value)}
              aria-label="Lot de cette ligne"
              className="h-8 max-w-[11rem] truncate rounded-xl border border-ink/10 bg-paper px-2 text-xs text-ink/70 focus:border-signal focus:outline-none"
            >
              {lots.map((lot, i) => (
                <option key={lot.id} value={lot.id}>
                  {i + 1}. {lot.nom.trim() || "Lot sans nom"}
                </option>
              ))}
              <option value="">Hors lot</option>
            </select>
          )}
          <p className="ml-auto font-mono text-sm">{formatEuros(ligne.total)}</p>
        </div>
      </div>
    );
  }

  const boutonAjouter = (lotId: string | null, libelle: string) => (
    <button
      type="button"
      onClick={() => ajouter(lotId)}
      className="w-full rounded-xl border border-dashed border-ink/25 px-4 py-2.5 text-sm font-medium text-ink/70 transition-colors hover:border-signal hover:text-signal"
    >
      {libelle}
    </button>
  );

  // Sans lots : la liste simple d'avant.
  if (lots.length === 0) {
    return (
      <div>
        <div className="flex flex-col gap-3">{lignes.map((l, i) => carteLigne(l, i, lignes.length))}</div>
        {/* Rendu bien visible le 13/09 : l'artisan doit voir d'emblée qu'il
            peut ajouter ses propres lignes, pas seulement accepter celles
            de l'IA. */}
        <div className="mt-3">{boutonAjouter(null, "+ Ajouter une ligne")}</div>
        {lignes.length >= 2 && (
          <button
            type="button"
            onClick={organiserEnLots}
            className="mt-2 text-xs text-ink/50 underline-offset-2 transition-colors hover:text-signal hover:underline"
          >
            Organiser en lots (cuisine, salle de bain, électricité…)
          </button>
        )}
      </div>
    );
  }

  const horsLot = lignes.filter((l) => dansLot(l, null));

  return (
    <div className="flex flex-col gap-4">
      {lots.map((lot, indexLot) => {
        const lignesDuLot = lignes.filter((l) => dansLot(l, lot.id));
        const replie = replies.has(lot.id);
        const sousTotal = lignesDuLot.reduce((s, l) => s + Math.round(l.total * 100), 0) / 100;
        return (
          <section key={lot.id} className="rounded-2xl border border-ink/10 bg-paper-warm/40 p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => basculerRepli(lot.id)}
                className={boutonIcone}
                aria-expanded={!replie}
                aria-label={replie ? "Déplier le lot" : "Replier le lot"}
                title={replie ? "Déplier" : "Replier"}
              >
                <span className={`transition-transform ${replie ? "-rotate-90" : ""}`}>▾</span>
              </button>
              <span className="shrink-0 font-mono text-xs text-ink/45">{indexLot + 1}.</span>
              <input
                value={lot.nom}
                onChange={(e) => renommerLot(lot.id, e.target.value)}
                placeholder="Nom du lot (ex : Salle de bain)"
                aria-label="Nom du lot"
                autoFocus={lotAFocaliser === lot.id}
                onFocus={() => lotAFocaliser === lot.id && setLotAFocaliser(null)}
                className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1.5 text-sm font-semibold transition-colors hover:border-ink/15 focus:border-signal focus:bg-paper focus:outline-none focus:ring-2 focus:ring-signal/15"
              />
              <button
                type="button"
                onClick={() => deplacerLot(lot.id, -1)}
                disabled={indexLot === 0}
                className={boutonIcone}
                aria-label="Monter le lot"
                title="Monter le lot"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => deplacerLot(lot.id, 1)}
                disabled={indexLot === lots.length - 1}
                className={boutonIcone}
                aria-label="Descendre le lot"
                title="Descendre le lot"
              >
                ↓
              </button>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 pl-10 text-xs text-ink/50">
              <span>
                {lignesDuLot.length} ligne{lignesDuLot.length > 1 ? "s" : ""} · sous-total{" "}
                <span className="font-mono text-ink/70">{formatEuros(sousTotal)}</span>
              </span>
              <button
                type="button"
                onClick={() => retirerLot(lot.id)}
                className="underline-offset-2 transition-colors hover:text-signal hover:underline"
                title="Le lot disparaît, ses lignes sont conservées"
              >
                Retirer le lot (garder ses lignes)
              </button>
            </div>

            {!replie && (
              <div className="mt-3 flex flex-col gap-3">
                {lignesDuLot.map((l, i) => carteLigne(l, i, lignesDuLot.length))}
                {boutonAjouter(lot.id, "+ Ajouter une ligne à ce lot")}
              </div>
            )}
          </section>
        );
      })}

      {horsLot.length > 0 && (
        <section className="rounded-2xl border border-dashed border-ink/15 p-3">
          <p className="px-1 text-sm font-semibold text-ink/70">Hors lot</p>
          <p className="px-1 text-xs text-ink/45">
            Apparaissent sur le devis sous « Autres prestations ». Rangez-les dans un lot avec le
            menu de chaque ligne.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {horsLot.map((l, i) => carteLigne(l, i, horsLot.length))}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={nouveauLot}
        className="w-full rounded-xl border border-dashed border-ink/25 px-4 py-2.5 text-sm font-medium text-ink/70 transition-colors hover:border-signal hover:text-signal"
      >
        + Nouveau lot
      </button>
    </div>
  );
}
