"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EtatErreur } from "@/components/ui/EtatErreur";
import { METIERS } from "@/lib/metiers";

export function MonCompte() {
  const supabase = createClient();

  const [nom, setNom] = useState("");
  const [metier, setMetier] = useState("");
  const [notificationsActives, setNotificationsActives] = useState(true);
  const [enregistrementNotifications, setEnregistrementNotifications] = useState(false);
  const [chargement, setChargement] = useState(true);
  // Sprint Robustesse (30/08) — le chargement initial n'avait aucun état
  // d'échec : sur coupure réseau, `chargement` restait bloqué à `true` pour
  // toujours (voir plus bas, `if (chargement) return null`) et l'artisan
  // voyait un écran vide sans aucune explication ni moyen de réessayer.
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [lienCopie, setLienCopie] = useState(false);
  const [enregistrementProfil, setEnregistrementProfil] = useState(false);
  const [profilConfirme, setProfilConfirme] = useState(false);
  const [erreurProfil, setErreurProfil] = useState<string | null>(null);
  // Sprint Robustesse (30/08) — voir basculerNotifications ci-dessous.
  const [erreurNotifications, setErreurNotifications] = useState<string | null>(null);

  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [enregistrementMdp, setEnregistrementMdp] = useState(false);
  const [mdpConfirme, setMdpConfirme] = useState(false);
  const [erreurMdp, setErreurMdp] = useState<string | null>(null);

  // Sprint Robustesse (30/08) — sorti du useEffect pour pouvoir être
  // relancé par le bouton "Réessayer" de <EtatErreur /> ci-dessous, sans
  // dupliquer la logique de chargement.
  async function charger() {
    setChargement(true);
    setErreurChargement(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setChargement(false);
        return;
      }
      const { data, error } = await supabase
        .from("profils")
        .select("nom, metier, notifications_push_actives")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      if (data) {
        setNom(data.nom ?? "");
        setMetier(data.metier ?? "");
        setNotificationsActives(data.notifications_push_actives ?? true);
      }
    } catch {
      // Coupure réseau ou erreur Supabase : avant ce correctif, `chargement`
      // restait bloqué à `true` indéfiniment (voir `if (chargement) return
      // null` plus bas) — écran vide sans aucune explication ni action
      // possible pour l'artisan.
      setErreurChargement("Impossible de charger votre compte. Vérifiez votre connexion.");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enregistrerProfil(e: React.FormEvent) {
    e.preventDefault();
    setErreurProfil(null);
    setEnregistrementProfil(true);
    setProfilConfirme(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErreurProfil("Session expirée, reconnectez-vous.");
      setEnregistrementProfil(false);
      return;
    }

    const { error } = await supabase
      .from("profils")
      .update({ nom, metier })
      .eq("id", user.id);

    setEnregistrementProfil(false);

    if (error) {
      setErreurProfil("Impossible d'enregistrer.");
      return;
    }
    setProfilConfirme(true);
    setTimeout(() => setProfilConfirme(false), 2000);
  }

  // Sprint Notes (29/08) — un seul interrupteur, volontairement (voir
  // Module 27bis, supabase/schema.sql : "je ne veux aucun réglage
  // compliqué"). Enregistré immédiatement au clic, pas besoin de "valider"
  // — cohérent avec un simple interrupteur, contrairement au formulaire de
  // profil juste au-dessus qui, lui, regroupe plusieurs champs.
  async function basculerNotifications(actif: boolean) {
    // Sprint Robustesse (30/08) — la mise à jour optimiste ci-dessous
    // changeait visuellement l'interrupteur avant même de savoir si
    // l'enregistrement Supabase avait réussi, et n'a jamais vérifié `error` :
    // en cas d'échec, l'artisan croyait avoir changé son réglage alors que
    // la base gardait l'ancienne valeur. On garde la valeur précédente pour
    // pouvoir revenir en arrière si besoin.
    const valeurPrecedente = notificationsActives;
    setNotificationsActives(actif);
    setErreurNotifications(null);
    setEnregistrementNotifications(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setNotificationsActives(valeurPrecedente);
      setErreurNotifications("Session expirée, reconnectez-vous.");
      setEnregistrementNotifications(false);
      return;
    }
    const { error } = await supabase
      .from("profils")
      .update({ notifications_push_actives: actif })
      .eq("id", user.id);
    setEnregistrementNotifications(false);
    if (error) {
      setNotificationsActives(valeurPrecedente);
      setErreurNotifications("Impossible d'enregistrer ce réglage. Réessayez.");
    }
  }

  async function changerMotDePasse(e: React.FormEvent) {
    e.preventDefault();
    setErreurMdp(null);

    if (nouveauMotDePasse.length < 6) {
      setErreurMdp("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }

    setEnregistrementMdp(true);
    const { error } = await supabase.auth.updateUser({ password: nouveauMotDePasse });
    setEnregistrementMdp(false);

    if (error) {
      setErreurMdp("Impossible de changer le mot de passe.");
      return;
    }
    setNouveauMotDePasse("");
    setMdpConfirme(true);
    setTimeout(() => setMdpConfirme(false), 2000);
  }

  if (chargement) return null;

  // Sprint Robustesse (30/08) — voir `charger()` ci-dessus : affiche un
  // message compréhensible + un vrai bouton "Réessayer" plutôt qu'un écran
  // vide indéfini sur coupure réseau.
  if (erreurChargement) {
    return <EtatErreur message={erreurChargement} onReessayer={charger} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-ink/70 mb-4">Mon profil</h2>
        <form onSubmit={enregistrerProfil} className="flex flex-col gap-4">
          <Field label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1.5">Métier</label>
            <select
              value={metier}
              onChange={(e) => setMetier(e.target.value)}
              className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
            >
              {METIERS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          {erreurProfil && <p className="text-sm text-signal">{erreurProfil}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={enregistrementProfil} className="self-start">
              {enregistrementProfil ? "Enregistrement…" : "Enregistrer"}
            </Button>
            {profilConfirme && <span className="text-xs text-steel">✓ Enregistré</span>}
          </div>
        </form>
      </Card>

      {/*
        Sprint Notes (29/08) — philosophie "Compyo doit rester discret" :
        pas de rappel automatique de rendez-vous ou de devis, seulement les
        rappels que l'artisan crée lui-même sur une note (voir
        components/notes/FormulaireNote.tsx). Cet interrupteur coupe TOUT
        (y compris ces rappels explicites) — la permission navigateur,
        elle, n'est jamais demandée ici : uniquement au moment où
        l'artisan programme son premier rappel (voir lib/pwa/
        notifications.ts, demanderAbonnementSiNecessaire).
      */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-ink/70 mb-2">Notifications</h2>
        <p className="text-sm text-ink/60 mb-4">
          Compyo ne vous notifie que pour les rappels que vous créez vous-même sur une note —
          jamais de rappel automatique de rendez-vous ou de devis.
        </p>
        <label className="flex items-center gap-2.5 text-sm text-ink/80 cursor-pointer">
          <input
            type="checkbox"
            checked={notificationsActives}
            disabled={enregistrementNotifications}
            onChange={(e) => basculerNotifications(e.target.checked)}
            className="w-4 h-4 rounded border-ink/30 accent-signal"
          />
          Autoriser les notifications de rappel
        </label>
        {erreurNotifications && <p className="mt-2 text-sm text-signal">{erreurNotifications}</p>}
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-ink/70 mb-4">Mot de passe</h2>
        <form onSubmit={changerMotDePasse} className="flex flex-col gap-4">
          <Field
            label="Nouveau mot de passe"
            type="password"
            minLength={6}
            value={nouveauMotDePasse}
            onChange={(e) => setNouveauMotDePasse(e.target.value)}
          />
          {erreurMdp && <p className="text-sm text-signal">{erreurMdp}</p>}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="ghost"
              disabled={enregistrementMdp}
              className="self-start"
            >
              {enregistrementMdp ? "Enregistrement…" : "Changer le mot de passe"}
            </Button>
            {mdpConfirme && <span className="text-xs text-steel">✓ Changé</span>}
          </div>
        </form>
      </Card>
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-ink/70 mb-2">Parrainer un collègue</h2>
        <p className="text-sm text-ink/60 mb-4">
          Un autre artisan pourrait gagner du temps avec Compyo ? Partagez ce lien — sa
          candidature à la bêta sera automatiquement marquée comme venant de vous.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="ghost"
            onClick={async () => {
              const lien = `${window.location.origin}/demander-acces?parraine_par=${encodeURIComponent(
                nom || "un artisan"
              )}`;
              await navigator.clipboard.writeText(lien);
              setLienCopie(true);
              setTimeout(() => setLienCopie(false), 2000);
            }}
          >
            {lienCopie ? "✓ Lien copié" : "Copier mon lien d'invitation"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
