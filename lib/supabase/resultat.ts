import type { PostgrestError } from "@supabase/supabase-js";

// ============================================================
// Sprint Robustesse (30/08) — voir audit-bugs-phase1.md, section "pattern
// récurrent if (!error)". Une douzaine d'endroits du produit faisaient
// `const { error } = await supabase...; if (!error) { ... }` sans jamais
// gérer le cas contraire : un échec Supabase (réseau, RLS, contrainte)
// passait totalement inaperçu — l'artisan croyait son action réussie
// (rien ne change à l'écran) alors qu'elle avait échoué en base.
//
// `executerMutation` enveloppe n'importe quel appel Supabase et renvoie un
// type union discriminé : { ok: true, data } | { ok: false, erreur }.
// C'est la structure elle-même qui empêche l'oubli, pas la discipline du
// développeur : TypeScript refuse de compiler `resultat.data` tant que
// `resultat.ok` n'a pas été vérifié (le champ `data` n'existe même pas
// sur la branche `ok: false`). Impossible d'ignorer un échec par mégarde
// comme avant — la seule façon d'accéder au résultat est de d'abord
// écrire `if (!resultat.ok) { ... }` ou `if (resultat.ok) { ... }`.
//
// Usage typique dans un composant :
//   const resultat = await executerMutation(
//     supabase.from("notes").update({ statut: "terminee" }).eq("id", id),
//     "Impossible de terminer la note."
//   );
//   if (!resultat.ok) { setErreur(resultat.erreur); return; }
//   // ici, TypeScript sait que resultat.ok === true
//
// Distingue volontairement deux familles d'échec avec des messages
// différents : une erreur Supabase "propre" (RLS, contrainte, ligne
// introuvable) reçoit le message fourni par l'appelant (le plus précis,
// propre à l'action) ; une exception JS (le fetch lui-même a échoué —
// coupure réseau, timeout) reçoit systématiquement un message de
// connexion, plus juste pour l'artisan qu'un message métier générique.
// ============================================================

export type ResultatMutation<T> =
  | { ok: true; data: T }
  | { ok: false; erreur: string; erreurBrute?: PostgrestError };

const MESSAGE_RESEAU = "Connexion perdue. Vérifiez votre réseau et réessayez.";

export async function executerMutation<T>(
  promesse: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
  messageErreur = "Impossible d'enregistrer. Réessayez."
): Promise<ResultatMutation<T>> {
  try {
    const { data, error } = await promesse;
    if (error) {
      return { ok: false, erreur: messageErreur, erreurBrute: error };
    }
    // `data` peut être `null` légitimement (ex. une requête `.update()`
    // sans `.select()`) — on ne traite ça comme un échec que si
    // l'appelant s'attend explicitement à une ligne (voir
    // executerMutationAvecLigne ci-dessous pour ce cas).
    return { ok: true, data: data as T };
  } catch {
    // Le fetch lui-même a rejeté (réseau coupé, DNS, timeout) — jamais une
    // erreur Supabase "métier", donc jamais le message de l'appelant ici.
    return { ok: false, erreur: MESSAGE_RESEAU };
  }
}

// Variante pour les mutations qui DOIVENT toucher exactement une ligne
// (ex. `.update().eq("id", x).select("id")`) : Supabase renvoie parfois
// `{ error: null, data: [] }` quand la ligne ciblée n'existe pas ou que la
// RLS la masque silencieusement (ex. artisan d'une autre organisation) —
// un cas que `executerMutation` seul laisserait passer comme un succès.
export async function executerMutationAvecLigne<T>(
  promesse: PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
  messageErreur = "Impossible d'enregistrer. Réessayez."
): Promise<ResultatMutation<T>> {
  const resultat = await executerMutation(promesse, messageErreur);
  if (!resultat.ok) return resultat;
  if (!resultat.data || resultat.data.length === 0) {
    return { ok: false, erreur: messageErreur };
  }
  return { ok: true, data: resultat.data[0] };
}
