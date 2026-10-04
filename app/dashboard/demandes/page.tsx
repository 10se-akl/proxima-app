import { createClient } from "@/lib/supabase/server";
import { getOrganisationId } from "@/lib/organisation";
import { ListeProjetsRecherchable } from "@/components/dashboard/ListeProjetsRecherchable";
import { AstucePartage } from "@/components/onboarding/AstucePartage";
import type { Projet } from "@/types";
import { prochainRendezVous } from "@/lib/projetAffichage";

export default async function ProjetsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const organisationId = user ? await getOrganisationId(supabase, user.id) : null;

  // Refonte visuelle (04/10) : les prochains rendez-vous en même temps que
  // les projets, pour « Rendez-vous demain à 9h » sur chaque ligne.
  const [{ data: projets }, { data: rdvs }] = organisationId
    ? await Promise.all([
        supabase.from("demandes").select("*").eq("organisation_id", organisationId).order("created_at", { ascending: false }),
        supabase
          .from("evenements_planning")
          .select("demande_id, date_heure")
          .eq("organisation_id", organisationId)
          .eq("type", "rendez_vous")
          .eq("statut", "a_faire")
          .gte("date_heure", new Date().toISOString())
          .order("date_heure", { ascending: true }),
      ])
    : [{ data: [] as Projet[] | null }, { data: [] as { demande_id: string | null; date_heure: string }[] | null }];
  const liste = (projets as Projet[] | null) ?? [];

  const infos: Record<string, string> = {};
  for (const r of rdvs ?? []) {
    if (r.demande_id && !infos[r.demande_id]) infos[r.demande_id] = prochainRendezVous(r.date_heure);
  }

  // La première photo de chaque projet : un seul appel groupé pour les URLs
  // signées (le stockage est privé). Un échec n'enlève que les photos.
  const photos: Record<string, string> = {};
  const parChemin = new Map<string, string>();
  for (const p of liste) if (typeof p.photos?.[0] === "string" && p.photos[0]) parChemin.set(p.photos[0], p.id);
  if (parChemin.size > 0) {
    try {
      const { data } = await supabase.storage.from("photos").createSignedUrls(Array.from(parChemin.keys()), 3600);
      for (const item of data ?? []) {
        const id = item.path ? parChemin.get(item.path) : undefined;
        if (id && item.signedUrl && !item.error) photos[id] = item.signedUrl;
      }
    } catch (erreur) {
      console.error("Projets : miniatures indisponibles", erreur);
    }
  }

  return (
    <div className="px-4 pt-4 pb-8 sm:p-8 max-w-4xl">
      {/* 26/09 (lot C) — plus de bouton « Nouveau projet » ici : le [+] de
          la navigation est la seule porte d'entrée, partout. L'en-tête et
          la recherche vivent dans la liste (elle filtre en direct). */}
      <ListeProjetsRecherchable projets={liste} photos={photos} infos={infos} astuce={<AstucePartage />} />
    </div>
  );
}
