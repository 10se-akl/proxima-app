import { createAdminClient } from "@/lib/supabase/admin";
import { METIERS } from "@/lib/metiers";
import type { Candidature } from "@/types";

// ============================================================
// Création du compte d'un candidat (Module 43, 21/09).
//
// La demande d'accès crée désormais le compte tout de suite, avec le mot
// de passe choisi par l'artisan, mais « en attente » : il ne donne accès à
// rien tant qu'Axel n'a pas accepté la candidature (voir middleware.ts et
// app/candidature-en-cours/page.tsx).
//
// ⚠️ SEULE EXCEPTION à la règle de lib/supabase/admin.ts (clé service_role
// jamais dans une route publique). Elle est nécessaire : le statut
// « en attente » doit être posé AU MOMENT de la création, dans
// app_metadata, que seule cette clé peut écrire — c'est précisément ce qui
// empêche un candidat de se valider lui-même. Et elle est bornée :
//   - les champs privilégiés sont des CONSTANTES (acces: "en_attente",
//     email_confirm) ; aucune donnée du visiteur n'y est jamais recopiée ;
//   - le visiteur ne fournit que ce qu'un formulaire public fournit déjà :
//     son identité, son métier, son mot de passe ;
//   - tout est validé ici, longueurs comprises, avant le moindre appel.
// Ne pas élargir ce fichier : une autre création de compte doit passer
// par une route d'administration.
//
// Le mot de passe n'est ni stocké, ni journalisé, ni renvoyé : il est
// transmis tel quel à Supabase Auth, qui le hache. Aucun console.* de ce
// fichier ne reçoit les données du formulaire.
// ============================================================

export const LONGUEUR_MIN_MOT_DE_PASSE = 8;
// bcrypt, utilisé par Supabase Auth, ignore tout au-delà de 72 octets.
const LONGUEUR_MAX_MOT_DE_PASSE = 72;

export type DonneesCandidat = {
  prenom: string;
  nom: string;
  entreprise: string | null;
  metier: string;
  telephone: string;
  email: string;
  motDePasse: string;
  nbEmployes: string | null;
  devisParSemaine: string | null;
  problemePrincipal: string;
  decouverte: string | null;
};

type Validation = { ok: true; donnees: DonneesCandidat } | { ok: false; message: string };

function texte(valeur: unknown, max: number): string {
  return typeof valeur === "string" ? valeur.trim().slice(0, max) : "";
}

function facultatif(valeur: unknown, max: number): string | null {
  const t = texte(valeur, max);
  return t === "" ? null : t;
}

export function validerCandidat(corps: unknown): Validation {
  const c = (corps ?? {}) as Record<string, unknown>;

  const donnees: DonneesCandidat = {
    prenom: texte(c.prenom, 80),
    nom: texte(c.nom, 80),
    entreprise: facultatif(c.entreprise, 120),
    metier: texte(c.metier, 60),
    telephone: texte(c.telephone, 30),
    email: texte(c.email, 254).toLowerCase(),
    // Pas de trim sur un mot de passe : une espace en fin peut être voulue.
    motDePasse: typeof c.motDePasse === "string" ? c.motDePasse : "",
    nbEmployes: facultatif(c.nbEmployes, 60),
    devisParSemaine: facultatif(c.devisParSemaine, 60),
    problemePrincipal: texte(c.problemePrincipal, 2000),
    decouverte: facultatif(c.decouverte, 300),
  };

  if (!donnees.prenom || !donnees.nom || !donnees.telephone || !donnees.problemePrincipal) {
    return { ok: false, message: "Merci de remplir tous les champs obligatoires." };
  }
  if (!METIERS.includes(donnees.metier)) {
    return { ok: false, message: "Choisissez votre métier dans la liste." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donnees.email)) {
    return { ok: false, message: "Cette adresse email ne semble pas valide." };
  }
  if (donnees.motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
    return {
      ok: false,
      message: `Choisissez un mot de passe d'au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`,
    };
  }
  if (new TextEncoder().encode(donnees.motDePasse).length > LONGUEUR_MAX_MOT_DE_PASSE) {
    return { ok: false, message: "Ce mot de passe est trop long (72 caractères au maximum)." };
  }
  if (c.motDePasseConfirmation !== donnees.motDePasse) {
    return { ok: false, message: "Les deux mots de passe ne sont pas identiques." };
  }

  return { ok: true, donnees };
}

export type ResultatCreation =
  | { ok: true; candidature: Candidature }
  | { ok: false; raison: "email_existant" | "erreur"; message: string };

export async function creerCompteCandidat(d: DonneesCandidat): Promise<ResultatCreation> {
  const admin = createAdminClient();

  const { data: cree, error: erreurCompte } = await admin.auth.admin.createUser({
    email: d.email,
    password: d.motDePasse,
    // Pas d'email de confirmation : choix d'Axel (21/09). C'est sa
    // validation manuelle de chaque candidature qui fait office de
    // vérification — il voit le nom, l'entreprise et le téléphone.
    email_confirm: true,
    // LE point de sécurité de tout le parcours : posé ici, à la création,
    // par la seule clé qui peut l'écrire. Constante, jamais une donnée du
    // formulaire.
    app_metadata: { acces: "en_attente" },
    // Le strict nécessaire : ces métadonnées voyagent dans chaque cookie
    // de session. Le reste de la candidature vit dans sa table.
    user_metadata: { prenom: d.prenom, nom: d.nom },
  });

  if (erreurCompte || !cree?.user) {
    const message = erreurCompte?.message?.toLowerCase() ?? "";
    if (
      erreurCompte?.code === "email_exists" ||
      message.includes("already been registered") ||
      message.includes("already registered")
    ) {
      return {
        ok: false,
        raison: "email_existant",
        message: "Un compte existe déjà avec cette adresse email.",
      };
    }
    console.error("Candidature : création du compte refusée par Supabase Auth —", erreurCompte?.message);
    return { ok: false, raison: "erreur", message: "Impossible de créer votre compte. Réessayez dans un instant." };
  }

  const { data: candidature, error: erreurCandidature } = await admin
    .from("candidatures")
    .insert({
      user_id: cree.user.id,
      nom: d.nom,
      prenom: d.prenom,
      entreprise: d.entreprise,
      metier: d.metier,
      telephone: d.telephone,
      email: d.email,
      nb_employes: d.nbEmployes,
      devis_par_semaine: d.devisParSemaine,
      probleme_principal: d.problemePrincipal,
      decouverte: d.decouverte,
    })
    .select("*")
    .single();

  if (erreurCandidature || !candidature) {
    // Jamais de compte sans candidature : Axel ne le verrait nulle part, et
    // l'artisan resterait bloqué « en attente » pour toujours. On annule.
    console.error("Candidature : enregistrement impossible, compte annulé —", erreurCandidature?.message);
    const { error: erreurAnnulation } = await admin.auth.admin.deleteUser(cree.user.id);
    if (erreurAnnulation) {
      console.error("Candidature : l'annulation du compte a échoué aussi —", cree.user.id, erreurAnnulation.message);
    }
    return { ok: false, raison: "erreur", message: "Impossible d'enregistrer votre candidature. Réessayez dans un instant." };
  }

  return { ok: true, candidature: candidature as Candidature };
}
