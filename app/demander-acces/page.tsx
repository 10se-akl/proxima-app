"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Field, TextareaField } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErreurInline } from "@/components/ui/EtatErreur";
import { METIERS } from "@/lib/metiers";
import { createClient } from "@/lib/supabase/client";

// Module 43 (21/09) — la candidature crée directement le compte, avec le
// mot de passe choisi ici. Plus d'email « définissez votre mot de passe »
// après l'acceptation : l'artisan se connecte avec celui-ci dès qu'Axel a
// dit oui. Voir app/api/candidatures/route.ts.
const LONGUEUR_MIN_MOT_DE_PASSE = 8;

// 25/09 — Plus de useSearchParams (qui imposait une frontière <Suspense>
// et un rendu vide côté serveur : la page n'avait ni titre ni texte pour
// les moteurs). Le code de parrainage se lit dans l'URL au montage.
export default function DemanderAccesPage() {
  return <DemanderAccesForm />;
}

function DemanderAccesForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    entreprise: "",
    metier: "",
    telephone: "",
    email: "",
    motDePasse: "",
    motDePasseConfirmation: "",
    nbEmployes: "",
    devisParSemaine: "",
    problemePrincipal: "",
    decouverte: "",
    // Champ piège : invisible pour un humain, rempli par les robots qui
    // remplissent tout. Voir app/api/candidatures/route.ts.
    siteWeb: "",
  });
  const [compteExistant, setCompteExistant] = useState(false);

  useEffect(() => {
    const parrain = new URLSearchParams(window.location.search).get("parraine_par");
    if (parrain) {
      setForm((f) => ({ ...f, decouverte: `Recommandé par ${parrain}` }));
    }
  }, []);
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function update(field: keyof typeof form) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => setForm({ ...form, [field]: e.target.value });
  }

  // Audit sécurité/bugs (05/09) — 🟠 : cette fonction est isolée (plutôt que
  // écrite en ligne dans handleSubmit) pour pouvoir être rappelée depuis le
  // bouton "Réessayer" de ErreurInline, pas seulement depuis la soumission
  // du <form>. Surtout : le try/catch manquait autour de fetch() — un
  // authentique échec réseau (hors-ligne, DNS, coupure), pas seulement une
  // réponse HTTP non-2xx, faisait rejeter la promesse AVANT setEnvoi(false),
  // laissant le bouton bloqué indéfiniment sur "Envoi en cours…" sans
  // aucun message ni moyen de réessayer sans recharger la page (et perdre
  // la saisie). Même pattern que components/carte-mentale/CarteMentale.tsx.
  async function envoyerCandidature() {
    setErreur(null);
    setCompteExistant(false);

    // Vérifiées ici pour une réponse immédiate, et de nouveau côté serveur
    // (lib/candidatures/creerCompteCandidat.ts), seul contrôle qui compte.
    if (form.motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
      setErreur(`Choisissez un mot de passe d'au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`);
      return;
    }
    if (form.motDePasse !== form.motDePasseConfirmation) {
      setErreur("Les deux mots de passe ne sont pas identiques.");
      return;
    }

    setEnvoi(true);
    // Pendant la redirection vers la page d'attente, le bouton reste
    // désactivé : sinon il redevient cliquable une fraction de seconde et
    // un double appui renverrait la candidature.
    let redirection = false;
    try {
      const res = await fetch("/api/candidatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 409) {
          setCompteExistant(true);
          return;
        }
        setErreur(data?.error ?? "L'envoi a échoué. Réessayez dans un instant.");
        return;
      }

      // Le compte existe : on connecte l'artisan tout de suite, pour qu'il
      // voie où en est sa candidature et n'ait rien à retaper plus tard.
      // S'il n'est pas connecté pour une raison quelconque, la candidature
      // est quand même partie : on le lui dit simplement.
      const { error } = await createClient().auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.motDePasse,
      });
      if (!error) {
        redirection = true;
        router.push("/candidature-en-cours");
        router.refresh();
        return;
      }
      setEnvoye(true);
    } catch {
      setErreur("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      if (!redirection) setEnvoi(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await envoyerCandidature();
  }

  if (envoye) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5 bg-paper">
        <Card className="w-full max-w-md p-10 text-center">
          <p className="font-display font-semibold text-lg">Compyo</p>
          <h1 className="mt-4 text-xl font-semibold">Candidature envoyée.</h1>
          <p className="mt-3 text-sm text-ink/65">
            Votre compte est créé. Nous examinons chaque candidature individuellement : dès
            qu&apos;elle est acceptée, vous pourrez vous connecter avec votre email et le mot de
            passe que vous venez de choisir.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm text-ink underline">
            Aller à la connexion
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper px-5 py-16">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-ink/60 hover:text-ink">
          ← Retour
        </Link>

        <p className="mt-6 font-mono text-[11px] tracking-[0.2em] uppercase text-steel">
          Bêta privée
        </p>
        <h1 className="mt-2 font-display text-2xl sm:text-3xl font-semibold tracking-tight">
          Demander un accès
        </h1>
        <p className="mt-3 text-sm text-ink/65 max-w-md">
          Nous acceptons un nombre limité d&apos;artisans pour garantir un accompagnement de
          qualité sur cette première version.
        </p>

        <Card className="mt-8 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Prénom" required value={form.prenom} onChange={update("prenom")} />
              <Field label="Nom" required value={form.nom} onChange={update("nom")} />
              <Field
                label="Entreprise"
                value={form.entreprise}
                onChange={update("entreprise")}
              />

              <div>
                <label className="block text-xs font-medium text-ink/70 mb-1.5">
                  Métier <span className="text-signal">*</span>
                </label>
                <select
                  required
                  value={form.metier}
                  onChange={update("metier")}
                  className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
                >
                  <option value="">Sélectionner…</option>
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
                required
                value={form.telephone}
                onChange={update("telephone")}
              />
              <Field
                label="Email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={update("email")}
              />

              {/* Le mot de passe du futur compte : c'est celui que l'artisan
                  utilisera dès l'acceptation, sans autre étape. autoComplete
                  "new-password" permet au téléphone de le proposer et de le
                  mémoriser — le meilleur moyen de ne pas l'oublier d'ici là. */}
              <Field
                label="Mot de passe"
                type="password"
                required
                minLength={LONGUEUR_MIN_MOT_DE_PASSE}
                autoComplete="new-password"
                value={form.motDePasse}
                onChange={update("motDePasse")}
              />
              <Field
                label="Confirmer le mot de passe"
                type="password"
                required
                minLength={LONGUEUR_MIN_MOT_DE_PASSE}
                autoComplete="new-password"
                value={form.motDePasseConfirmation}
                onChange={update("motDePasseConfirmation")}
              />
              <p className="-mt-3 text-xs text-ink/50 sm:col-span-2">
                8 caractères minimum. C&apos;est avec ce mot de passe que vous vous connecterez dès
                que votre candidature sera acceptée.
              </p>

              <div>
                <label className="block text-xs font-medium text-ink/70 mb-1.5">
                  Nombre d&apos;employés
                </label>
                <select
                  value={form.nbEmployes}
                  onChange={update("nbEmployes")}
                  className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
                >
                  <option value="">Sélectionner…</option>
                  <option>Seul (aucun salarié)</option>
                  <option>2 à 5</option>
                  <option>6 à 15</option>
                  <option>Plus de 15</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink/70 mb-1.5">
                  Devis réalisés par semaine
                </label>
                <select
                  value={form.devisParSemaine}
                  onChange={update("devisParSemaine")}
                  className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
                >
                  <option value="">Sélectionner…</option>
                  <option>Moins de 5</option>
                  <option>5 à 10</option>
                  <option>10 à 20</option>
                  <option>Plus de 20</option>
                </select>
              </div>
            </div>

            <TextareaField
              label="Quel est aujourd'hui votre plus gros problème administratif ?"
              required
              rows={3}
              value={form.problemePrincipal}
              onChange={update("problemePrincipal")}
            />

            <Field
              label="Comment avez-vous découvert Compyo ?"
              value={form.decouverte}
              onChange={update("decouverte")}
            />

            {/* Champ piège : hors de l'écran (pas display:none, que les
                robots savent ignorer), retiré de l'ordre de tabulation et
                caché aux lecteurs d'écran — un humain ne le voit jamais. */}
            <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label>
                Site web
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.siteWeb}
                  onChange={update("siteWeb")}
                />
              </label>
            </div>

            {compteExistant && (
              <p className="rounded-xl border border-ink/10 bg-paper-warm px-4 py-3 text-sm text-ink/80">
                Un compte existe déjà avec cette adresse email.{" "}
                <Link href="/login" className="font-medium underline">
                  Connectez-vous
                </Link>{" "}
                pour voir où en est votre candidature.
              </p>
            )}

            {erreur && <ErreurInline message={erreur} onReessayer={envoyerCandidature} />}

            <p className="text-xs text-ink/50 -mt-1">
              En envoyant ce formulaire, vous acceptez nos{" "}
              <Link href="/cgu" className="underline hover:text-ink/80">
                CGU
              </Link>{" "}
              et notre{" "}
              <Link href="/politique-de-confidentialite" className="underline hover:text-ink/80">
                politique de confidentialité
              </Link>
              .
            </p>

            <Button type="submit" disabled={envoi} className="self-start">
              {envoi ? "Envoi en cours…" : "Envoyer ma candidature"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
