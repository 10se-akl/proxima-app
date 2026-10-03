import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// Signature électronique en ligne (08/09) — voir Module 31,
// supabase/schema.sql. Route PUBLIQUE (pas d'authentification) : c'est le
// client, depuis le lien reçu, qui accepte ou refuse. Toute la validation
// d'état (devis déjà répondu, projet déjà avancé, nom requis pour signer)
// vit dans la fonction Postgres repondre_devis_public(), jamais ici.
// IP + user-agent capturés côté serveur (jamais fournis par le client lui-
// même, qui pourrait mentir) : c'est cette combinaison, avec le nom saisi
// et le tracé, qui donne sa valeur probante à la signature électronique
// "simple" au sens eIDAS — voir le raisonnement complet dans schema.sql.
//
// Refonte (03/10, duel A) — F11 : la fonction était appelable en direct
// (/rest/v1/rpc) par n'importe qui ayant le lien, avec une IP et un
// navigateur inventés : la preuve de signature ne valait rien. Le Module
// 52 la réserve au serveur ; cette route l'appelle donc avec le client
// admin, et c'est elle seule qui fournit l'IP et le navigateur. Elle ne
// fait rien d'autre que cet appel, dont la fonction valide tout l'état.
// ============================================================

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) {
    return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  }
  let corps: { reponse?: string; nomSignataire?: string; signatureData?: string };
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const { reponse, nomSignataire, signatureData } = corps;

  if (reponse !== "accepte" && reponse !== "refuse") {
    return NextResponse.json({ error: "Réponse invalide" }, { status: 400 });
  }
  if (reponse === "accepte" && !nomSignataire?.trim()) {
    return NextResponse.json(
      { error: "Indiquez votre nom pour accepter et signer ce devis." },
      { status: 400 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;
  const userAgent = request.headers.get("user-agent");

  const { error } = await createAdminClient().rpc("repondre_devis_public", {
    p_devis_id: params.id,
    p_reponse: reponse,
    p_nom_signataire: nomSignataire?.trim() || null,
    p_signature_data: signatureData || null,
    p_ip: ip,
    p_user_agent: userAgent,
  });

  if (error) {
    console.error("repondre_devis_public a échoué :", error);
    // Les messages levés par la fonction Postgres (voir schema.sql) sont
    // déjà rédigés en français, clairs pour un client — sans risque à les
    // transmettre tels quels, contrairement à une erreur technique brute.
    return NextResponse.json(
      { error: error.message || "Impossible d'enregistrer votre réponse. Réessayez." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
