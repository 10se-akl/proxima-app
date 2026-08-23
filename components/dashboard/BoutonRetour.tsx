"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { TextareaField } from "@/components/ui/Input";
import { IconeRetours } from "@/components/ui/Icones";

// ============================================================
// "Faire un retour" — voir Module 16 (supabase/schema.sql) et
// app/api/retours/route.ts. Bouton discret mais TOUJOURS accessible
// (position fixe, présent sur toutes les pages du dashboard, voir
// app/dashboard/layout.tsx), pensé pour un envoi en moins de 30 secondes :
// un choix de type, un texte, un curseur d'importance, une pièce jointe
// optionnelle. Le rapprochement/nettoyage/résumé se fait ensuite côté IA
// (route serveur), pas ici.
// ============================================================

const TYPES: { valeur: string; label: string }[] = [
  { valeur: "probleme", label: "Problème" },
  { valeur: "idee", label: "Idée" },
  { valeur: "amelioration", label: "Amélioration" },
  { valeur: "bug", label: "Bug" },
];

export function BoutonRetour() {
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-anthracite text-white pl-3.5 pr-4 py-2.5 text-sm font-medium shadow-lg shadow-black/10 hover:bg-ink hover:scale-[1.03] active:scale-[0.97] transition-all"
      >
        <span aria-hidden="true">💡</span>
        <span>Faire un retour</span>
      </button>

      {ouvert && <ModaleRetour onFermer={() => setOuvert(false)} />}
    </>
  );
}

function ModaleRetour({ onFermer }: { onFermer: () => void }) {
  const supabase = createClient();
  const [type, setType] = useState("probleme");
  const [texte, setTexte] = useState("");
  const [importance, setImportance] = useState(5);
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirme, setConfirme] = useState(false);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!texte.trim()) {
      setErreur("Décrivez votre retour en quelques mots.");
      return;
    }
    setEnvoi(true);
    setErreur(null);

    try {
      let pieceJointeChemin: string | null = null;

      if (fichier) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const chemin = `${user.id}/${Date.now()}-${fichier.name}`;
          const { error: erreurUpload } = await supabase.storage.from("retours").upload(chemin, fichier);
          if (!erreurUpload) pieceJointeChemin = chemin;
        }
      }

      const res = await fetch("/api/retours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texte, importance, type, piece_jointe_chemin: pieceJointeChemin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErreur(data.error || "Impossible d'envoyer votre retour.");
        setEnvoi(false);
        return;
      }
      setEnvoi(false);
      setConfirme(true);
    } catch {
      setErreur("Impossible d'envoyer votre retour. Vérifiez votre connexion.");
      setEnvoi(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-0 sm:p-6"
      onClick={onFermer}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-paper rounded-t-3xl sm:rounded-3xl border border-ink/10 shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        {confirme ? (
          <div className="py-6 text-center">
            <p className="text-2xl mb-2" aria-hidden="true">
              ✓
            </p>
            <p className="font-display text-lg font-semibold">Merci pour votre retour</p>
            <p className="mt-1.5 text-sm text-ink/60">
              Il vient d&apos;être analysé et rattaché à la carte mentale de Compyo.
            </p>
            <Button onClick={onFermer} className="mt-5 !px-5 !py-2.5">
              Fermer
            </Button>
          </div>
        ) : (
          <form onSubmit={envoyer} className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-1">
                  Faire un retour
                </p>
                <h2 className="font-display text-lg font-semibold">Aidez-nous à améliorer Compyo</h2>
              </div>
              <button
                type="button"
                onClick={onFermer}
                aria-label="Fermer"
                className="shrink-0 text-ink/40 hover:text-ink/70 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink/70 mb-2">De quoi s&apos;agit-il ?</label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.valeur}
                    type="button"
                    onClick={() => setType(t.valeur)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      type === t.valeur
                        ? "border-signal bg-signal/10 text-signal-fonce"
                        : "border-ink/15 text-ink/60 hover:border-ink/30"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <TextareaField
              label="Votre retour"
              rows={4}
              required
              placeholder="Ex : Je ne peux pas dupliquer un ancien devis, je dois tout retaper à chaque fois."
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
            />

            <div>
              <label className="block text-xs font-medium text-ink/70 mb-2">
                À quel point ça compte pour vous ? ({importance}/10)
              </label>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={importance}
                onChange={(e) => setImportance(Number(e.target.value))}
                className="w-full accent-signal"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink/70 mb-2">
                Capture d&apos;écran ou photo (optionnel)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-ink/60 file:mr-3 file:rounded-full file:border-0 file:bg-ink/5 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink/70 hover:file:bg-ink/10"
              />
            </div>

            {erreur && <p className="text-sm text-signal">{erreur}</p>}

            <Button type="submit" disabled={envoi} className="self-start">
              {envoi ? "Analyse en cours…" : "Envoyer"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
