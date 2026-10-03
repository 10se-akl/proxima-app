import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/site";
import type { EtatRejoindre } from "./types";

// ============================================================
// Équipe, côté serveur (refonte 03/10, duel A). À n'importer que depuis
// des routes serveur : ces fonctions reçoivent le client admin.
//
// L'IDENTITÉ, C'EST LA BOÎTE MAIL. Un compte peut avoir été créé avec une
// adresse qu'on ne possède pas (la demande d'accès ne la vérifie pas).
// Rejoindre une équipe exige donc une session ouverte par un lien reçu
// dans cette boîte : invitation, lien de connexion ou réinitialisation du
// mot de passe. Supabase l'inscrit dans le jeton (« amr »).
// ============================================================

const METHODES_PREUVE = new Set(["invite", "magiclink", "otp", "recovery", "email/signup", "email_change"]);

/** La session a-t-elle été ouverte par un lien reçu dans la boîte mail ? */
export function preuveBoiteMail(accessToken: string | null | undefined, userId: string): boolean {
  if (!accessToken) return false;
  try {
    const charge = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString("utf8"));
    if (charge.sub !== userId) return false;
    const amr: unknown[] = Array.isArray(charge.amr) ? charge.amr : [];
    return amr.some((m) => {
      const methode = typeof m === "string" ? m : (m as { method?: string } | null)?.method;
      return typeof methode === "string" && METHODES_PREUVE.has(methode);
    });
  } catch {
    return false;
  }
}

/** L'invitation en cours la plus récente pour cette adresse, s'il y en a une. */
export async function invitationEnCours(admin: SupabaseClient, email: string) {
  if (!email) return null;
  const { data, error } = await admin
    .from("invitations")
    .select("id, organisation_id, prenom, invite_par")
    .eq("email", email)
    .is("acceptee_le", null)
    .is("annulee_le", null)
    .gt("expire_le", new Date().toISOString())
    .order("cree_le", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data ?? [])[0] ?? null;
}

async function nomEntreprise(admin: SupabaseClient, organisationId: string): Promise<string> {
  const { data, error } = await admin.from("organisations").select("nom").eq("id", organisationId).maybeSingle();
  if (error) throw error;
  return data?.nom ?? "votre entreprise";
}

async function nomPersonne(admin: SupabaseClient, userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data, error } = await admin.from("profils").select("nom").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data?.nom?.trim() || null;
}

/** Où en est ce compte vis-à-vis des équipes. Lève une erreur sur toute
 *  lecture en échec : l'appelant répond alors « Réessayer », jamais
 *  « accès retiré ». */
export async function etatRejoindre(
  admin: SupabaseClient,
  user: User,
  accessToken: string | null | undefined
): Promise<EtatRejoindre> {
  const email = (user.email ?? "").trim().toLowerCase();
  const enAttente = user.app_metadata?.acces === "en_attente";

  const { data: membre, error: erreurMembre } = await admin
    .from("memberships")
    .select("organisation_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (erreurMembre) throw erreurMembre;

  const invitation = await invitationEnCours(admin, email);

  if (membre) {
    if (invitation && invitation.organisation_id !== membre.organisation_id) {
      return { etat: "ailleurs", entreprise: await nomEntreprise(admin, invitation.organisation_id) };
    }
    return { etat: "membre", enAttente };
  }

  if (invitation) {
    const [entreprise, invitant] = await Promise.all([
      nomEntreprise(admin, invitation.organisation_id),
      nomPersonne(admin, invitation.invite_par),
    ]);
    return {
      etat: "invitation",
      invitation: { id: invitation.id, entreprise, invitant, prenom: invitation.prenom },
      preuve: preuveBoiteMail(accessToken, user.id),
      motDePasseRequis: enAttente,
      email,
    };
  }

  // A-t-il fait partie d'une équipe ? Le Module 48 garde la trace de
  // chaque retrait ; un profil sans équipe dit la même chose pour les
  // retraits plus anciens (un profil n'existe qu'à l'acceptation d'un
  // compte ou à l'arrivée dans une équipe).
  const [{ data: anciens, error: erreurAnciens }, { data: profil, error: erreurProfil }] = await Promise.all([
    admin.from("anciens_membres").select("user_id").eq("user_id", user.id).limit(1),
    admin.from("profils").select("id").eq("id", user.id).maybeSingle(),
  ]);
  if (erreurAnciens) throw erreurAnciens;
  if (erreurProfil) throw erreurProfil;
  if ((anciens ?? []).length > 0 || profil) return { etat: "retire" };

  return { etat: "aucune", enAttente };
}

/** Lien de connexion vers /rejoindre, pour une adresse qui a déjà un
 *  compte. Client « anonyme » sans session, en flux implicite : le lien
 *  marche sur n'importe quel appareil, pas seulement celui qui l'a
 *  demandé. Ne crée jamais de compte. */
export async function envoyerLienRejoindre(email: string): Promise<boolean> {
  const anonyme = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: "implicit" } }
  );
  const { error } = await anonyme.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${SITE_URL}/rejoindre` },
  });
  if (error) {
    console.error("Lien pour rejoindre une équipe non envoyé :", error.message);
    return false;
  }
  return true;
}

/** L'e-mail d'invitation. Adresse sans compte : invitation Supabase, la
 *  personne choisit son mot de passe et rejoint dans la foulée. Adresse
 *  qui a déjà un compte : lien de connexion vers /rejoindre. L'appelant
 *  ne sait jamais lequel des deux est parti. */
export async function envoyerEmailInvitation(
  admin: SupabaseClient,
  email: string,
  donnees: { invite_par: string; entreprise: string }
): Promise<boolean> {
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE_URL}/definir-mot-de-passe`,
    data: donnees,
  });
  if (!error) return true;
  const compteExistant =
    (error as { code?: string }).code === "email_exists" || /already (been )?registered/i.test(error.message);
  if (compteExistant) return envoyerLienRejoindre(email);
  console.error("Invitation non envoyée :", error.message);
  return false;
}
