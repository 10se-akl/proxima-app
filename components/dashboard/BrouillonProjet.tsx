"use client";

import { useId, useState, type ReactNode } from "react";
import { LABEL_TYPE_CHANTIER } from "@/components/dashboard/DemandeCard";
import { IconeCrayon } from "@/components/projet/icones";
import { BOUTON_PLEIN_LARGE, BOUTON_TEXTE, CHAMP as CHAMP_V3, CREUX, ERREUR, ETIQUETTE, FORME_ETIQUETTE, GROUPE, SECONDAIRE, TITRE_ECRAN, CASE } from "@/components/ui/recettes";
import type { BrouillonProjet as TypeBrouillonProjet, NiveauConfiance, TypeChantier } from "@/types";

// ============================================================
// "Premier contact sans friction" (26/08) — écran de revue partagé entre
// les deux portes d'entrée (partage natif Android et message collé).
// Principe non négociable : le bouton de validation n'est JAMAIS bloqué,
// même si rien n'a été trouvé — l'artisan peut toujours créer le projet et
// compléter ensuite. Voir app/api/demandes/creer-depuis-brouillon, qui
// applique les mêmes filets de sécurité côté serveur.
//
// 06/10 (« le compagnon ») — un récapitulatif, plus un formulaire. Avant :
// sept champs ouverts, à relire un par un, même quand tout avait été lu
// tel quel dans le message. Maintenant :
//   - ce qui a été lu tel quel se lit, sur une ligne, et se touche pour
//     être corrigé ;
//   - ce qui a été déduit porte « à vérifier » ;
//   - seul ce qui manque est ouvert d'emblée, prêt à être rempli ;
//   - « Urgent » est une case, plus un menu.
// Les valeurs envoyées à la création sont exactement les mêmes.
// ============================================================

// Revue métier (06/09) — liste élargie à 20 valeurs, voir types/index.ts.
const TYPES_CHANTIER: TypeChantier[] = [
  "renovation_complete",
  "salle_de_bain",
  "cuisine",
  "peinture",
  "toiture",
  "electricite",
  "plomberie",
  "chauffage",
  "maconnerie",
  "terrassement",
  "facade",
  "serrurerie",
  "vitrerie",
  "charpente",
  "menuiserie",
  "plaquisterie",
  "carrelage",
  "amenagement_exterieur",
  "climatisation",
  "piscine",
  "autre",
];

// Design v3 (24/10) : le champ des recettes (contour fin, 48 px), posé sous
// son libellé.
const CHAMP = `mt-1.5 ${CHAMP_V3}`;

type Props = {
  brouillon: TypeBrouillonProjet;
  onValider: (brouillon: TypeBrouillonProjet) => void | Promise<void>;
  validationEnCours?: boolean;
  erreur?: string | null;
  /** « Projet prêt. » par défaut ; « Nouveau projet » quand le message
   *  n'a pas pu être lu (tout est à compléter, rien n'est « prêt »). */
  titre?: string;
};

type Cle = "nomClient" | "telephoneClient" | "adresseClient" | "typeChantier" | "resume" | "rdv";

/** Une ligne du récapitulatif : lue, ou ouverte pour être corrigée. */
function Ligne({
  libelle,
  confiance,
  ouverte,
  surOuvrir,
  apercu,
  children,
}: {
  libelle: string;
  confiance: NiveauConfiance;
  ouverte: boolean;
  surOuvrir: () => void;
  apercu: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  // Design v3 (24/10) : « à compléter » / « à vérifier » deviennent des
  // étiquettes sobres (teinte opaque), plus du texte orange accolé.
  const mention =
    confiance === "absent" ? (
      <span className={`${FORME_ETIQUETTE} ${ETIQUETTE.attention}`}>À compléter</span>
    ) : confiance === "deduit" ? (
      <span className={`${FORME_ETIQUETTE} ${ETIQUETTE.neutre}`}>À vérifier</span>
    ) : null;
  if (ouverte) {
    return (
      <li className="px-4 py-3">
        <label htmlFor={id} className={`flex flex-wrap items-center gap-2 ${SECONDAIRE}`}>
          {libelle}
          {mention}
        </label>
        {children(id)}
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        onClick={surOuvrir}
        className={`flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left active:bg-ink/10 sm:hover:bg-ink/5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink`}
      >
        <span className="min-w-0 flex-1">
          <span className={`flex flex-wrap items-center gap-2 ${SECONDAIRE}`}>
            {libelle}
            {mention}
          </span>
          <span className="mt-0.5 line-clamp-2 block break-words text-[17px] leading-snug text-ink">{apercu}</span>
        </span>
        <IconeCrayon className="h-5 w-5 shrink-0 text-steel" />
        <span className="sr-only">Modifier</span>
      </button>
    </li>
  );
}

function dateRdvEnLettres(date: string | null, heure: string | null): string {
  if (!date) return heure ? `à ${heure}` : "—";
  const d = new Date(`${date}T${heure || "12:00"}`);
  const jour = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return heure ? `${jour} à ${heure.replace(":", " h ").replace(/ h 00$/, " h")}` : jour;
}

export function BrouillonProjetForm({ brouillon, onValider, validationEnCours, erreur, titre = "Projet prêt." }: Props) {
  const [valeurs, setValeurs] = useState(brouillon);
  const [texteOuvert, setTexteOuvert] = useState(false);
  const aRdv = Boolean(brouillon.rdvDate.valeur || brouillon.rdvHeure.confiance !== "absent");
  // Ce qui manque est ouvert d'emblée ; le reste s'ouvre d'un appui.
  const [ouvertes, setOuvertes] = useState<Set<Cle>>(() => {
    const s = new Set<Cle>();
    if (brouillon.nomClient.confiance === "absent") s.add("nomClient");
    if (brouillon.telephoneClient.confiance === "absent") s.add("telephoneClient");
    if (brouillon.adresseClient.confiance === "absent") s.add("adresseClient");
    if (!brouillon.resume.valeur.trim()) s.add("resume");
    return s;
  });
  const ouvrir = (c: Cle) => setOuvertes((avant) => new Set(avant).add(c));

  function majChamp<K extends keyof TypeBrouillonProjet>(
    champ: K,
    valeur: TypeBrouillonProjet[K] extends { valeur: infer V } ? V : never
  ) {
    setValeurs((v) => ({
      ...v,
      [champ]: { ...(v[champ] as object), valeur },
    }));
  }

  const nbACompleter = (["nomClient", "telephoneClient", "adresseClient"] as const).filter(
    (c) => brouillon[c].confiance === "absent"
  ).length;
  const nbAVerifier = (["nomClient", "telephoneClient", "adresseClient", "typeChantier", "resume", "rdvDate"] as const).filter(
    (c) => brouillon[c].confiance === "deduit"
  ).length;
  const sousTitre =
    nbACompleter > 0
      ? `${nbACompleter} point${nbACompleter > 1 ? "s" : ""} à compléter, ou plus tard.`
      : nbAVerifier > 0
        ? `${nbAVerifier} point${nbAVerifier > 1 ? "s" : ""} à vérifier.`
        : "Tout a été lu dans le message.";

  return (
    <div>
      <h1 className={TITRE_ECRAN}>{titre}</h1>
      <p className="mt-1 text-base text-steel">{sousTitre}</p>

      {/* Design v3 (24/10) : le récapitulatif en liste groupée (surface,
          ombre douce, filets fins), plus de contour. */}
      <ul className={`mt-6 ${GROUPE}`}>
        <Ligne
          libelle="Client"
          confiance={valeurs.nomClient.confiance}
          ouverte={ouvertes.has("nomClient")}
          surOuvrir={() => ouvrir("nomClient")}
          apercu={valeurs.nomClient.valeur ?? ""}
        >
          {(id) => (
            <input
              id={id}
              value={valeurs.nomClient.valeur ?? ""}
              onChange={(e) => majChamp("nomClient", e.target.value || null)}
              placeholder="Nom du client"
              autoComplete="off"
              className={CHAMP}
            />
          )}
        </Ligne>
        <Ligne
          libelle="Téléphone"
          confiance={valeurs.telephoneClient.confiance}
          ouverte={ouvertes.has("telephoneClient")}
          surOuvrir={() => ouvrir("telephoneClient")}
          apercu={valeurs.telephoneClient.valeur ?? ""}
        >
          {(id) => (
            <input
              id={id}
              type="tel"
              inputMode="tel"
              value={valeurs.telephoneClient.valeur ?? ""}
              onChange={(e) => majChamp("telephoneClient", e.target.value || null)}
              placeholder="06 12 34 56 78"
              className={CHAMP}
            />
          )}
        </Ligne>
        <Ligne
          libelle="Adresse du chantier"
          confiance={valeurs.adresseClient.confiance}
          ouverte={ouvertes.has("adresseClient")}
          surOuvrir={() => ouvrir("adresseClient")}
          apercu={valeurs.adresseClient.valeur ?? ""}
        >
          {(id) => (
            <input
              id={id}
              value={valeurs.adresseClient.valeur ?? ""}
              onChange={(e) => majChamp("adresseClient", e.target.value || null)}
              placeholder="Adresse du chantier"
              autoComplete="off"
              className={CHAMP}
            />
          )}
        </Ligne>
        <Ligne
          libelle="Chantier"
          confiance={valeurs.typeChantier.confiance === "absent" ? "deduit" : valeurs.typeChantier.confiance}
          ouverte={ouvertes.has("typeChantier")}
          surOuvrir={() => ouvrir("typeChantier")}
          apercu={LABEL_TYPE_CHANTIER[valeurs.typeChantier.valeur] || "Autre"}
        >
          {(id) => (
            <select
              id={id}
              value={valeurs.typeChantier.valeur}
              onChange={(e) => majChamp("typeChantier", e.target.value as TypeChantier)}
              className={CHAMP}
            >
              {TYPES_CHANTIER.map((t) => (
                <option key={t} value={t}>
                  {LABEL_TYPE_CHANTIER[t] || "Autre"}
                </option>
              ))}
            </select>
          )}
        </Ligne>
        <Ligne
          libelle="La demande"
          confiance={valeurs.resume.confiance === "absent" && valeurs.resume.valeur.trim() ? "deduit" : valeurs.resume.confiance}
          ouverte={ouvertes.has("resume")}
          surOuvrir={() => ouvrir("resume")}
          apercu={valeurs.resume.valeur}
        >
          {(id) => (
            <textarea
              id={id}
              value={valeurs.resume.valeur}
              onChange={(e) => majChamp("resume", e.target.value)}
              rows={3}
              className={`${CHAMP} resize-none py-2.5`}
            />
          )}
        </Ligne>
        {aRdv && (
          <Ligne
            libelle="Rendez-vous proposé"
            confiance={valeurs.rdvDate.confiance}
            ouverte={ouvertes.has("rdv")}
            surOuvrir={() => ouvrir("rdv")}
            apercu={dateRdvEnLettres(valeurs.rdvDate.valeur, valeurs.rdvHeure.valeur)}
          >
            {(id) => (
              <div className="grid grid-cols-2 gap-3">
                <input
                  id={id}
                  type="date"
                  aria-label="Jour"
                  value={valeurs.rdvDate.valeur ?? ""}
                  onChange={(e) => majChamp("rdvDate", e.target.value || null)}
                  className={CHAMP}
                />
                <input
                  type="time"
                  aria-label="Heure"
                  value={valeurs.rdvHeure.valeur ?? ""}
                  onChange={(e) => majChamp("rdvHeure", e.target.value || null)}
                  className={CHAMP}
                />
              </div>
            )}
          </Ligne>
        )}
      </ul>

      <label className="mt-3 flex min-h-12 cursor-pointer items-center gap-3 px-1 text-base text-ink">
        <input
          type="checkbox"
          checked={valeurs.priorite.valeur === "urgent"}
          onChange={(e) => majChamp("priorite", e.target.checked ? "urgent" : "normal")}
          className={CASE}
        />
        Urgent
      </label>

      {valeurs.texteOrigine.trim() && (
        <div>
          <button
            type="button"
            onClick={() => setTexteOuvert((v) => !v)}
            aria-expanded={texteOuvert}
            className={`-ml-2 ${BOUTON_TEXTE}`}
          >
            {texteOuvert ? "Masquer le message" : "Voir le message"}
          </button>
          {texteOuvert && (
            <p className={`mt-1 whitespace-pre-wrap break-words p-4 text-base text-ink ${CREUX}`}>{valeurs.texteOrigine}</p>
          )}
        </div>
      )}

      <div aria-live="polite">
        {erreur && <p className={`mt-3 ${ERREUR}`}>{erreur}</p>}
      </div>

      {/* Sur téléphone, le bouton reste sous le pouce pendant qu'on relit,
          juste au-dessus de la barre du bas. */}
      <div className="sticky bottom-[calc(var(--barre-bas,0px)+env(safe-area-inset-bottom)+1.75rem)] z-10 mt-5 sm:static">
        <button
          type="button"
          onClick={() => onValider(valeurs)}
          disabled={validationEnCours}
          // Design v3 (24/10) : le bouton plein large des recettes, sans
          // l'ombre arbitraire d'avant.
          className={`${BOUTON_PLEIN_LARGE} sm:w-auto sm:px-8`}
        >
          {validationEnCours ? "Création…" : "Créer le projet"}
        </button>
      </div>
    </div>
  );
}
