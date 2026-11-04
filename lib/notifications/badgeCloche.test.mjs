// Tests du badge de la cloche (04/11/2026, lib/notifications/badgeCloche.ts).
//
//   node --test lib/notifications/badgeCloche.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

const { badgeCloche, libelleCloche } = await import("./badgeCloche.ts");

test("rien en attente : pas de badge", () => {
  assert.equal(badgeCloche({ rappelsDus: 0, messagesNonLus: 0, chantiersDuJour: 0 }), null);
  assert.equal(libelleCloche(null), "Notifications");
});

test("des chantiers seulement : un point rouge, pas de chiffre", () => {
  assert.deepEqual(badgeCloche({ rappelsDus: 0, messagesNonLus: 0, chantiersDuJour: 3 }), { genre: "point" });
});

test("un rappel demandé et dû : le chiffre 1", () => {
  const b = badgeCloche({ rappelsDus: 1, messagesNonLus: 0, chantiersDuJour: 0 });
  assert.equal(b.genre, "chiffre");
  assert.equal(b.texte, "1");
});

test("un message de Compyo non lu : le chiffre 1, même avec des chantiers", () => {
  const b = badgeCloche({ rappelsDus: 0, messagesNonLus: 1, chantiersDuJour: 2 });
  assert.equal(b.genre, "chiffre");
  assert.equal(b.valeur, 1);
});

test("rappels et messages s'additionnent ; au-delà de 9 : 9+", () => {
  assert.equal(badgeCloche({ rappelsDus: 2, messagesNonLus: 1, chantiersDuJour: 0 }).texte, "3");
  assert.equal(badgeCloche({ rappelsDus: 8, messagesNonLus: 4, chantiersDuJour: 0 }).texte, "9+");
  assert.equal(libelleCloche(badgeCloche({ rappelsDus: 2, messagesNonLus: 0, chantiersDuJour: 0 })), "Notifications : 2 en attente");
});
