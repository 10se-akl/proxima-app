import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculerBilanMensuel, bilanEstVide } from "@/lib/bilan-mensuel";
import { envoyerBilanMensuel } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { bornes, cle, decaler, moisCourant } from "@/lib/moisParis";

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

// 21/09 — À l'heure de Paris : le serveur tourne en UTC, et
// `new Date(année, mois, 1)` y tombait à 2 h du matin l'été. Un devis
// accepté le 1er à 1 h passait dans le mauvais mois (voir lib/moisParis.ts).
function moisPrecedent(): { debut: Date; fin: Date } {
  return bornes(decaler(moisCourant(), -1));
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
  // L'email parle du mois écoulé : son lien doit ouvrir CE mois-là. La page
  // s'ouvre sinon sur le mois en cours (voir app/dashboard/bilan/page.tsx).
  const moisDuBilan = cle(decaler(moisCourant(), -1));

  const { data: organisations, error } = await supabase.from("organisations").select("id, cree_par");

  if (error) {
    return NextResponse.json({ error: "Erreur de lecture des organisations" }, { status: 500 });
  }
  if (!organisations || organisations.length === 0) {
    return NextResponse.json({ traitees: 0, envoyees: 0 });
  }

  // Audit performance (11/09) — même correctif que les deux autres crons
  // (rappels, relance-devis) : un for...of séquentiel sur TOUTES les
  // organisations, avec plusieurs requêtes par organisation
  // (calculerBilanMensuel fait déjà 6 requêtes, plus getUserById, plus
  // profils, plus l'envoi d'email), dépasserait maxDuration bien avant que
  // le nombre d'organisations ne devienne réellement grand. Les
  // organisations sont indépendantes : Promise.allSettled fait dépendre le
  // temps total de la plus lente, pas de leur somme. L'échec de l'ENVOI
  // seul reste capté par le try/catch interne (pour ne pas faire échouer
  // "traitees" quand seul le calcul a réussi, exactement comme avant) ;
  // un échec du CALCUL lui-même fait rejeter la promesse entière de cette
  // organisation, capté par le .forEach ci-dessous.
  const resultats = await Promise.allSettled(
    organisations.map(async (org) => {
      const bilan = await calculerBilanMensuel(supabase, org.id, debut, fin);

      let envoyee = false;
      try {
        // Rien d'utile à montrer/envoyer pour une organisation sans aucune
        // activité ce mois-là — évite le bruit d'un email vide.
        if (!bilanEstVide(bilan)) {
          const { data: authUser } = await supabase.auth.admin.getUserById(org.cree_par);
          const destinataire = authUser?.user?.email;
          if (destinataire) {
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
              urlBilan: `${SITE_URL}/dashboard/bilan?mois=${moisDuBilan}`,
            });
            envoyee = true;
          }
        }
      } catch (err) {
        console.error("Échec de l'envoi du bilan mensuel pour l'organisation", org.id, err);
      }
      return envoyee;
    })
  );

  let traitees = 0;
  let envoyees = 0;
  resultats.forEach((resultat, i) => {
    if (resultat.status === "fulfilled") {
      traitees += 1;
      if (resultat.value) envoyees += 1;
    } else {
      // Un échec du CALCUL (pas de l'envoi) sur UNE organisation ne doit
      // jamais interrompre le traitement des autres.
      console.error("Échec du bilan mensuel pour l'organisation", organisations[i].id, resultat.reason);
    }
  });

  return NextResponse.json({ traitees, envoyees });
}
