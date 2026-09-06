import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrganisationId } from "@/lib/organisation";

// ============================================================
// Export comptable (06/09) — un CSV simple, pensé pour être transmis tel
// quel à un comptable ou importé dans un logiciel de comptabilité/
// facturation externe. Ne prétend pas être un format d'échange normalisé
// (FEC, Factur-X...) : juste un récapitulatif lisible par un tableur,
// cohérent avec ce que Compyo sait faire aujourd'hui sans dépendance
// supplémentaire. Voir le rapport livré à Axel pour la piste d'un vrai
// export Factur-X si besoin plus tard.
// ============================================================

function echapperCsv(valeur: string): string {
  // Un point-virgule, un guillemet ou un retour à la ligne dans une valeur
  // casserait la structure du CSV — on entoure de guillemets et on double
  // les guillemets internes, la règle standard.
  if (/[;"\n]/.test(valeur)) {
    return `"${valeur.replace(/"/g, '""')}"`;
  }
  return valeur;
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const organisationId = await getOrganisationId(supabase, user.id);
  if (!organisationId) {
    return NextResponse.json({ error: "Aucune organisation associée à ce compte" }, { status: 400 });
  }

  const { data: factures, error } = await supabase
    .from("factures")
    .select("numero, type, statut, date_emission, sous_total_ht, tva_pct, montant_tva, total_ttc, demande_id, demandes(nom_client)")
    .eq("organisation_id", organisationId)
    .order("date_emission", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Impossible de charger les factures" }, { status: 500 });
  }

  const entetes = ["Numéro", "Type", "Statut", "Date d'émission", "Client", "Total HT", "TVA (%)", "Montant TVA", "Total TTC"];
  const lignes = (factures ?? []).map((f) => {
    const nomClient = Array.isArray(f.demandes) ? f.demandes[0]?.nom_client : (f.demandes as { nom_client?: string } | null)?.nom_client;
    return [
      f.numero,
      f.type,
      f.statut,
      new Date(f.date_emission).toLocaleDateString("fr-FR"),
      nomClient ?? "",
      Number(f.sous_total_ht).toFixed(2).replace(".", ","),
      Number(f.tva_pct).toString().replace(".", ","),
      Number(f.montant_tva).toFixed(2).replace(".", ","),
      Number(f.total_ttc).toFixed(2).replace(".", ","),
    ]
      .map((v) => echapperCsv(String(v)))
      .join(";");
  });

  // BOM UTF-8 en tête : sans lui, Excel (très répandu chez les
  // comptables) interprète les accents comme des caractères invalides à
  // l'ouverture directe du fichier.
  const csv = "﻿" + [entetes.join(";"), ...lignes].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="compyo-factures-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
