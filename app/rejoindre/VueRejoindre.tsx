"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sessionDepuisLien } from "@/lib/auth/sessionDepuisLien";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import type { EtatRejoindre } from "@/lib/equipe/types";

// Voir app/rejoindre/page.tsx.

type Affichage = { etat: "chargement" } | { etat: "erreur" } | EtatRejoindre;

const CLASSE_ALERTE = "text-sm font-semibold text-signal-fonce dark:text-signal-clair";
const CLASSE_TEXTE_BOUTON =
  "min-h-12 px-3 text-base font-semibold text-ink underline decoration-ink/30 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink";

// Décision du fondateur (03/10) : à l'écran « accès retiré », on efface
// les brouillons gardés sur ce téléphone (toutes les clés « compyo… ») :
// la confidentialité des clients de l'entreprise passe avant « rien ne se
// perd », pour quelqu'un qui n'en fait plus partie.
function effacerDonneesLocales() {
  try {
    const cles: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const cle = window.localStorage.key(i);
      if (cle && cle.startsWith("compyo")) cles.push(cle);
    }
    cles.forEach((cle) => window.localStorage.removeItem(cle));
  } catch {
    // Stockage indisponible : rien à effacer.
  }
}

function Cadre({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-surface p-5 ring-1 ring-ink/15 sm:p-8">
        <p className="font-display text-xl font-semibold text-ink">Compyo</p>
        {children}
      </div>
    </main>
  );
}

export function VueRejoindre() {
  const router = useRouter();
  const [affichage, setAffichage] = useState<Affichage>({ etat: "chargement" });
  const [motDePasse, setMotDePasse] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lienEnvoye, setLienEnvoye] = useState(false);

  const charger = useCallback(async () => {
    setAffichage({ etat: "chargement" });
    setErreur(null);
    try {
      const session = await sessionDepuisLien(createClient());
      if (!session) {
        window.location.replace("/login");
        return;
      }
      const reponse = await fetch("/api/equipe/rejoindre", { cache: "no-store" });
      if (reponse.status === 401) {
        window.location.replace("/login");
        return;
      }
      if (!reponse.ok) {
        setAffichage({ etat: "erreur" });
        return;
      }
      const etat = (await reponse.json()) as EtatRejoindre;
      if (etat.etat === "membre") {
        router.replace(etat.enAttente ? "/candidature-en-cours" : "/dashboard");
        return;
      }
      if (etat.etat === "aucune" && etat.enAttente) {
        router.replace("/candidature-en-cours");
        return;
      }
      if (etat.etat === "retire") effacerDonneesLocales();
      setAffichage(etat);
    } catch {
      // Panne réseau : on ne conclut rien, surtout pas « accès retiré ».
      setAffichage({ etat: "erreur" });
    }
  }, [router]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function seDeconnecter() {
    try {
      await createClient().auth.signOut();
    } finally {
      window.location.assign("/login");
    }
  }

  async function demanderLien() {
    setEnvoi(true);
    setErreur(null);
    try {
      const reponse = await fetch("/api/equipe/rejoindre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lien" }),
      });
      const resultat = await reponse.json().catch(() => null);
      if (!reponse.ok) {
        setErreur(resultat?.error ?? "Le lien n'est pas parti. Réessayez dans une minute.");
        return;
      }
      setLienEnvoye(true);
    } catch {
      setErreur("Pas de réseau. Réessayez.");
    } finally {
      setEnvoi(false);
    }
  }

  async function rejoindre(invitationId: string, avecMotDePasse: boolean) {
    setEnvoi(true);
    setErreur(null);
    try {
      const reponse = await fetch("/api/equipe/rejoindre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rejoindre", invitationId, ...(avecMotDePasse ? { motDePasse } : {}) }),
      });
      const resultat = await reponse.json().catch(() => null);
      if (!reponse.ok) {
        setErreur(resultat?.error ?? "Pas enregistré. Réessayez.");
        return;
      }
      // Rechargement complet : le tableau de bord relit l'équipe.
      window.location.assign("/dashboard");
    } catch {
      setErreur("Pas de réseau. Réessayez.");
    } finally {
      setEnvoi(false);
    }
  }

  if (affichage.etat === "chargement") {
    return (
      <Cadre>
        <div aria-busy="true" aria-label="Chargement" className="mt-6 flex flex-col gap-3">
          <div className="h-8 w-3/4 rounded-full bg-ink/10 motion-safe:animate-pulse" />
          <div className="h-4 w-full rounded-full bg-ink/10 motion-safe:animate-pulse" />
          <div className="mt-4 h-14 w-full rounded-2xl bg-ink/10 motion-safe:animate-pulse" />
        </div>
      </Cadre>
    );
  }

  if (affichage.etat === "erreur") {
    return (
      <Cadre>
        <h1 className="mt-6 font-display text-3xl font-semibold text-ink">Pas de réseau.</h1>
        <p className="mt-2 text-base text-steel">Votre accès n&apos;a pas pu être vérifié.</p>
        <Button onClick={charger} className="mt-6 min-h-14 w-full">
          Réessayer
        </Button>
      </Cadre>
    );
  }

  if (affichage.etat === "retire") {
    return (
      <Cadre>
        <h1 className="mt-6 font-display text-3xl font-semibold text-ink">Votre accès a été retiré.</h1>
        <p className="mt-2 text-base text-steel">Rien n&apos;a été supprimé.</p>
        <Button variant="ghost" onClick={seDeconnecter} className="mt-6 w-full">
          Se déconnecter
        </Button>
      </Cadre>
    );
  }

  if (affichage.etat === "ailleurs") {
    return (
      <Cadre>
        <h1 className="mt-6 font-display text-3xl font-semibold text-ink">Vous avez déjà une équipe.</h1>
        <p className="mt-2 text-base text-steel">
          Pour rejoindre {affichage.entreprise}, il faut une autre adresse e-mail.
        </p>
        <Button onClick={() => router.replace("/dashboard")} className="mt-6 min-h-14 w-full">
          Ouvrir Compyo
        </Button>
      </Cadre>
    );
  }

  if (affichage.etat === "aucune" || affichage.etat === "membre") {
    return (
      <Cadre>
        <h1 className="mt-6 font-display text-3xl font-semibold text-ink">Aucune invitation en cours.</h1>
        <Button variant="ghost" onClick={seDeconnecter} className="mt-6 w-full">
          Se déconnecter
        </Button>
      </Cadre>
    );
  }

  const { invitation, preuve, motDePasseRequis, email } = affichage;
  return (
    <Cadre>
      <h1 className="mt-6 font-display text-3xl font-semibold text-ink">
        Rejoindre l&apos;équipe de {invitation.entreprise}
      </h1>
      <p className="mt-2 text-base text-steel">
        {invitation.invitant ? `${invitation.invitant} vous ajoute. ` : ""}Vous verrez tout : devis, prix, factures.
      </p>

      {!preuve ? (
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-base text-ink">
            Pour confirmer que {email} est bien votre adresse, ouvrez le lien que Compyo vous envoie.
          </p>
          <div aria-live="polite">
            {lienEnvoye && <p className="text-base text-ink">C&apos;est parti. Ouvrez l&apos;e-mail de Compyo.</p>}
            {erreur && <p className={CLASSE_ALERTE}>{erreur}</p>}
          </div>
          <Button onClick={demanderLien} loading={envoi} className="min-h-14 w-full">
            {lienEnvoye ? "Renvoyer le lien" : "Recevoir le lien par e-mail"}
          </Button>
        </div>
      ) : (
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            rejoindre(invitation.id, motDePasseRequis);
          }}
        >
          {motDePasseRequis && (
            <Field
              label="Choisissez votre mot de passe"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
          )}
          <div aria-live="polite">{erreur && <p className={CLASSE_ALERTE}>{erreur}</p>}</div>
          <Button type="submit" loading={envoi} className="min-h-14 w-full">
            Rejoindre
          </Button>
        </form>
      )}

      <button type="button" onClick={seDeconnecter} className={`mt-4 ${CLASSE_TEXTE_BOUTON}`}>
        Se déconnecter
      </button>
    </Cadre>
  );
}
