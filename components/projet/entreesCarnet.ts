import type { EvenementPlanning, EvenementProjet, Note, NoteVocale, TypeEvenementProjet } from "@/types";

// ============================================================
// Le Carnet d'un projet (24/09) — tout ce qui a été capturé ou s'est
// passé, dans un seul fil, du plus récent au plus ancien.
//
// Avant, la même vie de chantier était éparpillée dans six compartiments
// (notes vocales, notes, photos, historique…) : pour retrouver « la mesure
// de la fenêtre », il fallait savoir où on l'avait écrite. Ici, une seule
// question se pose : quand.
//
// Ce fichier ne dessine rien : il construit les entrées, les regroupe par
// période, filtre et cherche. Tout est pur (aucun appel réseau), donc
// testable tel quel.
// ============================================================

// Refonte (03/10, duel D lot 3) — « demande » : la demande du client (et
// le résumé IA de vos notes) quittent « À retenir » et deviennent la plus
// ancienne entrée du Carnet, là où on cherche.
export type TypeEntree = "vocal" | "photos" | "fait" | "evenement" | "rdv" | "demande";

export type EntreeCarnet = {
  id: string;
  type: TypeEntree;
  /** ISO — moment où la chose s'est passée. */
  date: string;
  titre: string;
  /** Le texte complet (transcription, détail d'un évènement). */
  texte?: string;
  /** Chemins de stockage des photos (entrée "photos"). */
  photos?: string[];
  typeEvenement?: TypeEvenementProjet;
  /** Refonte (03/10, duel A lot 4) — le prénom de l'auteur, seulement
   *  quand ce n'est pas l'utilisateur connecté : « Gérard · note dictée ».
   *  L'artisan seul n'en voit jamais. */
  auteur?: string;
  /** Sous le texte : le résumé IA de la demande (entrée « demande »). */
  complement?: { titre: string; texte: string };
};

export type FiltreCarnet = "tout" | "notes" | "photos" | "suivi";

export const FILTRES: { cle: FiltreCarnet; libelle: string; types: TypeEntree[] }[] = [
  { cle: "tout", libelle: "Tout", types: ["vocal", "photos", "fait", "evenement", "rdv", "demande"] },
  { cle: "notes", libelle: "Notes", types: ["vocal", "fait", "demande"] },
  { cle: "photos", libelle: "Photos", types: ["photos"] },
  { cle: "suivi", libelle: "Suivi", types: ["evenement", "rdv"] },
];

// Évènements qui doublonneraient une entrée déjà présente (la note vocale
// elle-même, les photos elles-mêmes, la note terminée), ou purement
// techniques. Le Carnet ne montre chaque chose qu'une fois.
const EVENEMENTS_EXCLUS = new Set<TypeEvenementProjet>([
  "chantier_pas_termine",
  "note_ajoutee",
  "note_vocale_ajoutee",
  "photo_ajoutee",
  "note_terminee",
  "journal_chantier_interprete",
]);

const FUSEAU = "Europe/Paris";
const formatJour = new Intl.DateTimeFormat("fr-CA", { timeZone: FUSEAU, year: "numeric", month: "2-digit", day: "2-digit" });

/** "2026-06-09" — le jour à Paris, quel que soit le fuseau du navigateur. */
export function cleJour(iso: string): string {
  return formatJour.format(new Date(iso));
}

function joursEntre(cleA: string, cleB: string): number {
  const a = Date.UTC(+cleA.slice(0, 4), +cleA.slice(5, 7) - 1, +cleA.slice(8, 10));
  const b = Date.UTC(+cleB.slice(0, 4), +cleB.slice(5, 7) - 1, +cleB.slice(8, 10));
  return Math.round((a - b) / 86400000);
}

/** Les photos sont envoyées sous « …/1749451234567-nom.jpg » : l'horodatage
 *  de l'envoi est dans le nom. Sans lui (anciennes photos, import), on se
 *  rabat sur une date connue du projet. */
export function datePhoto(chemin: string, repli: string): string {
  const m = chemin.match(/(?:^|\/)(\d{13})-/);
  if (!m) return repli;
  const t = Number(m[1]);
  return Number.isFinite(t) ? new Date(t).toISOString() : repli;
}

export function construireCarnet({
  notesVocales,
  photos,
  datePhotosRepli,
  notes,
  evenements,
  rendezVous,
  maintenant,
  demande,
  auteurs = {},
}: {
  /** Les prénoms des AUTRES membres, par identifiant (l'utilisateur
   *  connecté n'y est jamais : on ne se nomme pas soi-même). Un auteur
   *  absent n'affiche rien. */
  auteurs?: Record<string, string>;
  /** La demande du client, et le résumé IA s'il existe. */
  demande?: { texte: string; date: string; resume?: { texte: string; date: string | null } | null } | null;
  notesVocales: NoteVocale[];
  photos: string[];
  datePhotosRepli: string;
  notes: Note[];
  evenements: EvenementProjet[];
  rendezVous: EvenementPlanning[];
  maintenant: Date;
}): EntreeCarnet[] {
  const entrees: EntreeCarnet[] = [];

  for (const n of notesVocales) {
    entrees.push({ id: `vocal-${n.id}`, type: "vocal", date: n.created_at, titre: "Note dictée", texte: n.transcription, auteur: auteurs[n.artisan_id] });
  }

  // Les photos d'un même jour forment une seule entrée : « 6 photos »,
  // plutôt que six lignes.
  const parJour = new Map<string, { date: string; chemins: string[] }>();
  for (const chemin of photos) {
    const date = datePhoto(chemin, datePhotosRepli);
    const cle = cleJour(date);
    const groupe = parJour.get(cle);
    if (groupe) {
      groupe.chemins.push(chemin);
      if (date > groupe.date) groupe.date = date;
    } else {
      parJour.set(cle, { date, chemins: [chemin] });
    }
  }
  for (const [cle, g] of parJour) {
    entrees.push({
      id: `photos-${cle}`,
      type: "photos",
      date: g.date,
      titre: g.chemins.length > 1 ? `${g.chemins.length} photos` : "1 photo",
      photos: g.chemins,
    });
  }

  // Une note ne rejoint le Carnet qu'une fois faite : tant qu'elle est
  // active, elle vit dans « À faire ». Jamais les deux à la fois.
  for (const n of notes) {
    if (n.statut !== "terminee") continue;
    entrees.push({
      id: `fait-${n.id}`,
      type: "fait",
      date: n.termine_le ?? n.updated_at ?? n.created_at,
      titre: n.titre,
      texte: n.description ?? undefined,
      auteur: auteurs[n.artisan_id],
    });
  }

  for (const e of evenements) {
    if (EVENEMENTS_EXCLUS.has(e.type)) continue;
    entrees.push({
      id: `evt-${e.id}`,
      type: "evenement",
      date: e.created_at,
      titre: e.titre,
      texte: e.detail ?? undefined,
      typeEvenement: e.type,
      auteur: auteurs[e.artisan_id],
    });
  }

  // Les rendez-vous passés sont de l'histoire ; ceux à venir sont dans
  // « À faire ».
  for (const r of rendezVous) {
    if (r.statut === "annule") continue;
    if (new Date(r.date_heure) > maintenant) continue;
    entrees.push({
      id: `rdv-${r.id}`,
      type: "rdv",
      date: r.date_heure,
      titre: r.type === "tache" ? r.titre : `Rendez-vous · ${r.titre}`,
      texte: r.notes ?? undefined,
      auteur: auteurs[r.artisan_id],
    });
  }

  // Datée de la création du projet. À date égale (« Projet créé »), elle
  // passe en dernier : c'est la plus ancienne entrée.
  if (demande && demande.texte.trim()) {
    const resume = demande.resume?.texte.trim();
    entrees.push({
      id: "demande",
      type: "demande",
      date: demande.date,
      titre: "La demande",
      texte: demande.texte,
      complement: resume
        ? {
            titre: `Résumé de vos notes${
              demande.resume?.date
                ? ` · ${new Date(demande.resume.date).toLocaleDateString("fr-FR", { timeZone: FUSEAU, day: "numeric", month: "short" })}`
                : ""
            }`,
            texte: resume,
          }
        : undefined,
    });
  }

  return entrees.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (a.type === "demande" ? 1 : 0) - (b.type === "demande" ? 1 : 0);
  });
}

// ------------------------------------------------------------ recherche

/** Minuscules, sans accents : « fenetre » trouve « Fenêtre ». */
export function normaliser(texte: string): string {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function filtrerCarnet(entrees: EntreeCarnet[], filtre: FiltreCarnet, recherche: string): EntreeCarnet[] {
  const types = FILTRES.find((f) => f.cle === filtre)?.types ?? FILTRES[0].types;
  const mots = normaliser(recherche).split(/\s+/).filter(Boolean);
  return entrees.filter((e) => {
    if (!types.includes(e.type)) return false;
    if (mots.length === 0) return true;
    const texte = normaliser(`${e.auteur ?? ""} ${e.titre} ${e.texte ?? ""} ${e.complement?.texte ?? ""}`);
    return mots.every((m) => texte.includes(m));
  });
}

// ------------------------------------------------------------ périodes

export type Periode = {
  cle: string;
  libelle: string;
  entrees: EntreeCarnet[];
};

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function periodeDe(iso: string, cleAujourdhui: string): { cle: string; libelle: string } {
  const cle = cleJour(iso);
  const ecart = joursEntre(cleAujourdhui, cle);
  if (ecart <= 0) return { cle: "aujourdhui", libelle: "Aujourd'hui" };
  if (ecart === 1) return { cle: "hier", libelle: "Hier" };
  if (ecart < 7) return { cle: "semaine", libelle: "Cette semaine" };
  if (ecart < 14) return { cle: "semaine-derniere", libelle: "La semaine dernière" };
  const annee = cle.slice(0, 4);
  const mois = Number(cle.slice(5, 7));
  const moisCourant = cleAujourdhui.slice(0, 7) === cle.slice(0, 7);
  if (moisCourant) return { cle: `mois-${cle.slice(0, 7)}`, libelle: "Plus tôt ce mois-ci" };
  const memeAnnee = annee === cleAujourdhui.slice(0, 4);
  return { cle: `mois-${cle.slice(0, 7)}`, libelle: memeAnnee ? MOIS[mois - 1] : `${MOIS[mois - 1]} ${annee}` };
}

/** Regroupe des entrées déjà triées (plus récentes d'abord) par période. */
export function grouperParPeriode(entrees: EntreeCarnet[], maintenant: Date): Periode[] {
  const cleAujourdhui = cleJour(maintenant.toISOString());
  const periodes: Periode[] = [];
  for (const e of entrees) {
    const { cle, libelle } = periodeDe(e.date, cleAujourdhui);
    const derniere = periodes[periodes.length - 1];
    if (derniere && derniere.cle === cle) derniere.entrees.push(e);
    else periodes.push({ cle, libelle, entrees: [e] });
  }
  return periodes;
}

/** Combien de périodes montrer dépliées d'emblée : assez pour une bonne
 *  douzaine d'entrées, jamais moins d'une. Le reste se replie en une ligne
 *  — c'est ce qui garde un chantier d'un an aussi court qu'un chantier
 *  d'une semaine. */
export function periodesOuvertesParDefaut(periodes: Periode[], seuil = 12): Set<string> {
  const ouvertes = new Set<string>();
  let total = 0;
  for (const p of periodes) {
    if (ouvertes.size > 0 && total >= seuil) break;
    ouvertes.add(p.cle);
    total += p.entrees.length;
  }
  return ouvertes;
}

/** « 5 notes vocales · 12 photos · 3 étapes » — le résumé d'une période
 *  repliée. */
export function resumePeriode(entrees: EntreeCarnet[]): string {
  let vocales = 0;
  let photos = 0;
  let faits = 0;
  let suivi = 0;
  let demande = false;
  for (const e of entrees) {
    if (e.type === "demande") demande = true;
    else if (e.type === "vocal") vocales++;
    else if (e.type === "photos") photos += e.photos?.length ?? 0;
    else if (e.type === "fait") faits++;
    else suivi++;
  }
  const morceaux: string[] = [];
  if (demande) morceaux.push("la demande");
  if (vocales) morceaux.push(`${vocales} note${vocales > 1 ? "s" : ""} dictée${vocales > 1 ? "s" : ""}`);
  if (photos) morceaux.push(`${photos} photo${photos > 1 ? "s" : ""}`);
  if (faits) morceaux.push(`${faits} tâche${faits > 1 ? "s" : ""} faite${faits > 1 ? "s" : ""}`);
  if (suivi) morceaux.push(`${suivi} étape${suivi > 1 ? "s" : ""}`);
  return morceaux.join(" · ");
}
