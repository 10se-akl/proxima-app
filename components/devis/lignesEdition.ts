import type { LigneDevisCalculee } from "@/types";
import { reajusterMinimum } from "@/lib/moteur-metier/tempsMainOeuvre";
import type { LigneEditee, TarifsEditeur } from "@/components/devis/EditeurLignes";

// ============================================================
// Les gestes que partagent l'éditeur complet (EditeurLignes) et la feuille
// d'une ligne sur téléphone (FeuilleLigne, via RevueDevis) — refonte du
// 03/10, duel F lots 3 et 4 : changer une valeur, retirer une ligne. Une
// seule implémentation, donc les mêmes règles partout : jamais de quantité
// ou de prix négatif, total recalculé, ligne « heures minimum » tenue à jour.
//
// Fonctions pures, sans React : elles se testent seules (lignesEdition.test.ts).
// ============================================================

export const avecMinimum = (lignes: LigneEditee[], tarifs?: TarifsEditeur | null) =>
  tarifs ? reajusterMinimum(lignes, tarifs.heures_min_facturables) : lignes;

export function lignesAvecValeur(
  lignes: LigneEditee[],
  cle: string,
  cleChamp: keyof LigneDevisCalculee,
  valeur: string | null,
  tarifs?: TarifsEditeur | null
): LigneEditee[] {
  return avecMinimum(
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
        const majee: LigneEditee = { ...ligne, [cleChamp]: valeurSure };
        majee.total = Math.round(majee.quantite * majee.prix_unitaire * 100) / 100;
        // Refonte (03/10, duel F lot 4) — un prix tapé à la main est le prix
        // de l'artisan : la ligne n'est plus signalée « Prix Compyo ».
        if (cleChamp === "prix_unitaire") majee.prix_source = "artisan";
        return majee;
      }
      return { ...ligne, [cleChamp]: valeur };
    }),
    tarifs
  );
}

export function lignesSansLigne(lignes: LigneEditee[], cle: string, tarifs?: TarifsEditeur | null): LigneEditee[] {
  return avecMinimum(
    lignes.filter((l) => l.cle !== cle),
    tarifs
  );
}
