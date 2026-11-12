// Tests des versions d'un devis (12/11, lib/devis/versions.ts).
//
//   node --test lib/devis/versions.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { choisirDevisAFacturer, estRemplace, autreVersionSignee } from "./versions.ts";

const v = (id, statut, created_at, envoye_le = null, signe_le = null) => ({ id, statut, created_at, envoye_le, signe_le });

const V1_ENVOYE = v("v1", "envoye", "2026-11-01T08:00:00Z", "2026-11-01T09:00:00Z");
const V1_SIGNE = v("v1", "envoye", "2026-11-01T08:00:00Z", "2026-11-01T09:00:00Z", "2026-11-03T18:00:00Z");
const V2_BROUILLON = v("v2", "brouillon", "2026-11-04T08:00:00Z");
const V2_ENVOYE = v("v2", "envoye", "2026-11-04T08:00:00Z", "2026-11-04T09:00:00Z");

test("un seul devis envoyé : c'est lui qu'on facture", () => {
  assert.equal(choisirDevisAFacturer([V1_ENVOYE])?.id, "v1");
});

test("v1 signée, v2 en brouillon : on facture v1 (jamais le brouillon)", () => {
  assert.equal(choisirDevisAFacturer([V2_BROUILLON, V1_SIGNE])?.id, "v1");
});

test("v1 signée, v2 envoyée ensuite : on facture quand même la version signée", () => {
  assert.equal(choisirDevisAFacturer([V2_ENVOYE, V1_SIGNE])?.id, "v1");
});

test("acceptation notée à la main : la dernière version envoyée", () => {
  assert.equal(choisirDevisAFacturer([V2_ENVOYE, V1_ENVOYE])?.id, "v2");
});

test("que des brouillons ou des refus : rien à facturer", () => {
  assert.equal(choisirDevisAFacturer([V2_BROUILLON, v("v1", "refuse", "2026-11-01T08:00:00Z")]), null);
  assert.equal(choisirDevisAFacturer([]), null);
});

test("v1 remplacée dès que v2 est envoyée, pas avant", () => {
  assert.equal(estRemplace(V1_ENVOYE, [V1_ENVOYE, V2_BROUILLON]), false);
  assert.equal(estRemplace(V1_ENVOYE, [V1_ENVOYE, V2_ENVOYE]), true);
  assert.equal(estRemplace(V2_ENVOYE, [V1_ENVOYE, V2_ENVOYE]), false);
});

test("une version signée n'est jamais « remplacée »", () => {
  assert.equal(estRemplace(V1_SIGNE, [V1_SIGNE, V2_ENVOYE]), false);
});

test("autre version signée : repérée seulement sur la version non signée", () => {
  assert.equal(autreVersionSignee(V2_ENVOYE, [V1_SIGNE, V2_ENVOYE])?.id, "v1");
  assert.equal(autreVersionSignee(V1_SIGNE, [V1_SIGNE, V2_ENVOYE]), null);
  assert.equal(autreVersionSignee(V2_ENVOYE, [V1_ENVOYE, V2_ENVOYE]), null);
});

// Numérotation des devis (12/11, lib/devis/numero.ts).
import { numeroSuivant } from "./numero.ts";

test("numéro suivant : le plus grand pris + 1, pas le nombre de devis", () => {
  assert.equal(numeroSuivant([], 2027), "2027-001");
  assert.equal(numeroSuivant(["2027-001", "2027-003"], 2027), "2027-004");
  assert.equal(numeroSuivant(["2026-041", "2027-002"], 2027), "2027-003");
  assert.equal(numeroSuivant(["2027-999"], 2027), "2027-1000");
  assert.equal(numeroSuivant(["2027-1000", "2027-999", null], 2027), "2027-1001");
});
