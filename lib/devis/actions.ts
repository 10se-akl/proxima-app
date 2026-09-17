import type { SupabaseClient } from "@supabase/supabase-js";
import { enregistrerEvenement } from "@/lib/timeline";
import { figerMentionsLegales } from "@/lib/moteur-metier/genererFacture";
import { SITE_URL } from "@/lib/site";
import type { Devis, ParametresEntreprise } from "@/types";

// ============================================================
// Actions sur un devis (17/09), partagées par la fiche projet et l'espace
// devis. Avant, chaque écran aurait eu sa propre copie de ces requêtes —
// et tôt ou tard l'une aurait oublié l'instantané des mentions légales ou
// l'événement de la timeline.
//
// Chaque action renvoie un message prêt à afficher en cas d'échec, jamais
// une exception : l'écran décide où le montrer.
// ============================================================

export type ContexteAction = {
  supabase: SupabaseClient;
  artisanId: string | null;
  organisationId: string | null;
};

export type ResultatAction = { ok: true } | { ok: false; erreur: string };

async function evenement(
  ctx: ContexteAction,
  demandeId: string,
  type: Parameters<typeof enregistrerEvenement>[1]["type"],
  titre: string
) {
  if (!ctx.artisanId || !ctx.organisationId) return;
  await enregistrerEvenement(ctx.supabase, {
    demandeId,
    artisanId: ctx.artisanId,
    organisationId: ctx.organisationId,
    type,
    titre,
  });
}

export function lienSignature(devisId: string): string {
  return `${SITE_URL}/devis/${devisId}`;
}

export async function marquerDevisEnvoye(
  ctx: ContexteAction,
  {
    devis,
    demandeId,
    parametres,
  }: {
    devis: Pick<Devis, "id" | "mentions_legales" | "mention_tva_reduite">;
    demandeId: string;
    parametres: ParametresEntreprise | null;
  }
): Promise<ResultatAction> {
  const { data: d1, error: err1 } = await ctx.supabase
    .from("devis")
    .update({
      statut: "envoye",
      envoye_le: new Date().toISOString(),
      // Module 42 — les mentions légales se figent ICI, au moment où le
      // client reçoit le devis : c'est ce document-là qui l'engage. Avant,
      // elles suivent les paramètres, pour qu'un oubli corrigé se voie.
      // Jamais écrasé s'il existe déjà (le verrou en base l'interdit).
      ...(parametres && !devis.mentions_legales
        ? { mentions_legales: figerMentionsLegales(parametres, devis.mention_tva_reduite) }
        : {}),
    })
    .eq("id", devis.id)
    .select("id");
  if (err1 || !d1 || d1.length === 0) {
    if (err1) console.error("Marquer le devis envoyé :", err1);
    return { ok: false, erreur: "Impossible de marquer le devis comme envoyé. Réessayez." };
  }

  const { data: d2, error: err2 } = await ctx.supabase
    .from("demandes")
    .update({ statut: "devis_envoye" })
    .eq("id", demandeId)
    .select("id");
  if (err2 || !d2 || d2.length === 0) {
    return {
      ok: false,
      erreur: "Le devis est marqué envoyé, mais le statut du projet n'a pas pu être mis à jour. Rechargez la page.",
    };
  }

  await evenement(ctx, demandeId, "devis_envoye", "Devis envoyé au client");
  return { ok: true };
}

export async function marquerDevisAccepte(
  ctx: ContexteAction,
  { demandeId }: { demandeId: string }
): Promise<ResultatAction> {
  const { data, error } = await ctx.supabase
    .from("demandes")
    .update({ statut: "accepte", accepte_le: new Date().toISOString() })
    .eq("id", demandeId)
    .select("id");
  if (error || !data || data.length === 0) {
    return { ok: false, erreur: "Impossible d'enregistrer l'acceptation du devis. Réessayez." };
  }
  await evenement(ctx, demandeId, "devis_accepte", "Devis accepté par le client");
  return { ok: true };
}

export async function marquerDevisRefuse(
  ctx: ContexteAction,
  { devisId, demandeId }: { devisId: string; demandeId: string }
): Promise<ResultatAction> {
  const { data, error } = await ctx.supabase
    .from("devis")
    .update({ statut: "refuse" })
    .eq("id", devisId)
    .select("id");
  if (error || !data || data.length === 0) {
    return { ok: false, erreur: "Impossible d'enregistrer le refus du devis. Réessayez." };
  }
  await evenement(ctx, demandeId, "devis_refuse", "Devis refusé par le client");
  return { ok: true };
}

// Nouvelle version d'un devis : un brouillon qui reprend tout, avec son
// propre numéro. L'original reste intact.
export async function dupliquerDevis(
  ctx: ContexteAction,
  { devisId, demandeId }: { devisId: string; demandeId: string }
): Promise<{ ok: true; nouveauDevisId: string } | { ok: false; erreur: string }> {
  try {
    const res = await fetch("/api/devis/dupliquer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ devisId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.devis?.id) {
      return { ok: false, erreur: data?.error ?? "Impossible de dupliquer ce devis. Réessayez." };
    }
    await evenement(ctx, demandeId, "devis_genere", "Nouvelle version du devis");
    return { ok: true, nouveauDevisId: data.devis.id as string };
  } catch {
    return { ok: false, erreur: "Impossible de contacter le serveur. Vérifiez votre connexion et réessayez." };
  }
}

export function adresseEspaceDevis(devisId: string): string {
  return `/dashboard/devis/${devisId}`;
}
