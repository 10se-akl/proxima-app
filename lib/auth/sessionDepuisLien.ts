import type { EmailOtpType, Session, SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// La session ouverte par un lien reçu par e-mail (refonte 03/10, duel A).
//
// Trois formes de lien arrivent sur nos pages :
//   - #access_token=…&refresh_token=… : liens envoyés par le serveur
//     (invitation, lien pour rejoindre une équipe). Le client navigateur
//     de @supabase/ssr est en mode « pkce » et REFUSE cette forme : sans
//     ce traitement, la page disait « Lien invalide ou expiré ».
//   - ?token_hash=…&type=… : modèles d'e-mail personnalisés.
//   - ?code=… : liens demandés depuis le navigateur (mot de passe oublié),
//     déjà traités par le client lui-même.
//
// Un lien présent dans l'adresse passe TOUJOURS devant une session déjà
// ouverte sur l'appareil : l'invitation de Sophie ouverte sur le
// téléphone de Gérard ne doit jamais agir sur le compte de Gérard. Un
// lien invalide ou expiré renvoie null, sans retomber sur l'autre session.
// ============================================================

const TYPES_LIEN = new Set<EmailOtpType>(["invite", "magiclink", "recovery", "signup", "email", "email_change"]);

function effacerLienDeLAdresse() {
  try {
    window.history.replaceState(null, "", window.location.pathname);
  } catch {
    // Sans effet sur la session : seulement l'adresse affichée.
  }
}

export async function sessionDepuisLien(supabase: SupabaseClient): Promise<Session | null> {
  if (typeof window === "undefined") return null;
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const requete = new URLSearchParams(window.location.search);

  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    effacerLienDeLAdresse();
    return !error && data.session ? data.session : null;
  }

  const tokenHash = requete.get("token_hash");
  const type = requete.get("type") as EmailOtpType | null;
  if (tokenHash && type && TYPES_LIEN.has(type)) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    effacerLienDeLAdresse();
    return !error && data.session ? data.session : null;
  }

  // Lien expiré ou déjà utilisé : Supabase le dit dans l'adresse.
  if (fragment.get("error") || fragment.get("error_description") || requete.get("error_description")) {
    effacerLienDeLAdresse();
    return null;
  }

  const { data } = await supabase.auth.getSession();
  return data.session;
}
