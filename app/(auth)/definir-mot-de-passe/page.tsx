"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sessionDepuisLien } from "@/lib/auth/sessionDepuisLien";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { EtatRejoindre } from "@/lib/equipe/types";

// Module 43 (21/09) — cette page sert désormais à deux choses : le lien
// d'invitation (anciennes candidatures, employés invités) et le lien
// « mot de passe oublié » (voir app/(auth)/mot-de-passe-oublie). Le jeton
// de session dit lequel des deux a ouvert la page : Supabase y inscrit la
// méthode d'authentification ("amr"), "recovery" pour une réinitialisation.
// Plus sûr qu'un paramètre dans l'adresse de retour, qui aurait pu faire
// refuser le lien par la liste d'adresses autorisées de Supabase.
//
// Refonte (03/10, duel A) :
//   - le lien d'invitation (envoyé par le serveur) arrive avec la session
//     dans la partie « # » de l'adresse, que le client navigateur refusait
//     (« Lien invalide ou expiré ») : lib/auth/sessionDepuisLien.ts la
//     récupère, et un lien présent passe toujours devant une session déjà
//     ouverte sur l'appareil ;
//   - une personne invitée dans une équipe le lit (« Gérard Martin vous
//     ajoute ») et rejoint l'équipe d'elle-même en choisissant son mot de
//     passe : un seul geste, pas de « Rejoindre » en plus.
function viaReinitialisation(jeton: string): boolean {
  try {
    const charge = JSON.parse(atob(jeton.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return Array.isArray(charge.amr) && charge.amr.some((m: { method?: string }) => m.method === "recovery");
  } catch {
    return false;
  }
}

type Invitation = Extract<EtatRejoindre, { etat: "invitation" }>["invitation"];

export default function DefinirMotDePassePage() {
  const router = useRouter();
  const supabase = createClient();

  const [pret, setPret] = useState(false);
  const [reinitialisation, setReinitialisation] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const session = await sessionDepuisLien(supabase);
        if (!session) {
          setErreur("Lien invalide ou expiré. Demandez-en un nouveau depuis la page de connexion.");
          return;
        }
        const recuperation = viaReinitialisation(session.access_token);
        setReinitialisation(recuperation);
        if (!recuperation) {
          // Une invitation d'équipe ? Sans réponse (réseau), la page reste
          // utilisable : /rejoindre prendra le relais après le mot de passe.
          try {
            const reponse = await fetch("/api/equipe/rejoindre", { cache: "no-store" });
            if (reponse.ok) {
              const etat = (await reponse.json()) as EtatRejoindre;
              if (etat.etat === "invitation") setInvitation(etat.invitation);
            }
          } catch {
            // Voir ci-dessus.
          }
        }
        setPret(true);
      } catch {
        setErreur("Pas de réseau. Rechargez la page.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: motDePasse });
      if (error) {
        setErreur("Impossible d'enregistrer ce mot de passe. Réessayez.");
        return;
      }

      if (invitation) {
        const reponse = await fetch("/api/equipe/rejoindre", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "rejoindre", invitationId: invitation.id, motDePasse }),
        }).catch(() => null);
        // Le mot de passe est enregistré ; si l'entrée dans l'équipe a
        // échoué, /rejoindre le dit et propose de recommencer.
        window.location.assign(reponse?.ok ? "/dashboard" : "/rejoindre");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErreur("Pas de réseau. Le mot de passe n'est pas enregistré.");
    } finally {
      setChargement(false);
    }
  }

  const titre = reinitialisation
    ? "Nouveau mot de passe"
    : invitation
      ? `${invitation.invitant ?? invitation.entreprise} vous ajoute`
      : "Bienvenue dans la bêta";
  const texte = reinitialisation
    ? "Choisissez un nouveau mot de passe pour votre compte Compyo."
    : invitation
      ? `Choisissez votre mot de passe pour rejoindre l'équipe de ${invitation.entreprise}. Vous verrez tout : devis, prix, factures.`
      : "Votre candidature a été acceptée. Définissez votre mot de passe pour accéder à votre espace.";

  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <Card className="w-full max-w-sm p-8">
        <p className="font-display font-semibold text-lg">Compyo</p>
        <h1 className="mt-4 text-xl font-semibold">{titre}</h1>
        <p className="mt-2 text-sm text-ink/60">{texte}</p>

        {pret ? (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <Field
              label="Nouveau mot de passe"
              type="password"
              required
              autoComplete="new-password"
              // 8, comme à la demande d'accès (Module 43).
              minLength={8}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
            {erreur && <p className="text-sm text-signal-fonce dark:text-signal-clair">{erreur}</p>}
            <Button type="submit" loading={chargement} className="w-full mt-2">
              {invitation ? "Rejoindre l'équipe" : "Accéder à mon espace"}
            </Button>
          </form>
        ) : (
          <p className="mt-6 text-sm text-signal-fonce dark:text-signal-clair">{erreur ?? "Vérification du lien…"}</p>
        )}
      </Card>
    </main>
  );
}
