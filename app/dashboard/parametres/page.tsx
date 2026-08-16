"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field, TextareaField } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PARAMETRES_PAR_DEFAUT } from "@/lib/moteur-metier/calculerDevis";
import { MonCompte } from "@/components/dashboard/MonCompte";

type FormState = typeof PARAMETRES_PAR_DEFAUT;
type Onglet = "entreprise" | "compte";

export default function ParametresPage() {
  const supabase = createClient();

  const [form, setForm] = useState<FormState>(PARAMETRES_PAR_DEFAUT);
  const [onglet, setOnglet] = useState<Onglet>("entreprise");
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [confirme, setConfirme] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [envoiLogo, setEnvoiLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function charger() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("parametres_entreprise")
        .select("*")
        .eq("artisan_id", user.id)
        .maybeSingle();

      if (data) {
        setForm(data as FormState);
      }
      setChargement(false);
    }
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Le bucket "logos" est privé comme les photos de chantier : on génère
  // une URL signée temporaire pour l'aperçu plutôt que de le rendre public.
  useEffect(() => {
    async function chargerApercu() {
      if (!form.logo_url) {
        setLogoUrl(null);
        return;
      }
      const { data } = await supabase.storage
        .from("logos")
        .createSignedUrl(form.logo_url, 3600);
      setLogoUrl(data?.signedUrl ?? null);
    }
    chargerApercu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.logo_url]);

  async function changerLogo(fichier: File | null) {
    if (!fichier) return;
    setEnvoiLogo(true);
    setErreur(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErreur("Session expirée, reconnectez-vous.");
      setEnvoiLogo(false);
      return;
    }

    const chemin = `${user.id}/logo-${Date.now()}-${fichier.name}`;
    const { error } = await supabase.storage.from("logos").upload(chemin, fichier);

    setEnvoiLogo(false);

    if (error) {
      setErreur("Impossible d'envoyer le logo.");
      return;
    }

    // L'ancien fichier (s'il existe) reste dans le stockage mais n'est plus
    // référencé — sans conséquence pour un logo d'entreprise, et ça évite
    // un appel réseau supplémentaire pour le supprimer.
    setForm((f) => ({ ...f, logo_url: chemin }));
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  function update<K extends keyof FormState>(champ: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const brut = e.target.value;
      const estNumerique = typeof PARAMETRES_PAR_DEFAUT[champ] === "number";
      setForm({
        ...form,
        [champ]: estNumerique ? (brut === "" ? null : Number(brut)) : brut,
      });
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnregistrement(true);
    setConfirme(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErreur("Session expirée, reconnectez-vous.");
      setEnregistrement(false);
      return;
    }

    const { error } = await supabase
      .from("parametres_entreprise")
      .upsert({ artisan_id: user.id, ...form }, { onConflict: "artisan_id" });

    setEnregistrement(false);

    if (error) {
      setErreur("Impossible d'enregistrer les paramètres.");
      return;
    }

    setConfirme(true);
  }

  if (chargement) {
    return <div className="p-8 text-sm text-ink/50">Chargement…</div>;
  }

  return (
    <div className="p-8 max-w-2xl">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-2">
        Paramètres
      </p>
      <h1 className="font-display text-2xl font-semibold">Paramètres</h1>

      <div className="mt-5 flex gap-2 border-b border-ink/10">
        {(["entreprise", "compte"] as Onglet[]).map((o) => (
          <button
            key={o}
            onClick={() => setOnglet(o)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors duration-200 ${
              onglet === o
                ? "border-signal text-ink font-medium"
                : "border-transparent text-ink/50 hover:text-ink hover:border-ink/20"
            }`}
          >
            {o === "entreprise" ? "Mon entreprise" : "Mon compte"}
          </button>
        ))}
      </div>

      {onglet === "compte" ? (
        <div className="mt-6">
          <MonCompte />
        </div>
      ) : (
        <>
      <p className="mt-6 text-sm text-ink/60">
        Ces valeurs sont utilisées automatiquement pour calculer chaque devis. Aucune IA
        n&apos;intervient dans ce calcul — vous gardez un contrôle total.
      </p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div>
            <h2 className="text-sm font-semibold text-ink/70 mb-4">Devis &amp; PDF</h2>
            <p className="text-xs text-ink/50 -mt-2 mb-4">
              Utilisés uniquement pour l&apos;export imprimé du devis — aucune IA n&apos;y touche.
            </p>
            <div className="flex items-center gap-4 mb-5">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo de l'entreprise"
                  className="w-16 h-16 rounded-xl object-contain border border-ink/10 bg-surface"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl grid place-items-center border border-dashed border-ink/15 text-[10px] text-ink/30 text-center">
                  Aucun logo
                </div>
              )}
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => changerLogo(e.target.files?.[0] ?? null)}
                  className="hidden"
                  id="logo-input"
                />
                <label
                  htmlFor="logo-input"
                  className="inline-flex items-center gap-2 rounded-xl border border-ink/15 text-sm px-4 py-2 transition-colors duration-200 hover:border-signal/30 hover:bg-ink/5 cursor-pointer"
                >
                  {envoiLogo ? "Envoi…" : logoUrl ? "Changer le logo" : "Ajouter un logo"}
                </label>
                <p className="mt-1.5 text-[11px] text-ink/40">Affiché en haut de chaque devis exporté.</p>
              </div>
            </div>
            <TextareaField
              label="Conditions générales (affichées en bas du devis)"
              rows={4}
              placeholder="Ex : Devis valable 30 jours. Acompte de 30% à la commande. TVA non applicable, art. 293B du CGI (le cas échéant)."
              value={form.conditions_generales ?? ""}
              onChange={(e) => setForm({ ...form, conditions_generales: e.target.value })}
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-ink/70 mb-4">Informations générales</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field
                label="Nom de l'entreprise"
                value={form.nom_entreprise ?? ""}
                onChange={update("nom_entreprise")}
              />
              <Field label="Adresse" value={form.adresse ?? ""} onChange={update("adresse")} />
              <Field
                label="Téléphone"
                type="tel"
                value={form.telephone ?? ""}
                onChange={update("telephone")}
              />
              <Field
                label="Email"
                type="email"
                value={form.email ?? ""}
                onChange={update("email")}
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-ink/70 mb-4">Tarification</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field
                label="TVA (%)"
                type="number"
                step="0.01"
                required
                value={form.tva_pct}
                onChange={update("tva_pct")}
              />
              <Field
                label="Coût horaire (€)"
                type="number"
                step="0.01"
                required
                value={form.cout_horaire}
                onChange={update("cout_horaire")}
              />
              <Field
                label="Coût journalier (€)"
                type="number"
                step="0.01"
                value={form.cout_journalier ?? ""}
                onChange={update("cout_journalier")}
              />
              <Field
                label="Marge par défaut (%)"
                type="number"
                step="0.01"
                required
                value={form.marge_defaut_pct}
                onChange={update("marge_defaut_pct")}
              />
              <Field
                label="Heures minimum facturables"
                type="number"
                step="0.5"
                required
                value={form.heures_min_facturables}
                onChange={update("heures_min_facturables")}
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-ink/70 mb-4">Déplacement</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field
                label="Forfait déplacement (€)"
                type="number"
                step="0.01"
                value={form.forfait_deplacement}
                onChange={update("forfait_deplacement")}
              />
              <Field
                label="Prix au km (€)"
                type="number"
                step="0.01"
                value={form.prix_km}
                onChange={update("prix_km")}
              />
              <Field
                label="Rayon d'intervention max (km)"
                type="number"
                step="1"
                value={form.rayon_max_km ?? ""}
                onChange={update("rayon_max_km")}
              />
            </div>
          </div>

          {erreur && <p className="text-sm text-signal">{erreur}</p>}
          {confirme && (
            <p className="text-sm text-steel">
              Paramètres enregistrés. Vos prochains devis les utiliseront automatiquement.
            </p>
          )}

          <Button type="submit" disabled={enregistrement} className="self-start">
            {enregistrement ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </Card>
        </>
      )}
    </div>
  );
}
