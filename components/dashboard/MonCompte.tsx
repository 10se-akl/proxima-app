"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field } from "@/components/ui/Input";
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

export function MonCompte() {
  const supabase = createClient();

  const [nom, setNom] = useState("");
  const [metier, setMetier] = useState("");
  const [chargement, setChargement] = useState(true);
  const [lienCopie, setLienCopie] = useState(false);
  const [enregistrementProfil, setEnregistrementProfil] = useState(false);
  const [profilConfirme, setProfilConfirme] = useState(false);
  const [erreurProfil, setErreurProfil] = useState<string | null>(null);

  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [enregistrementMdp, setEnregistrementMdp] = useState(false);
  const [mdpConfirme, setMdpConfirme] = useState(false);
  const [erreurMdp, setErreurMdp] = useState<string | null>(null);

  useEffect(() => {
    async function charger() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profils")
        .select("nom, metier")
        .eq("id", user.id)
        .single();
      if (data) {
        setNom(data.nom ?? "");
        setMetier(data.metier ?? "");
      }
      setChargement(false);
    }
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
              className="w-full border border-ink/15 bg-paper px-3 py-2.5 text-sm focus:outline-none focus:border-ink"
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
          Un autre artisan pourrait gagner du temps avec Proxima ? Partagez ce lien — sa
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
