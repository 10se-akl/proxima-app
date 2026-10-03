// Vérifie les jours du planning (refonte 03/10, duel G). Sans dépendance :
//   node --test components/planning/semaine.test.mjs
// (Node 22.18 ou plus récent lit directement le TypeScript de semaine.ts.)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ajouterJours,
  aujourdhuiCle,
  cleParis,
  creneauParDefaut,
  dureeEnLettres,
  fenetreGlissante,
  fenetreSemaine,
  grouperParJour,
  heureChamp,
  heureEnLettres,
  instantParis,
  jourSemaine,
  libelleChoix,
  libelleFenetre,
  quoiDuRendezVous,
} from "./semaine.ts";

test("cleParis : le jour à Paris, pas en UTC", () => {
  // 23 h 30 UTC un 2 octobre = 1 h 30 le 3 octobre à Paris (heure d'été).
  assert.equal(cleParis(new Date("2026-10-02T23:30:00Z")), "2026-10-03");
  // 22 h 30 UTC un 2 octobre = 0 h 30 le 3 octobre à Paris (heure d'été).
  assert.equal(cleParis("2026-10-02T22:30:00Z"), "2026-10-03");
  // 21 h 30 UTC = 23 h 30 à Paris : encore le 2.
  assert.equal(cleParis("2026-10-02T21:30:00Z"), "2026-10-02");
  // L'hiver : 23 h 30 UTC = 0 h 30 le lendemain.
  assert.equal(cleParis("2026-01-15T23:30:00Z"), "2026-01-16");
});

test("instantParis : l'heure de Paris, été comme hiver", () => {
  assert.equal(instantParis("2026-10-03", "08:00").toISOString(), "2026-10-03T06:00:00.000Z");
  assert.equal(instantParis("2026-01-15", "08:00").toISOString(), "2026-01-15T07:00:00.000Z");
  assert.equal(instantParis("2026-10-03").toISOString(), "2026-10-02T22:00:00.000Z");
});

test("instantParis : les jours de changement d'heure", () => {
  // Le 25 octobre 2026, on repasse à l'heure d'hiver à 3 h : minuit est encore en été (UTC+2)...
  assert.equal(instantParis("2026-10-25").toISOString(), "2026-10-24T22:00:00.000Z");
  // ... et 8 h est en hiver (UTC+1).
  assert.equal(instantParis("2026-10-25", "08:00").toISOString(), "2026-10-25T07:00:00.000Z");
  // Le 29 mars 2026, on passe à l'heure d'été : minuit en hiver, 8 h en été.
  assert.equal(instantParis("2026-03-29").toISOString(), "2026-03-28T23:00:00.000Z");
  assert.equal(instantParis("2026-03-29", "08:00").toISOString(), "2026-03-29T06:00:00.000Z");
  // Aller-retour.
  assert.equal(heureChamp(instantParis("2026-10-25", "08:00")), "08:00");
  assert.equal(cleParis(instantParis("2026-10-25", "08:00")), "2026-10-25");
});

test("ajouterJours et jourSemaine", () => {
  assert.equal(ajouterJours("2026-10-30", 3), "2026-11-02");
  assert.equal(ajouterJours("2026-01-01", -1), "2025-12-31");
  assert.equal(jourSemaine("2026-10-03"), 6); // samedi
  assert.equal(jourSemaine("2026-10-04"), 0); // dimanche
  assert.equal(jourSemaine("2026-10-05"), 1); // lundi
});

test("fenetreGlissante : sept jours à partir d'aujourd'hui à Paris", () => {
  // 23 h UTC le 2 octobre = 1 h le 3 à Paris : la fenêtre commence le 3.
  const f = fenetreGlissante(new Date("2026-10-02T23:00:00Z"), 0);
  assert.deepEqual(f.jours, ["2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"]);
  assert.equal(f.debut.toISOString(), "2026-10-02T22:00:00.000Z");
  assert.equal(f.fin.toISOString(), "2026-10-09T22:00:00.000Z");
  // Les flèches avancent de sept jours.
  assert.equal(fenetreGlissante(new Date("2026-10-02T23:00:00Z"), 1).jours[0], "2026-10-10");
  assert.equal(fenetreGlissante(new Date("2026-10-02T23:00:00Z"), -1).jours[0], "2026-09-26");
});

test("fenetreSemaine : du lundi au dimanche", () => {
  // Samedi 3 octobre 2026 : la semaine va du lundi 28 septembre au dimanche 4 octobre.
  const f = fenetreSemaine(new Date("2026-10-03T10:00:00Z"), 0);
  assert.equal(f.jours[0], "2026-09-28");
  assert.equal(f.jours[6], "2026-10-04");
  // Un dimanche appartient à la semaine qui finit.
  assert.equal(fenetreSemaine(new Date("2026-10-04T10:00:00Z"), 0).jours[0], "2026-09-28");
  // Un lundi ouvre la sienne.
  assert.equal(fenetreSemaine(new Date("2026-10-05T10:00:00Z"), 0).jours[0], "2026-10-05");
  assert.equal(fenetreSemaine(new Date("2026-10-03T10:00:00Z"), 1).jours[0], "2026-10-05");
});

test("heures et durées", () => {
  assert.equal(heureEnLettres("2026-10-03T06:00:00Z"), "8h00");
  assert.equal(heureEnLettres("2026-10-03T12:30:00Z"), "14h30");
  assert.equal(heureChamp("2026-10-03T06:05:00Z"), "08:05");
  assert.equal(dureeEnLettres(45), "45 min");
  assert.equal(dureeEnLettres(60), "1 h");
  assert.equal(dureeEnLettres(105), "1 h 45");
});

test("libellés", () => {
  assert.equal(libelleChoix("2026-10-03", "2026-10-03"), "Aujourd'hui");
  assert.equal(libelleChoix("2026-10-04", "2026-10-03"), "Demain");
  assert.equal(libelleChoix("2026-10-05", "2026-10-03"), "Lun. 5");
  assert.equal(libelleFenetre("2026-10-05", "2026-10-11"), "5 – 11 octobre");
  assert.equal(libelleFenetre("2026-09-28", "2026-10-04"), "28 septembre – 4 octobre");
});

test("grouperParJour : un groupe par jour, et le week-end vide fondu", () => {
  const jours = ["2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"]; // ven, sam, dim, lun
  const rdv = (id, iso) => ({ id, date_heure: iso });
  const g = grouperParJour(jours, [
    rdv("b", "2026-10-05T12:00:00Z"),
    rdv("a", "2026-10-05T06:00:00Z"),
    rdv("v", "2026-10-02T08:00:00Z"),
  ]);
  assert.deepEqual(g.map((x) => x.cles), [["2026-10-02"], ["2026-10-03", "2026-10-04"], ["2026-10-05"]]);
  assert.deepEqual(g[2].evenements.map((e) => e.id), ["a", "b"]);

  // Un samedi occupé : pas de fusion.
  const g2 = grouperParJour(jours, [rdv("s", "2026-10-03T08:00:00Z")]);
  assert.deepEqual(g2.map((x) => x.cles), [["2026-10-02"], ["2026-10-03"], ["2026-10-04"], ["2026-10-05"]]);

  // Un dimanche seul au début de la fenêtre : pas de samedi avant lui.
  const g3 = grouperParJour(["2026-10-04", "2026-10-05"], []);
  assert.deepEqual(g3.map((x) => x.cles), [["2026-10-04"], ["2026-10-05"]]);

  // Un événement tard le soir compte pour son jour à Paris (23 h 30 UTC = 1 h 30 le lendemain).
  const g4 = grouperParJour(["2026-10-02", "2026-10-03"], [rdv("n", "2026-10-02T23:30:00Z")]);
  assert.equal(g4[0].evenements.length, 0);
  assert.equal(g4[1].evenements.length, 1);
});

test("quoiDuRendezVous : ne répète pas le client", () => {
  assert.equal(quoiDuRendezVous("Chantier Dupont", "Dupont"), "Chantier");
  assert.equal(quoiDuRendezVous("Chantier Dupont · Salle de bain", "Dupont"), "Chantier · Salle de bain");
  assert.equal(quoiDuRendezVous("Rendez-vous Dupont", "Dupont"), "Rendez-vous");
  assert.equal(quoiDuRendezVous("Visite chez Dupont", "Dupont"), "Visite");
  assert.equal(quoiDuRendezVous("Dupont", "Dupont"), "Dupont");
  assert.equal(quoiDuRendezVous("Métré salle de bains", "M. Durand"), "Métré salle de bains");
  assert.equal(quoiDuRendezVous("Rappeler Durand", null), "Rappeler Durand");
  assert.equal(quoiDuRendezVous("Chantier SCI (Les Jardins)", "SCI (Les Jardins)"), "Chantier");
});

test("creneauParDefaut : demain, l'heure du dernier rendez-vous, sinon 8 h pour 1 h", () => {
  const maintenant = new Date("2026-10-03T10:00:00Z");
  assert.deepEqual(creneauParDefaut(null, maintenant), { jour: "2026-10-04", heure: "08:00", duree: 60 });
  assert.deepEqual(creneauParDefaut({ date_heure: "2026-09-30T15:30:00Z", duree_minutes: 90 }, maintenant), {
    jour: "2026-10-04",
    heure: "17:30",
    duree: 90,
  });
  assert.deepEqual(creneauParDefaut({ date_heure: "2026-09-30T06:00:00Z", duree_minutes: null }, maintenant), {
    jour: "2026-10-04",
    heure: "08:00",
    duree: 60,
  });
  // Tard le soir à Paris, « demain » est bien le lendemain de Paris.
  assert.equal(creneauParDefaut(null, new Date("2026-10-02T23:30:00Z")).jour, "2026-10-04");
  assert.equal(aujourdhuiCle(new Date("2026-10-02T23:30:00Z")), "2026-10-03");
});
