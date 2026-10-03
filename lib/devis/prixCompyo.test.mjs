// Tests du signal « Prix Compyo » (refonte du 03/10, duel F lot 4).
//
// Le dépôt n'a pas de banc de tests : ceux-ci tournent avec le lanceur de
// Node (22.15 ou plus, qui lit le TypeScript tel quel), sans dépendance :
//
//   node --test lib/devis/prixCompyo.test.mjs
//
// Le crochet ci-dessous apprend à Node les adresses « @/… » du projet.
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

registerHooks({
  resolve(specifier, contexte, suivant) {
    if (specifier.startsWith("@/")) {
      const base = join(racine, specifier.slice(2));
      for (const fin of [".ts", "/index.ts"]) {
        if (existsSync(base + fin)) return suivant(pathToFileURL(base + fin).href, contexte);
      }
    }
    return suivant(specifier, contexte);
  },
});

const { calculerDevis, PARAMETRES_PAR_DEFAUT } = await import("../moteur-metier/calculerDevis.ts");
const { lignesDeVente } = await import("../moteur-metier/prixDeVente.ts");
const { lignesADoute, estPrixCompyo } = await import("./qualite.ts");
const { lignesAvecValeur } = await import("../../components/devis/lignesEdition.ts");

const parametres = { ...PARAMETRES_PAR_DEFAUT, id: "p", artisan_id: "a", organisation_id: "o" };

const ligne = (surcharge = {}) => ({
  description: "Faux plafond BA13",
  categorie: "fourniture",
  quantite: 18,
  unite: "m²",
  prix_unitaire: 35,
  total: 630,
  detail_calcul: "Tarif de référence interne : 35€/m² — à ajuster selon vos fournisseurs",
  ...surcharge,
});

// ---- calculerDevis pose prix_source -------------------------------------

test("calculerDevis : une fourniture porte le prix de référence, source « compyo »", () => {
  const { lignes } = calculerDevis(
    [{ description: "Plaques de plâtre BA13", categorie: "fourniture", quantite: 20, unite: "m²" }],
    parametres
  );
  assert.equal(lignes[0].prix_source, "compyo");
});

test("calculerDevis : un prix par défaut (aucun tarif connu) est aussi « compyo »", () => {
  const { lignes } = calculerDevis(
    [{ description: "Quelque chose d'inconnu", categorie: "forfait", quantite: 1, unite: "forfait" }],
    parametres
  );
  assert.equal(lignes[0].prix_unitaire, 60);
  assert.equal(lignes[0].prix_source, "compyo");
});

test("calculerDevis : la main-d'œuvre (heure, jour) et le complément d'heures sont « artisan »", () => {
  const horaire = calculerDevis(
    [{ description: "Pose", categorie: "main_oeuvre", quantite: 3, unite: "heure", temps_estime_heures: 3 }],
    parametres
  );
  assert.equal(horaire.lignes[0].prix_source, "artisan");

  const jour = calculerDevis(
    [{ description: "Pose", categorie: "main_oeuvre", quantite: 2, unite: "jour", temps_estime_heures: 16 }],
    { ...parametres, cout_journalier: 360 }
  );
  assert.equal(jour.lignes[0].unite, "jour");
  assert.equal(jour.lignes[0].prix_source, "artisan");

  const minimum = calculerDevis(
    [{ description: "Pose", categorie: "main_oeuvre", quantite: 1, unite: "heure", temps_estime_heures: 1 }],
    { ...parametres, heures_min_facturables: 3 }
  );
  assert.equal(minimum.lignes.length, 2);
  assert.equal(minimum.lignes[1].prix_source, "artisan");
});

// ---- jamais chez le client ----------------------------------------------

test("lignesDeVente ne recopie PAS prix_source vers le document client", () => {
  const lignes = [ligne({ prix_source: "compyo" }), ligne({ description: "Pose", categorie: "main_oeuvre", prix_source: "artisan" })];
  const vente = lignesDeVente({ lignes, deplacement: 0, marge_pct: 15, total_estime: 0, montant_tva: null });
  assert.equal(vente.length, 2);
  for (const l of vente) assert.ok(!("prix_source" in l), "prix_source est interne");
  assert.ok(!JSON.stringify(vente).includes("prix_source"));
  assert.ok(!JSON.stringify(vente).includes("Tarif de référence"), "la note de calcul reste interne aussi");
});

// ---- lignesADoute --------------------------------------------------------

test("lignesADoute : « Prix Compyo » pour un prix de référence, rien pour le prix de l'artisan", () => {
  const signaux = lignesADoute([ligne({ prix_source: "compyo" }), ligne({ prix_source: "artisan" })]);
  assert.deepEqual(signaux[0], { id: "prix_compyo", libelle: "Prix Compyo" });
  assert.equal(signaux[1], null);
});

test("lignesADoute : un ancien devis (sans prix_source) se lit sur sa note de calcul", () => {
  assert.equal(estPrixCompyo(ligne()), true);
  assert.equal(estPrixCompyo(ligne({ detail_calcul: "3h × 45€/h (coût horaire configuré)" })), false);
  assert.equal(estPrixCompyo(ligne({ detail_calcul: "Ligne ajoutée manuellement" })), false);
  // Le champ, quand il est là, l'emporte sur la note.
  assert.equal(estPrixCompyo(ligne({ prix_source: "artisan" })), false);
});

test("lignesADoute : une quantité ou un prix à 0 passent avant « Prix Compyo »", () => {
  const signaux = lignesADoute([
    ligne({ quantite: 0, total: 0, prix_source: "compyo" }),
    ligne({ prix_unitaire: 0, total: 0, prix_source: "artisan", detail_calcul: "" }),
  ]);
  assert.deepEqual(signaux[0], { id: "quantite", libelle: "Quantité à saisir" });
  assert.deepEqual(signaux[1], { id: "prix", libelle: "Prix à saisir" });
});

test("lignesADoute : une journée au prix d'une heure, et l'inverse, sont à vérifier", () => {
  const tarifs = { cout_horaire: 45, cout_journalier: 360 };
  const jour = { categorie: "main_oeuvre", unite: "jour", quantite: 2, prix_unitaire: 45, total: 90, detail_calcul: "", prix_source: "artisan" };
  const heure = { ...jour, unite: "heure", prix_unitaire: 360, total: 720 };
  const bon = { ...jour, prix_unitaire: 360, total: 720 };
  const signaux = lignesADoute(
    [jour, heure, bon].map((l, i) => ({ description: `Poste ${i}`, ...l })),
    tarifs
  );
  assert.equal(signaux[0].id, "prix_a_verifier");
  assert.equal(signaux[1].id, "prix_a_verifier");
  assert.equal(signaux[2], null);
});

test("lignesADoute : la ligne « heures minimum » calculée n'est jamais signalée", () => {
  const signaux = lignesADoute([
    ligne({
      description: "Ajustement heures minimum facturables",
      categorie: "main_oeuvre",
      unite: "heure",
      quantite: 2,
      prix_unitaire: 45,
      total: 90,
      detail_calcul: "Complément pour atteindre le minimum de 3h configuré",
    }),
  ]);
  assert.equal(signaux[0], null);
});

test("lignesADoute : une liste sans rien à signaler ne signale rien", () => {
  const signaux = lignesADoute([ligne({ prix_source: "artisan" }), ligne({ prix_source: "artisan" })]);
  assert.deepEqual(signaux, [null, null]);
});

// ---- « artisan » dès qu'un prix est tapé ---------------------------------

const editee = (surcharge = {}) => ({ cle: "c1", manuelle: false, ...ligne(surcharge) });

test("un prix tapé à la main passe la ligne à « artisan » (et plus de « Prix Compyo »)", () => {
  const avant = [editee({ prix_source: "compyo" })];
  assert.equal(lignesADoute(avant)[0].id, "prix_compyo");

  const apres = lignesAvecValeur(avant, "c1", "prix_unitaire", "37.4");
  assert.equal(apres[0].prix_source, "artisan");
  assert.equal(apres[0].prix_unitaire, 37.4);
  assert.equal(apres[0].total, 673.2);
  assert.equal(lignesADoute(apres)[0], null);
});

test("un ancien devis (sans champ) est aussi libéré dès qu'un prix est tapé", () => {
  const apres = lignesAvecValeur([editee()], "c1", "prix_unitaire", "30");
  assert.equal(apres[0].prix_source, "artisan");
  assert.equal(lignesADoute(apres)[0], null);
});

test("changer seulement la quantité ne change pas l'origine du prix", () => {
  const apres = lignesAvecValeur([editee({ prix_source: "compyo" })], "c1", "quantite", "20");
  assert.equal(apres[0].prix_source, "compyo");
  assert.equal(apres[0].total, 700);
  assert.equal(lignesADoute(apres)[0].id, "prix_compyo");
});

test("jamais de prix négatif, même tapé", () => {
  const apres = lignesAvecValeur([editee({ prix_source: "compyo" })], "c1", "prix_unitaire", "-5");
  assert.equal(apres[0].prix_unitaire, 0);
  assert.equal(apres[0].total, 0);
});
