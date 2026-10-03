"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { lireMembership } from "@/lib/organisation";
import { Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Feuille } from "@/components/projet/Feuille";
import { lienPartageWhatsApp, messageInvitationEquipe } from "@/lib/messagesClient";

// ============================================================
// Paramètres › Équipe (refonte 03/10, duel A) — la SEULE interface
// d'équipe (/dashboard/equipe redirige ici, GestionEquipe.tsx est retiré).
//
// Tout le monde voit tout, comme dans un seul bureau : aucun mot de rôle
// n'est affiché. Ce qui distingue la personne qui a ouvert le compte ne
// se voit qu'à ce qu'elle peut faire : inviter, retirer, renvoyer ou
// annuler une invitation. Les autres voient la liste seule.
//
// Rien ne s'affiche comme fait avant que le serveur l'ait confirmé ; une
// erreur reste là où était le doigt (dans la feuille, sur la ligne).
// La sécurité n'est pas ici : la base et les routes serveur refusent
// d'elles-mêmes ce que cet écran ne propose pas.
// ============================================================

type Membre = { userId: string; nom: string; email: string; estProprietaire: boolean; estMoi: boolean };
type InvitationEnCours = { id: string; prenom: string; email: string; expiree: boolean };

const CLASSE_ALERTE = "text-sm font-semibold text-signal-fonce dark:text-signal-clair";
const CLASSE_TEXTE_BOUTON =
  "min-h-12 px-3 text-base font-semibold text-ink underline decoration-ink/30 underline-offset-4 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink";
// La phrase validée par le fondateur (03/10) : c'est une promesse.
const PHRASE_PROMESSE = "Elle verra tout, comme vous : devis, prix, factures.";

function premierMot(nom: string): string {
  return nom.trim().split(/\s+/)[0] ?? "";
}

export function EquipeSection() {
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState(false);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [invitations, setInvitations] = useState<InvitationEnCours[]>([]);
  const [peutGerer, setPeutGerer] = useState(false);
  const [entreprise, setEntreprise] = useState<string | null>(null);

  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreurInvitation, setErreurInvitation] = useState<string | null>(null);
  const [pret, setPret] = useState<{ prenom: string; emailParti: boolean } | null>(null);

  const [aRetirer, setARetirer] = useState<Membre | null>(null);
  const [retrait, setRetrait] = useState(false);
  const [erreurRetrait, setErreurRetrait] = useState<string | null>(null);

  const [invitationEnAction, setInvitationEnAction] = useState<string | null>(null);
  const [retourInvitation, setRetourInvitation] = useState<{ id: string; texte: string; erreur: boolean } | null>(null);

  const charger = useCallback(async () => {
    const supabase = createClient();
    setErreurChargement(false);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErreurChargement(true);
        return;
      }
      const lecture = await lireMembership(supabase, user.id);
      if (lecture.etat !== "membre") {
        setErreurChargement(true);
        return;
      }
      const org = lecture.organisationId;

      const [lignes, invits, organisation] = await Promise.all([
        supabase
          .from("memberships")
          .select("user_id, role, created_at")
          .eq("organisation_id", org)
          .order("created_at", { ascending: true }),
        supabase
          .from("invitations")
          .select("id, prenom, email, expire_le")
          .eq("organisation_id", org)
          .is("acceptee_le", null)
          .is("annulee_le", null)
          .order("cree_le", { ascending: true }),
        supabase.from("organisations").select("nom").eq("id", org).maybeSingle(),
      ]);
      if (lignes.error || invits.error || organisation.error) {
        setErreurChargement(true);
        return;
      }

      const ids = (lignes.data ?? []).map((m) => m.user_id);
      const { data: profils, error: erreurProfils } = ids.length
        ? await supabase.from("profils").select("id, nom, email").in("id", ids)
        : { data: [], error: null };
      if (erreurProfils) {
        setErreurChargement(true);
        return;
      }

      const liste: Membre[] = (lignes.data ?? []).map((m) => {
        const profil = (profils ?? []).find((p) => p.id === m.user_id);
        return {
          userId: m.user_id,
          nom: profil?.nom?.trim() || profil?.email || "Sans nom",
          email: profil?.email ?? "",
          estProprietaire: m.role === "proprietaire",
          estMoi: m.user_id === user.id,
        };
      });
      // Soi d'abord, puis dans l'ordre d'arrivée.
      liste.sort((a, b) => Number(b.estMoi) - Number(a.estMoi));

      const maintenant = Date.now();
      setMembres(liste);
      setInvitations(
        (invits.data ?? []).map((i) => ({
          id: i.id,
          prenom: i.prenom,
          email: i.email,
          expiree: Date.parse(i.expire_le) <= maintenant,
        }))
      );
      setPeutGerer(lecture.role === "proprietaire");
      setEntreprise(organisation.data?.nom ?? null);
    } catch {
      setErreurChargement(true);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  async function inviter(e: React.FormEvent) {
    e.preventDefault();
    setErreurInvitation(null);
    setEnvoi(true);
    try {
      const reponse = await fetch("/api/equipe/inviter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, email }),
      });
      const resultat = await reponse.json().catch(() => null);
      if (!reponse.ok) {
        setErreurInvitation(resultat?.error ?? "L'invitation n'est pas partie. Réessayez.");
        return;
      }
      setPret({ prenom: premierMot(nom), emailParti: resultat?.emailParti !== false });
      setNom("");
      setEmail("");
      charger();
    } catch {
      setErreurInvitation("Pas de réseau. L'invitation n'est pas partie.");
    } finally {
      setEnvoi(false);
    }
  }

  async function agirSurInvitation(invitation: InvitationEnCours, action: "renvoyer" | "annuler") {
    setInvitationEnAction(invitation.id);
    setRetourInvitation(null);
    try {
      const reponse = await fetch("/api/equipe/inviter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, invitationId: invitation.id }),
      });
      const resultat = await reponse.json().catch(() => null);
      if (!reponse.ok) {
        setRetourInvitation({ id: invitation.id, texte: resultat?.error ?? "Pas enregistré. Réessayez.", erreur: true });
        return;
      }
      if (action === "annuler") {
        await charger();
        return;
      }
      setRetourInvitation({
        id: invitation.id,
        texte: resultat?.emailParti === false ? "L'e-mail n'est pas parti. Réessayez dans un moment." : "Renvoyée.",
        erreur: resultat?.emailParti === false,
      });
      charger();
    } catch {
      setRetourInvitation({ id: invitation.id, texte: "Pas de réseau. Réessayez.", erreur: true });
    } finally {
      setInvitationEnAction(null);
    }
  }

  function fermerRetrait() {
    if (retrait) return;
    setARetirer(null);
    setErreurRetrait(null);
  }

  async function confirmerRetrait() {
    if (!aRetirer) return;
    setRetrait(true);
    setErreurRetrait(null);
    try {
      const reponse = await fetch("/api/equipe/retirer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: aRetirer.userId }),
      });
      const resultat = await reponse.json().catch(() => null);
      if (!reponse.ok) {
        setErreurRetrait(resultat?.error ?? "Pas retiré. Réessayez.");
        return;
      }
      setARetirer(null);
      await charger();
    } catch {
      setErreurRetrait("Pas de réseau. Pas retiré.");
    } finally {
      setRetrait(false);
    }
  }

  function prevenirParWhatsApp() {
    if (!pret) return;
    window.open(lienPartageWhatsApp(messageInvitationEquipe({ prenom: pret.prenom, entreprise })), "_blank", "noopener");
  }

  if (chargement) {
    return (
      <div aria-busy="true" aria-label="Chargement de l'équipe" className="flex flex-col gap-2">
        <div className="h-16 rounded-2xl bg-ink/10 motion-safe:animate-pulse" />
        <div className="h-16 rounded-2xl bg-ink/10 motion-safe:animate-pulse" />
      </div>
    );
  }

  if (erreurChargement) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className={CLASSE_ALERTE}>L&apos;équipe n&apos;a pas pu être chargée.</p>
        <Button variant="ghost" onClick={charger}>
          Réessayer
        </Button>
      </div>
    );
  }

  const prenomRetire = aRetirer ? premierMot(aRetirer.nom) : "";
  const prenomSaisi = premierMot(nom);

  return (
    <div className="flex flex-col gap-6">
      <ul className="divide-y divide-ink/10" aria-label="Équipe">
        {membres.map((m) => (
          <li key={m.userId} className="flex min-h-16 items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-ink">
                {m.nom}
                {m.estMoi ? ", vous" : ""}
              </p>
              {m.email && <p className="truncate text-sm text-steel">{m.email}</p>}
            </div>
            {peutGerer && !m.estMoi && !m.estProprietaire && (
              <Button
                variant="danger"
                className="shrink-0"
                onClick={() => {
                  setErreurRetrait(null);
                  setARetirer(m);
                }}
              >
                Retirer
              </Button>
            )}
          </li>
        ))}
        {invitations.map((i) => (
          <li key={i.id} className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-ink">
                {premierMot(i.prenom)}, {i.expiree ? "invitation expirée" : "en attente"}
              </p>
              <p className="truncate text-sm text-steel">{i.email}</p>
            </div>
            {peutGerer && (
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  className={CLASSE_TEXTE_BOUTON}
                  disabled={invitationEnAction === i.id}
                  onClick={() => agirSurInvitation(i, "renvoyer")}
                >
                  Renvoyer
                </button>
                <button
                  type="button"
                  className={CLASSE_TEXTE_BOUTON}
                  disabled={invitationEnAction === i.id}
                  onClick={() => agirSurInvitation(i, "annuler")}
                >
                  Annuler
                </button>
              </div>
            )}
            <div aria-live="polite" className="w-full empty:hidden">
              {retourInvitation?.id === i.id && (
                <p className={retourInvitation.erreur ? CLASSE_ALERTE : "text-sm text-ink"}>{retourInvitation.texte}</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {peutGerer && (
        <form onSubmit={inviter} className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-ink">Inviter quelqu&apos;un</h3>
          <Field
            label="Prénom et nom"
            required
            maxLength={60}
            autoComplete="off"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
          <Field
            label="E-mail"
            type="email"
            required
            maxLength={254}
            autoComplete="off"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="text-base text-ink">
            {prenomSaisi ? `${prenomSaisi} verra tout, comme vous : devis, prix, factures.` : PHRASE_PROMESSE}
          </p>
          <div aria-live="polite">{erreurInvitation && <p className={CLASSE_ALERTE}>{erreurInvitation}</p>}</div>
          <Button type="submit" loading={envoi} className="min-h-14 w-full sm:w-auto">
            Envoyer l&apos;invitation
          </Button>
        </form>
      )}

      <Feuille ouverte={aRetirer !== null} titre={`Retirer ${prenomRetire} ?`} surFermer={fermerRetrait}>
        <p className="text-base text-ink">
          {prenomRetire} n&apos;ouvre plus Compyo. Ses notes, photos et projets restent.
        </p>
        <div aria-live="polite" className="mt-3">
          {erreurRetrait && <p className={CLASSE_ALERTE}>{erreurRetrait}</p>}
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
          <Button variant="danger" loading={retrait} onClick={confirmerRetrait}>
            Retirer {prenomRetire}
          </Button>
          <Button variant="ghost" disabled={retrait} onClick={fermerRetrait}>
            Annuler
          </Button>
        </div>
      </Feuille>

      <Feuille ouverte={pret !== null} titre="C'est prêt" surFermer={() => setPret(null)}>
        <p className="text-base text-ink">
          {pret?.emailParti
            ? `${pret.prenom || "La personne"} reçoit un e-mail de Compyo.`
            : "L'e-mail n'est pas parti. Réessayez « Renvoyer » dans un moment."}
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <Button onClick={prevenirParWhatsApp} className="min-h-14 w-full">
            {pret?.prenom ? `Prévenir ${pret.prenom} par WhatsApp` : "Prévenir par WhatsApp"}
          </Button>
          <Button variant="ghost" onClick={() => setPret(null)} className="w-full">
            Terminé
          </Button>
        </div>
      </Feuille>
    </div>
  );
}
