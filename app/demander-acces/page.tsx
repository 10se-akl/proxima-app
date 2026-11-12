"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ErreurInline } from "@/components/ui/EtatErreur";
import { CARTE_PLEINE, CHAMP, LIBELLE, AIDE, SELECT, BOUTON_TEXTE_DISCRET } from "@/components/ui/recettes";
import { METIERS } from "@/lib/metiers";
import { PLACES_BETA } from "@/lib/candidatures/places-constante";
import { createClient } from "@/lib/supabase/client";

// ============================================================
// Créer son compte (12/11, accès immédiat — décision d'Axel).
//
// Avant : « Demander un accès », 12 champs dont une question ouverte
// obligatoire, puis 48 h d'attente. Maintenant : 6 champs, un seul mot de
// passe (avec « Afficher »), et l'artisan entre tout de suite dans son
// espace tant que la bêta a des places (lib/candidatures/places.ts). Au-delà,
// le compte est créé en liste d'attente (app/candidature-en-cours).
// Voir app/api/candidatures/route.ts.
// ============================================================
const LONGUEUR_MIN_MOT_DE_PASSE = 8;

export default function DemanderAccesPage() {
  return <FormulaireInscription />;
}

function FormulaireInscription() {
  const router = useRouter();

  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    metier: "",
    telephone: "",
    email: "",
    motDePasse: "",
    entreprise: "",
    decouverte: "",
    // Champ piège : invisible pour un humain, rempli par les robots qui
    // remplissent tout. Voir app/api/candidatures/route.ts.
    siteWeb: "",
  });
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);
  const [compteExistant, setCompteExistant] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState<null | { ouvert: boolean }>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  // « Réessayer » seulement quand renvoyer la même chose peut marcher
  // (réseau, serveur) ; pas pour une erreur de saisie.
  const [reessayable, setReessayable] = useState(false);

  useEffect(() => {
    const parrain = new URLSearchParams(window.location.search).get("parraine_par");
    if (parrain) setForm((f) => ({ ...f, decouverte: `Recommandé par ${parrain}` }));
  }, []);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [field]: e.target.value });
  }

  async function creerCompte() {
    setErreur(null);
    setReessayable(false);
    setCompteExistant(false);

    if (form.motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
      setErreur(`Choisissez un mot de passe d'au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`);
      return;
    }

    setEnvoi(true);
    // Pendant la redirection, le bouton reste désactivé : un double appui
    // renverrait l'inscription.
    let redirection = false;
    try {
      const res = await fetch("/api/candidatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 409) {
          setCompteExistant(true);
          return;
        }
        setReessayable(res.status >= 500);
        setErreur(data?.error ?? "L'envoi a échoué. Réessayez dans un instant.");
        return;
      }

      const ouvert = Boolean(data?.ouvert);
      const suite: string = typeof data?.suite === "string" && data.suite.startsWith("/") ? data.suite : "/dashboard";

      // Le compte existe : on connecte l'artisan tout de suite, il n'a rien
      // à retaper. Si la connexion échoue, le compte est quand même créé :
      // on le lui dit simplement.
      const { error } = await createClient().auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.motDePasse,
      });
      if (!error) {
        redirection = true;
        router.push(suite);
        router.refresh();
        return;
      }
      setEnvoye({ ouvert });
    } catch {
      setReessayable(true);
      setErreur("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      if (!redirection) setEnvoi(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await creerCompte();
  }

  if (envoye) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-5">
        <div className={`${CARTE_PLEINE} w-full max-w-md p-8 text-center`}>
          <h1 className="font-display text-2xl font-bold text-ink">Votre compte est créé.</h1>
          <p className="mt-3 text-base text-steel">
            {envoye.ouvert
              ? "Connectez-vous avec votre email et le mot de passe que vous venez de choisir."
              : "La bêta est complète pour l'instant : vous êtes sur la liste d'attente. Vous pourrez vous connecter dès que votre compte sera ouvert."}
          </p>
          <Link href="/login" className="mt-6 inline-block font-semibold text-ink underline">
            Aller à la connexion
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper px-5 pb-16 pt-8 sm:pt-14">
      <div className="mx-auto max-w-xl">
        <Link href="/" className={`${BOUTON_TEXTE_DISCRET} -ml-3`}>
          ← Retour
        </Link>

        <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-ink sm:text-4xl">
          Créez votre compte Compyo
        </h1>
        <p className="mt-3 text-lg text-steel">
          Gratuit pendant la bêta, sans carte bancaire. Votre espace s&apos;ouvre tout de suite.
        </p>

        <div className={`${CARTE_PLEINE} mt-7 p-5 sm:p-7`}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Prénom" required autoComplete="given-name" value={form.prenom} onChange={update("prenom")} />
              <Field label="Nom" required autoComplete="family-name" value={form.nom} onChange={update("nom")} />
            </div>

            <div>
              <label htmlFor="metier-inscription" className={LIBELLE}>
                Votre métier <span className="text-signal-fonce">*</span>
              </label>
              <select id="metier-inscription" required value={form.metier} onChange={update("metier")} className={SELECT}>
                <option value="">Choisir…</option>
                {METIERS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label="Téléphone"
              type="tel"
              inputMode="tel"
              required
              autoComplete="tel"
              value={form.telephone}
              onChange={update("telephone")}
            />
            <Field
              label="Email"
              type="email"
              inputMode="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={update("email")}
            />

            <div>
              <label htmlFor="mdp-inscription" className={LIBELLE}>
                Mot de passe <span className="text-signal-fonce">*</span>
              </label>
              <div className="relative">
                <input
                  id="mdp-inscription"
                  type={voirMotDePasse ? "text" : "password"}
                  required
                  minLength={LONGUEUR_MIN_MOT_DE_PASSE}
                  autoComplete="new-password"
                  value={form.motDePasse}
                  onChange={update("motDePasse")}
                  aria-describedby="aide-mdp"
                  className={`${CHAMP} py-3 pr-24`}
                />
                <button
                  type="button"
                  onClick={() => setVoirMotDePasse((v) => !v)}
                  aria-pressed={voirMotDePasse}
                  className="absolute inset-y-0 right-0 min-w-[48px] px-4 text-[15px] font-semibold text-ink"
                >
                  {voirMotDePasse ? "Cacher" : "Afficher"}
                </button>
              </div>
              <span id="aide-mdp" className={AIDE}>
                8 caractères minimum. C&apos;est avec lui que vous vous connecterez.
              </span>
            </div>

            <Field
              label="Entreprise (facultatif)"
              autoComplete="organization"
              value={form.entreprise}
              onChange={update("entreprise")}
            />

            {/* Champ piège : hors de l'écran (pas display:none, que les
                robots savent ignorer), retiré de l'ordre de tabulation et
                caché aux lecteurs d'écran — un humain ne le voit jamais. */}
            <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label>
                Site web
                <input type="text" tabIndex={-1} autoComplete="off" value={form.siteWeb} onChange={update("siteWeb")} />
              </label>
            </div>

            {compteExistant && (
              <p className="rounded-[14px] bg-paper-warm px-4 py-3 text-base text-ink">
                Un compte existe déjà avec cette adresse email.{" "}
                <Link href="/login" className="font-semibold underline">
                  Connectez-vous
                </Link>
                .
              </p>
            )}

            {erreur && <ErreurInline message={erreur} onReessayer={reessayable ? creerCompte : undefined} />}

            <Button type="submit" disabled={envoi} className="min-h-[52px] w-full text-base">
              {envoi ? "Création du compte…" : "Créer mon compte gratuit"}
            </Button>

            <p className="text-sm text-steel">
              {PLACES_BETA} places pour cette bêta. Quand elles sont prises, l&apos;inscription vous met sur la liste
              d&apos;attente. En créant votre compte, vous acceptez nos{" "}
              <Link href="/cgu" className="underline">
                CGU
              </Link>{" "}
              et notre{" "}
              <Link href="/politique-de-confidentialite" className="underline">
                politique de confidentialité
              </Link>
              .
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
