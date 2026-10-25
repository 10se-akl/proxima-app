"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BOUTON_CREUX, CHAMP, ERREUR, LIBELLE, SELECT, CASE as CASE_A_COCHER } from "@/components/ui/recettes";
import { EtatErreur } from "@/components/ui/EtatErreur";
import { METIERS } from "@/lib/metiers";

// Design v3 (24/10) — les briques de mise en page des sections.
const SECTION = "py-5 first:pt-0 last:pb-0";
const TITRE = "mb-1 text-[17px] font-semibold text-ink";
const TEXTE = "mb-3 text-[15px] leading-relaxed text-steel";
const CASE = "flex min-h-12 cursor-pointer items-center gap-3 text-base text-ink";

export function MonCompte() {
  const supabase = createClient();

  const [nom, setNom] = useState("");
  const [metier, setMetier] = useState("");
  const [notificationsActives, setNotificationsActives] = useState(true);
  const [enregistrementNotifications, setEnregistrementNotifications] = useState(false);
  // Gap 1 (11/09, voir supabase/schema.sql Module 38) — même interrupteur
  // que celui proposable depuis la pop-up "Laisser l'IA faire ce choix
  // seule la prochaine fois" (components/dashboard/NotesVocales.tsx) :
  // réglable ici aussi, pour pouvoir le désactiver sans attendre une
  // nouvelle détection.
  const [urgenceAutoIA, setUrgenceAutoIA] = useState(false);
  const [enregistrementUrgenceAuto, setEnregistrementUrgenceAuto] = useState(false);
  const [erreurUrgenceAuto, setErreurUrgenceAuto] = useState<string | null>(null);
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
        .select("nom, metier, notifications_push_actives, urgence_auto_ia")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      if (data) {
        setNom(data.nom ?? "");
        setMetier(data.metier ?? "");
        setNotificationsActives(data.notifications_push_actives ?? true);
        setUrgenceAutoIA(data.urgence_auto_ia ?? false);
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

  async function basculerUrgenceAuto(actif: boolean) {
    const valeurPrecedente = urgenceAutoIA;
    setUrgenceAutoIA(actif);
    setErreurUrgenceAuto(null);
    setEnregistrementUrgenceAuto(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUrgenceAutoIA(valeurPrecedente);
      setErreurUrgenceAuto("Session expirée, reconnectez-vous.");
      setEnregistrementUrgenceAuto(false);
      return;
    }
    const { error } = await supabase
      .from("profils")
      .update({ urgence_auto_ia: actif })
      .eq("id", user.id);
    setEnregistrementUrgenceAuto(false);
    if (error) {
      setUrgenceAutoIA(valeurPrecedente);
      setErreurUrgenceAuto("Impossible d'enregistrer ce réglage. Réessayez.");
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

  // Design v3 (24/10) : Mon compte s'ouvre DANS la carte des Paramètres —
  // plus de cartes dans la carte : des sections séparées d'un filet, un
  // titre de 17 px, les champs des recettes. Le seul bouton plein est
  // « Enregistrer » du profil ; les autres gestes sont en creux.
  return (
    <div className="flex flex-col divide-y divide-gris-clair">
      <section className={SECTION}>
        <h3 className={TITRE}>Mon profil</h3>
        <form onSubmit={enregistrerProfil} className="mt-3 flex flex-col gap-4">
          <Field label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
          <div>
            <label htmlFor="metier-compte" className={LIBELLE}>Métier</label>
            <select
              id="metier-compte"
              value={metier}
              onChange={(e) => setMetier(e.target.value)}
              className={SELECT}
            >
              {METIERS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          {erreurProfil && <p className={`!mt-0 ${ERREUR}`}>{erreurProfil}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={enregistrementProfil} className="self-start">
              {enregistrementProfil ? "Enregistrement…" : "Enregistrer"}
            </Button>
            {profilConfirme && <span className="text-[15px] font-semibold text-succes">Enregistré</span>}
          </div>
        </form>
      </section>

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
      <section className={SECTION}>
        <h3 className={TITRE}>Notifications</h3>
        <p className={TEXTE}>
          Compyo ne vous notifie que pour les rappels que vous créez vous-même sur une note —
          jamais de rappel automatique de rendez-vous ou de devis.
        </p>
        <label className={CASE}>
          <input
            type="checkbox"
            checked={notificationsActives}
            disabled={enregistrementNotifications}
            onChange={(e) => basculerNotifications(e.target.checked)}
            className={`mt-0.5 ${CASE_A_COCHER}`}
          />
          Autoriser les notifications de rappel
        </label>
        {erreurNotifications && <p className={ERREUR}>{erreurNotifications}</p>}
      </section>

      <section className={SECTION}>
        <h3 className={TITRE}>Ce que Compyo peut faire seul</h3>
        <p className={TEXTE}>
          Quand vous dictez un compte-rendu vocal sur un projet et que l&apos;IA y détecte une
          urgence, elle vous demande normalement confirmation avant de passer le projet en
          urgent. Cet interrupteur la laisse le faire directement, sans redemander — le
          changement reste toujours visible dans l&apos;historique du projet.
        </p>
        <label className={CASE}>
          <input
            type="checkbox"
            checked={urgenceAutoIA}
            disabled={enregistrementUrgenceAuto}
            onChange={(e) => basculerUrgenceAuto(e.target.checked)}
            className={`mt-0.5 ${CASE_A_COCHER}`}
          />
          Laisser l&apos;IA passer un projet en urgent automatiquement
        </label>
        {erreurUrgenceAuto && <p className={ERREUR}>{erreurUrgenceAuto}</p>}
      </section>

      <section className={SECTION}>
        <h3 className={TITRE}>Mot de passe</h3>
        <form onSubmit={changerMotDePasse} className="mt-3 flex flex-col gap-4">
          <Field
            label="Nouveau mot de passe"
            type="password"
            minLength={6}
            value={nouveauMotDePasse}
            onChange={(e) => setNouveauMotDePasse(e.target.value)}
          />
          {erreurMdp && <p className={`!mt-0 ${ERREUR}`}>{erreurMdp}</p>}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="secondary"
              disabled={enregistrementMdp}
              className="self-start"
            >
              {enregistrementMdp ? "Enregistrement…" : "Changer le mot de passe"}
            </Button>
            {mdpConfirme && <span className="text-[15px] font-semibold text-succes">Changé</span>}
          </div>
        </form>
      </section>
      <section className={SECTION}>
        <h3 className={TITRE}>Parrainer un collègue</h3>
        <p className={TEXTE}>
          Un autre artisan pourrait gagner du temps avec Compyo ? Partagez ce lien — sa
          candidature à la bêta sera automatiquement marquée comme venant de vous.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={BOUTON_CREUX}
            onClick={async () => {
              const lien = `${window.location.origin}/demander-acces?parraine_par=${encodeURIComponent(
                nom || "un artisan"
              )}`;
              await navigator.clipboard.writeText(lien);
              setLienCopie(true);
              setTimeout(() => setLienCopie(false), 2000);
            }}
          >
            {lienCopie ? "Lien copié" : "Copier mon lien d'invitation"}
          </button>
        </div>
      </section>
    </div>
  );
}
