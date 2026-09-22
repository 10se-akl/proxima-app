import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aujourdhuiParis } from "@/lib/moisParis";
import {
  appareilDepuisUA,
  cheminExclu,
  cheminPropre,
  estRobot,
  navigateurDepuisUA,
  origineDepuisReferent,
} from "@/lib/statistiques/audience";

// ============================================================
// Une page vue (Module 44, 22/09) — appelée par components/
// MesureAudience.tsx à chaque changement de page.
//
// Ce qui est enregistré : la page (sans identifiant), le site d'origine
// (son nom seulement), l'appareil, le navigateur, le pays. Ce qui ne l'est
// JAMAIS : l'adresse IP, un cookie, un compte.
//
// Pour compter les visiteurs sans les suivre : une empreinte calculée à
// partir de l'IP et du navigateur, mélangée à un secret qui CHANGE CHAQUE
// JOUR. Le même visiteur a la même empreinte toute la journée (on le
// compte une fois), puis une autre le lendemain (impossible de le suivre
// d'un jour à l'autre). L'IP sert au calcul et n'est gardée nulle part.
//
// Cette route ne renvoie jamais d'erreur au visiteur : la mesure
// d'audience ne doit en aucun cas gêner la navigation.
// ============================================================

const RIEN = () => new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest) {
  // En développement, le serveur local est branché sur la VRAIE base :
  // chaque page ouverte en codant fausserait les statistiques d'Axel.
  if (process.env.NODE_ENV !== "production") return RIEN();
  try {
    const corps = await request.json().catch(() => null);
    const ua = request.headers.get("user-agent") ?? "";
    if (!corps || estRobot(ua)) return RIEN();

    const chemin = cheminPropre(corps.chemin);
    if (!chemin || cheminExclu(chemin)) return RIEN();

    // Axel ne se compte pas lui-même. Vérifié seulement si un cookie de
    // session existe : pour un visiteur anonyme — l'immense majorité —
    // aucun appel au serveur d'authentification.
    const connecte = request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
    if (connecte) {
      const { data } = await createClient().auth.getUser();
      if (data.user?.email && data.user.email === process.env.ADMIN_EMAIL) return RIEN();
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "inconnue";
    const { annee, mois, jour } = aujourdhuiParis();
    const secretDuJour = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "compyo")
      .update(`${annee}-${mois}-${jour}`)
      .digest();
    const visiteur = createHmac("sha256", secretDuJour).update(`${ip}|${ua}`).digest("hex").slice(0, 32);

    const hote = request.headers.get("host") ?? "compyo.fr";
    const source = typeof corps.source === "string" ? corps.source.trim().toLowerCase().slice(0, 60) : null;

    const { error } = await createClient().rpc("enregistrer_visite", {
      p_chemin: chemin,
      p_origine: origineDepuisReferent(typeof corps.referent === "string" ? corps.referent : null, hote),
      p_appareil: appareilDepuisUA(ua, corps.tactile === true),
      p_navigateur: navigateurDepuisUA(ua),
      // Fourni par Vercel à partir de l'IP ; absent en local.
      p_pays: request.headers.get("x-vercel-ip-country"),
      p_visiteur: visiteur,
      p_source: source || null,
    });
    if (error) console.error("Mesure d'audience : visite non enregistrée —", error.message);
  } catch (err) {
    console.error("Mesure d'audience :", err);
  }
  return RIEN();
}
