"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

type Membre = {
  userId: string;
  role: "proprietaire" | "employe";
  profil: { nom: string; email: string; metier: string } | null;
};

const LABEL_ROLE: Record<Membre["role"], string> = {
  proprietaire: "Propriétaire",
  employe: "Membre",
};

export function GestionEquipe({
  membres,
  monUserId,
  estProprietaire,
}: {
  membres: Membre[];
  monUserId: string;
  estProprietaire: boolean;
}) {
  const router = useRouter();
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [retraitEnCours, setRetraitEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  async function inviter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setSucces(null);
    setEnvoiEnCours(true);

    try {
      const res = await fetch("/api/equipe/inviter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErreur(data?.error ?? "Impossible d'envoyer l'invitation. Réessayez.");
        return;
      }
      setSucces(`Invitation envoyée à ${email}.`);
      setNom("");
      setEmail("");
      setFormulaireOuvert(false);
      router.refresh();
    } catch {
      setErreur("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function retirer(userId: string, nomAffiche: string) {
    if (!window.confirm(`Retirer ${nomAffiche} de votre équipe ? Son accès sera coupé immédiatement.`))
      return;
    setRetraitEnCours(userId);
    setErreur(null);

    try {
      const res = await fetch("/api/equipe/retirer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErreur(data?.error ?? "Impossible de retirer ce membre. Réessayez.");
        return;
      }
      router.refresh();
    } catch {
      setErreur("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.");
    } finally {
      setRetraitEnCours(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-2.5">
        {membres.map((m) => (
          <Card key={m.userId} className="p-4 flex items-center gap-3">
            <Avatar nom={m.profil?.nom || "?"} taille={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {m.profil?.nom ?? "—"}
                {m.userId === monUserId && <span className="text-ink/40 font-normal"> (vous)</span>}
              </p>
              <p className="text-xs text-ink/50 truncate">{m.profil?.email}</p>
            </div>
            <span className="text-xs text-ink/50 shrink-0">{LABEL_ROLE[m.role]}</span>
            {estProprietaire && m.userId !== monUserId && (
              <button
                onClick={() => retirer(m.userId, m.profil?.nom ?? "ce membre")}
                disabled={retraitEnCours === m.userId}
                className="shrink-0 text-xs text-ink/40 hover:text-signal underline transition-colors disabled:opacity-50"
              >
                {retraitEnCours === m.userId ? "…" : "Retirer"}
              </button>
            )}
          </Card>
        ))}
      </div>

      {erreur && <p className="mt-3 text-sm text-signal">{erreur}</p>}
      {succes && <p className="mt-3 text-sm text-[#2F8F5B]">{succes}</p>}

      {estProprietaire && (
        <div className="mt-5">
          {!formulaireOuvert ? (
            <Button variant="ghost" onClick={() => setFormulaireOuvert(true)}>
              + Ajouter un membre
            </Button>
          ) : (
            <Card className="p-5">
              <p className="text-xs font-medium text-ink/50 uppercase tracking-wider mb-3">
                Inviter un membre
              </p>
              <form onSubmit={inviter} className="flex flex-col gap-3">
                <Field
                  label="Nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Prénom Nom"
                  required
                />
                <Field
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemple.fr"
                  required
                />
                <p className="text-[11px] text-ink/40 leading-relaxed">
                  Un email d&apos;invitation est envoyé automatiquement — la personne définit
                  elle-même son mot de passe et voit alors les mêmes projets, devis et planning
                  que vous.
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <Button type="submit" loading={envoiEnCours}>
                    {envoiEnCours ? "Envoi…" : "Envoyer l'invitation"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setFormulaireOuvert(false);
                      setErreur(null);
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
