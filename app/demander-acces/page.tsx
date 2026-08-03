"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Field, TextareaField } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const METIERS = [
  "Maçon",
  "Plombier",
  "Électricien",
  "Chauffagiste",
  "Couvreur",
  "Entreprise de rénovation",
  "Autre",
];

// Next.js exige que tout composant utilisant useSearchParams() soit
// entouré d'une frontière <Suspense> — sinon le pré-rendu statique de la
// page échoue au build (l'erreur ne se voit qu'au déploiement, pas en dev).
export default function DemanderAccesPage() {
  return (
    <Suspense fallback={null}>
      <DemanderAccesForm />
    </Suspense>
  );
}

function DemanderAccesForm() {
  const searchParams = useSearchParams();
  const parrain = searchParams.get("parraine_par");

  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    entreprise: "",
    metier: "",
    telephone: "",
    email: "",
    nbEmployes: "",
    devisParSemaine: "",
    problemePrincipal: "",
    decouverte: "",
  });

  useEffect(() => {
    if (parrain) {
      setForm((f) => ({ ...f, decouverte: `Recommandé par ${parrain}` }));
    }
  }, [parrain]);
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function update(field: keyof typeof form) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);

    const res = await fetch("/api/candidatures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setEnvoi(false);

    if (!res.ok) {
      setErreur("L'envoi a échoué. Réessayez dans un instant.");
      return;
    }

    setEnvoye(true);
  }

  if (envoye) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5 bg-paper">
        <Card className="w-full max-w-md p-10 text-center">
          <p className="font-display font-semibold text-lg">Proxima</p>
          <h1 className="mt-4 text-xl font-semibold">Candidature envoyée.</h1>
          <p className="mt-3 text-sm text-ink/65">
            Nous examinons chaque candidature individuellement. Si elle est retenue, vous
            recevrez un email pour activer votre accès.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm text-ink underline">
            Retour à l&apos;accueil
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
                  className="w-full border border-ink/15 bg-paper px-3 py-2.5 text-sm focus:outline-none focus:border-ink"
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
                value={form.email}
                onChange={update("email")}
              />

              <div>
                <label className="block text-xs font-medium text-ink/70 mb-1.5">
                  Nombre d&apos;employés
                </label>
                <select
                  value={form.nbEmployes}
                  onChange={update("nbEmployes")}
                  className="w-full border border-ink/15 bg-paper px-3 py-2.5 text-sm focus:outline-none focus:border-ink"
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
                  className="w-full border border-ink/15 bg-paper px-3 py-2.5 text-sm focus:outline-none focus:border-ink"
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
              label="Comment avez-vous découvert Proxima ?"
              value={form.decouverte}
              onChange={update("decouverte")}
            />

            {erreur && <p className="text-sm text-signal">{erreur}</p>}

            <Button type="submit" disabled={envoi} className="self-start">
              {envoi ? "Envoi en cours…" : "Envoyer ma candidature"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
