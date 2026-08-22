"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

type Membre = {
  userId: string;
  nom: string;
  email: string;
  role: "proprietaire" | "employe";
};

// Onglet "Mon équipe" de Paramètres — voir Module 14 dans
// supabase/schema.sql pour le modèle organisation/membership sous-jacent.
// Un artisan solo (le cas le plus courant en bêta) voit juste lui-même
// dans la liste, avec de quoi inviter un premier coéquipier s'il en a
// besoin : rien à configurer pour que ça reste simple par défaut.
export function EquipeSection() {
  const supabase = createClient();

  const [chargement, setChargement] = useState(true);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [monRole, setMonRole] = useState<"proprietaire" | "employe" | null>(null);
  const [monUserId, setMonUserId] = useState<string | null>(null);

  const [nomInvite, setNomInvite] = useState("");
  const [emailInvite, setEmailInvite] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  async function charger() {
    setChargement(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setChargement(false);
      return;
    }
    setMonUserId(user.id);

    const { data: maMembership } = await supabase
      .from("memberships")
      .select("organisation_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!maMembership) {
      setChargement(false);
      return;
    }
    setMonRole(maMembership.role as "proprietaire" | "employe");

    const { data: memberships } = await supabase
      .from("memberships")
      .select("user_id, role")
      .eq("organisation_id", maMembership.organisation_id);

    const idsMembres = (memberships ?? []).map((m) => m.user_id);
    const { data: profils } = await supabase
      .from("profils")
      .select("id, nom, email")
      .in("id", idsMembres.length > 0 ? idsMembres : ["00000000-0000-0000-0000-000000000000"]);

    const liste: Membre[] = (memberships ?? []).map((m) => {
      const profil = profils?.find((p) => p.id === m.user_id);
      return {
        userId: m.user_id,
        nom: profil?.nom ?? "—",
        email: profil?.email ?? "",
        role: m.role as "proprietaire" | "employe",
      };
    });
    // Le propriétaire en premier, puis par ordre d'ajout — plus lisible
    // qu'un ordre arbitraire renvoyé par la base.
    liste.sort((a, b) => (a.role === b.role ? 0 : a.role === "proprietaire" ? -1 : 1));
    setMembres(liste);
    setChargement(false);
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleInviter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setSucces(null);
    setEnvoi(true);

    const reponse = await fetch("/api/equipe/inviter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: nomInvite, email: emailInvite }),
    });
    const resultat = await reponse.json();

    setEnvoi(false);

    if (!reponse.ok) {
      setErreur(resultat.error ?? "Impossible d'envoyer l'invitation.");
      return;
    }

    setSucces(`Invitation envoyée à ${emailInvite}.`);
    setNomInvite("");
    setEmailInvite("");
    charger();
  }

  async function handleRetirer(userId: string, nom: string) {
    if (!confirm(`Retirer ${nom} de l'équipe ? Cette personne perdra immédiatement l'accès.`)) {
      return;
    }
    const reponse = await fetch("/api/equipe/retirer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (reponse.ok) {
      charger();
    }
  }

  if (chargement) {
    return <div className="text-sm text-ink/50">Chargement…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-ink/60">
        Toutes les personnes de votre équipe voient et travaillent sur les mêmes projets,
        devis et planning — comme si vous partagiez un seul bureau.
      </p>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink/70 mb-4">Membres ({membres.length})</h2>
        <div className="flex flex-col gap-3">
          {membres.map((m) => (
            <div key={m.userId} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar nom={m.nom} taille={32} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.nom} {m.userId === monUserId && <span className="text-ink/40">(vous)</span>}
                  </p>
                  <p className="text-xs text-ink/50 truncate">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-[11px] font-mono uppercase tracking-wide px-2 py-1 rounded-full ${
                    m.role === "proprietaire"
                      ? "bg-signal/10 text-signal-fonce"
                      : "bg-ink/5 text-ink/50"
                  }`}
                >
                  {m.role === "proprietaire" ? "Propriétaire" : "Employé"}
                </span>
                {monRole === "proprietaire" && m.userId !== monUserId && (
                  <button
                    onClick={() => handleRetirer(m.userId, m.nom)}
                    className="text-xs text-ink/40 hover:text-signal underline underline-offset-2"
                  >
                    Retirer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {monRole === "proprietaire" ? (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink/70 mb-1">Inviter quelqu'un</h2>
          <p className="text-xs text-ink/50 mb-4">
            Un employé, un conjoint... Cette personne recevra un email pour créer son mot de
            passe et accédera immédiatement aux mêmes projets que vous.
          </p>
          <form onSubmit={handleInviter} className="flex flex-col gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="Nom"
                required
                value={nomInvite}
                onChange={(e) => setNomInvite(e.target.value)}
              />
              <Field
                label="Email"
                type="email"
                required
                value={emailInvite}
                onChange={(e) => setEmailInvite(e.target.value)}
              />
            </div>
            {erreur && <p className="text-sm text-signal">{erreur}</p>}
            {succes && <p className="text-sm text-steel">{succes}</p>}
            <Button type="submit" disabled={envoi} className="self-start">
              {envoi ? "Envoi…" : "Envoyer l'invitation"}
            </Button>
          </form>
        </Card>
      ) : (
        <p className="text-xs text-ink/40">
          Seul le propriétaire du compte peut inviter ou retirer un membre de l'équipe.
        </p>
      )}
    </div>
  );
}
