// Tests des projets qui dorment (23/10, lib/projetEnSommeil.ts).
//
//   node --test lib/projetEnSommeil.test.mjs
//
// Même crochet que lib/devis/prixCompyo.test.mjs pour les adresses « @/… ».
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

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

const { etatsSommeil, etatsValables, sommeilValable, raisonSommeil, joursAvantExpiration, dureeEnMots, JOURS_PAUSE } = await import(
  "./projetEnSommeil.ts"
);

const maintenant = new Date("2026-10-23T12:00:00Z");
const ilYa = (jours) => new Date(maintenant.getTime() - jours * 86400000).toISOString();
const trace = (type, jours, demande_id = "p1") => ({ demande_id, type, created_at: ilYa(jours) });
const devisEnvoye = (jours, validite_jours = 30, autre = {}) => ({
  demande_id: "p1",
  statut: "envoye",
  created_at: ilYa(jours + 1),
  envoye_le: ilYa(jours),
  validite_jours,
  ...autre,
});

test("la dernière trace décide : rangé, puis repris = éveillé", () => {
  assert.equal(etatsSommeil([trace("projet_classe", 10), trace("projet_repris", 2)], maintenant).has("p1"), false);
});

test("rangé après une reprise : rangé", () => {
  assert.equal(etatsSommeil([trace("projet_repris", 10), trace("projet_classe", 2)], maintenant).get("p1")?.etat, "classe");
});

test("« Dans 1 sem. » se tait une semaine, puis plus du tout ; « Annuler » l'arrête", () => {
  assert.equal(etatsSommeil([trace("projet_en_pause", JOURS_PAUSE - 1)], maintenant).get("p1")?.etat, "pause");
  assert.equal(etatsSommeil([trace("projet_en_pause", JOURS_PAUSE + 1)], maintenant).has("p1"), false);
  assert.equal(etatsSommeil([trace("projet_en_pause", 2), trace("projet_pause_annulee", 1)], maintenant).has("p1"), false);
});

test("les autres traces du carnet ne comptent pas", () => {
  assert.equal(etatsSommeil([trace("chantier_pas_termine", 1), trace("note_ajoutee", 1)], maintenant).size, 0);
});

test("un projet rangé se réveille quand le client signe", () => {
  const etat = { etat: "classe", depuis: ilYa(60) };
  const projet = { id: "p1", statut: "accepte", created_at: ilYa(120), accepte_le: ilYa(5) };
  assert.equal(sommeilValable(etat, projet, []), false);
});

test("un projet rangé se réveille quand un devis est créé ou la fiche modifiée", () => {
  const etat = { etat: "classe", depuis: ilYa(20) };
  const projet = { id: "p1", statut: "devis_envoye", created_at: ilYa(90), derniere_modification_le: ilYa(40) };
  assert.equal(sommeilValable(etat, projet, [devisEnvoye(50)]), true);
  assert.equal(sommeilValable(etat, projet, [{ demande_id: "p1", statut: "brouillon", created_at: ilYa(3) }]), false);
  assert.equal(sommeilValable(etat, { ...projet, derniere_modification_le: ilYa(1) }, []), false);
  const valables = etatsValables(new Map([["p1", etat]]), [{ ...projet, statut: "en_cours" }], []);
  assert.equal(valables.size, 0);
});

test("un projet à cadrer dort à 14 jours, pas avant", () => {
  const projet = (jours) => ({ id: "p1", statut: "nouveau", created_at: ilYa(jours), derniere_modification_le: null });
  assert.equal(raisonSommeil(projet(13), [], false, maintenant), null);
  assert.equal(raisonSommeil(projet(16), [], false, maintenant)?.texte, "À cadrer · 16 j");
});

test("un rendez-vous à venir ou un devis en préparation : il ne dort pas", () => {
  const p = { id: "p1", statut: "analyse", created_at: ilYa(40) };
  assert.equal(raisonSommeil(p, [], true, maintenant), null);
  assert.equal(raisonSommeil(p, [{ demande_id: "p1", statut: "brouillon", created_at: ilYa(30) }], false, maintenant), null);
});

test("une modification récente réveille le projet", () => {
  const p = { id: "p1", statut: "analyse", created_at: ilYa(40), derniere_modification_le: ilYa(3) };
  assert.equal(raisonSommeil(p, [], false, maintenant), null);
});

test("un devis sans réponse dort une fois expiré, ou à 30 jours", () => {
  const p = { id: "p1", statut: "devis_envoye", created_at: ilYa(60) };
  assert.equal(raisonSommeil(p, [devisEnvoye(20, 30)], false, maintenant), null);
  assert.match(raisonSommeil(p, [devisEnvoye(17, 15)], false, maintenant)?.texte ?? "", /^Devis expiré · /);
  assert.match(raisonSommeil(p, [devisEnvoye(31, 90)], false, maintenant)?.texte ?? "", /^Sans réponse · /);
  // Sans durée de validité (devis d'avant le 17/09) : jamais « expiré ».
  assert.match(raisonSommeil(p, [devisEnvoye(31, null)], false, maintenant)?.texte ?? "", /^Sans réponse · /);
});

test("l'expiration se compte en jours de Paris, comme sur le document", () => {
  // Envoyé le 1er octobre à 18 h (Paris), valable 10 jours : jusqu'au 11 au soir.
  const d = { validite_jours: 10, envoye_le: "2026-10-01T16:00:00Z" };
  assert.equal(joursAvantExpiration(d, new Date("2026-10-11T20:00:00Z")), 0);
  assert.equal(joursAvantExpiration(d, new Date("2026-10-11T22:30:00Z")), -1);
  assert.equal(joursAvantExpiration(d, new Date("2026-10-08T08:00:00Z")), 3);
  assert.equal(joursAvantExpiration({ validite_jours: null, envoye_le: d.envoye_le }), null);
});

test("un chantier signé, en cours ou fini ne dort jamais ici", () => {
  for (const statut of ["accepte", "en_cours", "termine"]) {
    assert.equal(raisonSommeil({ id: "p1", statut, created_at: ilYa(200) }, [devisEnvoye(200)], false, maintenant), null);
  }
});

test("les durées en mots", () => {
  assert.equal(dureeEnMots(16), "16 j");
  assert.equal(dureeEnMots(21), "3 sem.");
  assert.equal(dureeEnMots(75), "3 mois");
});
