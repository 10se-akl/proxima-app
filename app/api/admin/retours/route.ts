import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// Version ADMIN de app/api/retours/route.ts (voir Module 15 + Module 16,
// supabase/schema.sql) : contrairement à la route publique, celle-ci
// renvoie le détail NOMINATIF de chaque avis (artisan, organisation, type,
// texte original, pièce jointe, note, dates) et les champs générés par
// l'IA (résumé, propositions) — réservée exclusivement à
// process.env.ADMIN_EMAIL. Ne jamais réutiliser ce pattern pour une route
// accessible aux artisans.
// ============================================================

async function verifierAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email === process.env.ADMIN_EMAIL;
}

type AvisNominatif = {
  id: string;
  artisanNom: string;
  organisationNom: string;
  type: string;
  importance: number;
  texteOriginal: string | null;
  texteNettoye: string | null;
  pieceJointeUrl: string | null;
  createdAt: string;
};

type PointEvolution = { semaine: string; nombreAvis: number };

type ProblemeDetaille = {
  id: string;
  titre: string;
  description: string | null;
  resumeIa: string | null;
  propositionsIa: string | null;
  createdAt: string;
  nombreAvis: number;
  importanceMoyenne: number;
  evolution: PointEvolution[];
  avis: AvisNominatif[];
};

// Regroupe par semaine ISO (ex: "2026-S34") — assez fin pour voir une
// tendance monter sans être noyé dans des points quotidiens sur un
// produit encore en bêta privée à faible volume.
function cleSemaine(dateIso: string) {
  const d = new Date(dateIso);
  const debutAnnee = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const jours = Math.floor((d.getTime() - debutAnnee.getTime()) / 86400000);
  const semaine = Math.ceil((jours + debutAnnee.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-S${String(semaine).padStart(2, "0")}`;
}

export async function GET() {
  const estAdmin = await verifierAdmin();
  if (!estAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const admin = createAdminClient();

  const [
    { data: problemes, error: erreurProblemes },
    { data: avis, error: erreurAvis },
    { data: profils, error: erreurProfils },
    { data: organisations, error: erreurOrganisations },
  ] = await Promise.all([
    admin
      .from("problemes_produits")
      .select("id, titre, description, resume_ia, propositions_ia, created_at")
      .order("created_at", { ascending: true }),
    admin
      .from("retours_produits")
      .select(
        "id, probleme_id, organisation_id, user_id, type, importance, commentaire, texte_original, texte_nettoye, piece_jointe_chemin, created_at"
      ),
    admin.from("profils").select("id, nom"),
    admin.from("organisations").select("id, nom"),
  ]);

  if (erreurProblemes || erreurAvis || erreurProfils || erreurOrganisations) {
    console.error(erreurProblemes ?? erreurAvis ?? erreurProfils ?? erreurOrganisations);
    return NextResponse.json({ error: "Impossible de charger les retours" }, { status: 500 });
  }

  const nomParProfil = new Map((profils ?? []).map((p) => [p.id, p.nom as string]));
  const nomParOrganisation = new Map((organisations ?? []).map((o) => [o.id, o.nom as string]));

  // URLs signées groupées en un seul appel pour toutes les pièces jointes,
  // plutôt qu'un aller-retour par avis (même choix que PhotosProjet.tsx).
  const cheminsJoints = (avis ?? [])
    .map((a) => a.piece_jointe_chemin)
    .filter((c): c is string => Boolean(c));
  const urlParChemin = new Map<string, string>();
  if (cheminsJoints.length > 0) {
    const { data: urlsSignees } = await admin.storage
      .from("retours")
      .createSignedUrls(cheminsJoints, 3600);
    for (const item of urlsSignees ?? []) {
      if (item.signedUrl && !item.error && item.path) urlParChemin.set(item.path, item.signedUrl);
    }
  }

  const resultats: ProblemeDetaille[] = (problemes ?? []).map((p) => {
    const avisDuProbleme = (avis ?? [])
      .filter((a) => a.probleme_id === p.id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const nombreAvis = avisDuProbleme.length;
    const importanceMoyenne =
      nombreAvis > 0
        ? avisDuProbleme.reduce((somme, a) => somme + a.importance, 0) / nombreAvis
        : 0;

    const compteParSemaine = new Map<string, number>();
    for (const a of avisDuProbleme) {
      const cle = cleSemaine(a.created_at);
      compteParSemaine.set(cle, (compteParSemaine.get(cle) ?? 0) + 1);
    }
    const evolution: PointEvolution[] = Array.from(compteParSemaine.entries())
      .map(([semaine, nombreAvis]) => ({ semaine, nombreAvis }))
      .sort((a, b) => (a.semaine < b.semaine ? -1 : 1));

    return {
      id: p.id,
      titre: p.titre,
      description: p.description,
      resumeIa: p.resume_ia ?? null,
      propositionsIa: p.propositions_ia ?? null,
      createdAt: p.created_at,
      nombreAvis,
      importanceMoyenne: Math.round(importanceMoyenne * 10) / 10,
      evolution,
      avis: avisDuProbleme.map((a) => ({
        id: a.id,
        artisanNom: nomParProfil.get(a.user_id) ?? "Artisan inconnu",
        organisationNom: nomParOrganisation.get(a.organisation_id) ?? "Organisation inconnue",
        type: a.type ?? "probleme",
        importance: a.importance,
        texteOriginal: a.texte_original ?? a.commentaire,
        texteNettoye: a.texte_nettoye ?? a.commentaire,
        pieceJointeUrl: a.piece_jointe_chemin ? (urlParChemin.get(a.piece_jointe_chemin) ?? null) : null,
        createdAt: a.created_at,
      })),
    };
  });

  resultats.sort((a, b) => b.nombreAvis * b.importanceMoyenne - a.nombreAvis * a.importanceMoyenne);

  return NextResponse.json({ problemes: resultats });
}
