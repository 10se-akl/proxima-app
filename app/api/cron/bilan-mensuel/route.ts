import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculerBilanMensuel, bilanEstVide } from "@/lib/bilan-mensuel";
import { envoyerBilanMensuel } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

// ============================================================
// Cron du bilan mensuel (08/09) — voir Module 32, supabase/schema.sql, et
// docs/idees-futures.md pour le raisonnement produit complet. Même
// protection CRON_SECRET fail-closed, même déclenchement externe
// (cron-job.org ou équivalent) que app/api/cron/rappels/route.ts — voir ce
// fichier pour le détail de la logique de sécurité, identique ici.
//
// À programmer pour tourner une fois par mois (ex : le 2 à 8h). Calcule
// toujours le MOIS CALENDAIRE PRÉCÉDENT complet, jamais le mois en cours
// (qui n'est pas terminé).
//
// L'envoi d'email est best-effort et sauté silencieusement tant que
// RESEND_FROM_EMAIL n'est pas configuré (voir lib/email.ts) — le bilan
// reste de toute façon consultable dans l'app à tout moment.
// ============================================================

export const maxDuration = 60;

function moisPrecedent(): { debut: Date; fin: Date } {
  const maintenant = new Date();
  const debut = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);
  const fin = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  return { debut, fin };
}

export async function GET(request: NextRequest) {
  const secretAttendu = process.env.CRON_SECRET;
  if (!secretAttendu) {
    console.error("CRON_SECRET absent — appel du cron de bilan mensuel refusé.");
    return NextResponse.json({ error: "Non configuré" }, { status: 503 });
  }
  const enTete = request.headers.get("authorization");
  if (enTete !== `Bearer ${secretAttendu}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { debut, fin } = moisPrecedent();

  const { data: organisations, error } = await supabase.from("organisations").select("id, cree_par");

  if (error) {
    return NextResponse.json({ error: "Erreur de lecture des organisations" }, { status: 500 });
  }
  if (!organisations || organisations.length === 0) {
    return NextResponse.json({ traitees: 0, envoyees: 0 });
  }

  let traitees = 0;
  let envoyees = 0;

  for (const org of organisations) {
    try {
      const bilan = await calculerBilanMensuel(supabase, org.id, debut, fin);
      traitees += 1;

      // Rien d'utile à montrer/envoyer pour une organisation sans aucune
      // activité ce mois-là — évite le bruit d'un email vide.
      if (bilanEstVide(bilan)) continue;

      const { data: authUser } = await supabase.auth.admin.getUserById(org.cree_par);
      const destinataire = authUser?.user?.email;
      if (!destinataire) continue;

      const { data: profil } = await supabase
        .from("profils")
        .select("nom")
        .eq("id", org.cree_par)
        .maybeSingle();
      const prenom = (profil?.nom ?? "").split(" ")[0] || "vous";

      await envoyerBilanMensuel({
        destinataire,
        prenom,
        bilan,
        urlBilan: `${SITE_URL}/dashboard/bilan`,
      });
      envoyees += 1;
    } catch (err) {
      // Un échec (envoi email, calcul) sur UNE organisation ne doit jamais
      // interrompre le traitement des autres — même logique que le cron de
      // rappels, qui isole chaque envoi individuellement.
      console.error("Échec du bilan mensuel pour l'organisation", org.id, err);
    }
  }

  return NextResponse.json({ traitees, envoyees });
}
