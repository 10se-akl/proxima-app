"use client";

import {
  CHAMPS_SCENARIO, LEVIERS, MARCHES_DEFAUT, ROLES, TYPES_PONCTUELS, libelleMois,
  type IdLevier, type Marche, type Ponctuel, type Projection, type Recrutement, type Reglages, type Role, type Scenario, type TypePonctuel,
} from "@/lib/projection/moteur";
import { BoutonPetit, CHAMP, ChoixMois, Curseur, Interrupteur, Nombre, Section, nouvelId } from "./Controles";

// ============================================================
// Les sections de réglages de /admin/projection (06/10). Chacune ne fait
// qu'éditer une partie de `Reglages` ; le calcul est dans
// lib/projection/moteur.ts.
// ============================================================

type Maj = (f: (r: Reglages) => Reglages) => void;
const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const eur = (v: number) => `${fmt.format(Math.round(v))} €`;

// ------------------------------------------------------------ l'offre

export function PanneauOffre({ r, maj }: { r: Reglages; maj: Maj }) {
  const set = <K extends keyof Reglages>(k: K, v: Reglages[K]) => maj((x) => ({ ...x, [k]: v }));
  return (
    <Section titre="L'offre et le prix" resume={`${r.prix} € HT/mois${r.haussePrix ? `, +${r.haussePrix} %/an` : ""}${r.options ? `, +${r.options} € d'options` : ""}`} ouverte>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <Curseur id="prix" label="Prix par entreprise et par mois" valeur={r.prix} min={9} max={99} pas={1} suffixe=" € HT" onChange={(v) => set("prix", v)} />
        <Curseur id="hausse" label="Hausse du prix chaque année" valeur={r.haussePrix} min={0} max={15} pas={0.5} suffixe=" %" onChange={(v) => set("haussePrix", v)} />
        <Nombre label="Options payantes en plus (moyenne)" valeur={r.options} suffixe="€/client/mois" min={0} pas={1} onChange={(v) => set("options", v)} aide="Modules en plus : signature, comptes en plus, facture électronique…" />
        <Nombre label="Tarif fondateur des testeurs" valeur={r.prixTesteurs} suffixe="€/mois" min={0} onChange={(v) => set("prixTesteurs", v)} />
        <Curseur id="conversion" label="Testeurs qui passent à l'abonnement" valeur={r.conversionBeta} min={0} max={100} pas={5} suffixe=" %" onChange={(v) => set("conversionBeta", v)} />
      </div>
    </Section>
  );
}

// ------------------------------------------------------------ toi

export function PanneauToi({ r, maj, nbMois }: { r: Reglages; maj: Maj; nbMois: number }) {
  const set = <K extends keyof Reglages>(k: K, v: Reglages[K]) => maj((x) => ({ ...x, [k]: v }));
  const setSalaire = (patch: Partial<Reglages["salaire"]>) => maj((x) => ({ ...x, salaire: { ...x.salaire, ...patch } }));
  return (
    <Section
      titre="Toi"
      resume={`Société en ${libelleMois(r.mois16)} · ${r.salaire.mode === "fixe" ? `salaire fixe ${eur(r.salaire.net)} net dès ${libelleMois(r.salaire.debut)}` : "salaire selon le chiffre d'affaires"}`}
      ouverte
    >
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <ChoixMois label="Création de la SASU (lancement payant)" valeur={r.mois16} nbMois={nbMois} onChange={(v) => set("mois16", v ?? 0)} />
        <ChoixMois label="Tes 18 ans (plein temps possible)" valeur={r.mois18} nbMois={nbMois} onChange={(v) => set("mois18", v ?? 0)} />
        <Nombre label="Capital mis à la création" valeur={r.capital} suffixe="€" min={0} pas={100} onChange={(v) => set("capital", v)} />
        <Interrupteur id="pleinTemps" label="Plein temps à 18 ans" detail="ton démarchage passe au niveau « plein temps »" actif={r.pleinTemps} onChange={(v) => set("pleinTemps", v)} />
      </div>

      <div className="mt-4 rounded-xl bg-ink/[0.03] p-3">
        <p className="text-sm font-medium">Ton salaire</p>
        <div className="mt-2 flex flex-wrap gap-1" role="radiogroup" aria-label="Mode de salaire">
          {(["auto", "fixe"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={r.salaire.mode === mode}
              onClick={() => setSalaire({ mode })}
              className={`min-h-10 rounded-lg px-3 text-xs ${r.salaire.mode === mode ? "bg-ink text-paper" : "border border-ink/15 bg-surface"}`}
            >
              {mode === "auto" ? "Selon ce que la société gagne" : "Un montant que je choisis"}
            </button>
          ))}
        </div>
        {r.salaire.mode === "fixe" ? (
          <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-3">
            <Nombre label="Net par mois" valeur={r.salaire.net} suffixe="€" min={0} pas={100} onChange={(v) => setSalaire({ net: v })} />
            <ChoixMois label="À partir de" valeur={r.salaire.debut} nbMois={nbMois} onChange={(v) => setSalaire({ debut: v ?? 0 })} />
            <Nombre label="Augmentation chaque année" valeur={r.salaire.hausse} suffixe="%" min={0} pas={1} onChange={(v) => setSalaire({ hausse: v })} />
          </div>
        ) : (
          <p className="mt-2 text-xs text-ink/55">
            À partir de tes 18 ans : 1 500 € net/mois dès 150 000 € de chiffre d&apos;affaires annuel, puis 2 500, 4 000, 6 000, 9 000 €. Rien tant que la
            caisse ne couvre pas trois mois de ce salaire.
          </p>
        )}
        <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Nombre label="Coût pour la société d'1 € net versé" valeur={r.coefDirigeant} suffixe="×" min={1} max={3} pas={0.05} onChange={(v) => set("coefDirigeant", v)} aide="Président de SASU : environ ×1,8 (cotisations comprises)." />
          <Curseur id="reinvest" label="Bénéfice laissé dans la société" valeur={r.reinvest} min={0} max={100} pas={5} suffixe=" %" onChange={(v) => set("reinvest", v)} />
        </div>
      </div>
    </Section>
  );
}

// ------------------------------------------------------------ l'équipe

const MODELES_RECRUTEMENT: Record<Role, Omit<Recrutement, "id" | "debut">> = {
  aide: { poste: "Aide pour m'épauler", role: "aide", fin: null, net: 1700, tempsPct: 100, productivite: 0 },
  commercial: { poste: "Commercial(e) terrain", role: "commercial", fin: null, net: 2000, tempsPct: 100, productivite: 15 },
  dev: { poste: "Développeur·se", role: "dev", fin: null, net: 2800, tempsPct: 100, productivite: 0 },
  support: { poste: "Support client", role: "support", fin: null, net: 1800, tempsPct: 100, productivite: 0 },
};

export function PanneauEquipe({ r, maj, nbMois }: { r: Reglages; maj: Maj; nbMois: number }) {
  const setRec = (id: string, patch: Partial<Recrutement>) =>
    maj((x) => ({ ...x, recrutements: x.recrutements.map((h) => (h.id === id ? { ...h, ...patch } : h)) }));
  const ajouter = (role: Role) =>
    maj((x) => ({ ...x, recrutements: [...x.recrutements, { id: nouvelId(), debut: Math.max(x.mois16, 12), ...MODELES_RECRUTEMENT[role] }] }));
  return (
    <Section
      titre="L'équipe"
      resume={`${r.embauches ? "Embauches automatiques" : "Pas d'embauche automatique"} · ${r.recrutements.length} recrutement${r.recrutements.length > 1 ? "s" : ""} à la main`}
    >
      <div className="grid gap-x-6 sm:grid-cols-2">
        <Interrupteur id="embauches" label="Embaucher automatiquement" detail="support, développeurs, commerciaux, marketing quand Compyo grandit" actif={r.embauches} onChange={(v) => maj((x) => ({ ...x, embauches: v }))} />
        <Nombre label="Coût employeur d'1 € net" valeur={r.coefEmployeur} suffixe="×" min={1} max={3} pas={0.01} onChange={(v) => maj((x) => ({ ...x, coefEmployeur: v }))} aide="Un salarié en CDI : environ ×1,82 (net → brut → charges patronales)." />
      </div>

      <p className="mt-4 text-sm font-medium">Tes recrutements</p>
      <p className="text-xs text-ink/55">En plus des embauches automatiques. Au plus tôt à la création de la société.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(Object.keys(MODELES_RECRUTEMENT) as Role[]).map((role) => (
          <BoutonPetit key={role} onClick={() => ajouter(role)}>+ {ROLES[role]}</BoutonPetit>
        ))}
      </div>
      <ul className="mt-3 space-y-3">
        {r.recrutements.map((h) => (
          <li key={h.id} className="rounded-xl border border-ink/10 p-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
              <label className="block">
                <span className="block text-xs text-ink/60">Poste</span>
                <input value={h.poste} onChange={(e) => setRec(h.id, { poste: e.target.value })} className={`mt-1 ${CHAMP}`} />
              </label>
              <label className="block">
                <span className="block text-xs text-ink/60">Rôle</span>
                <select value={h.role} onChange={(e) => setRec(h.id, { role: e.target.value as Role })} className={`mt-1 ${CHAMP}`}>
                  {(Object.keys(ROLES) as Role[]).map((ro) => (
                    <option key={ro} value={ro}>{ROLES[ro]}</option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <BoutonPetit onClick={() => maj((x) => ({ ...x, recrutements: x.recrutements.filter((y) => y.id !== h.id) }))} titre="Retirer">Retirer</BoutonPetit>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <ChoixMois label="Arrivée" valeur={h.debut} nbMois={nbMois} onChange={(v) => setRec(h.id, { debut: v ?? 0 })} />
              <ChoixMois label="Départ" valeur={h.fin} nbMois={nbMois} vide="Reste jusqu'au bout" onChange={(v) => setRec(h.id, { fin: v })} />
              <Nombre label="Net par mois (temps plein)" valeur={h.net} suffixe="€" min={0} pas={50} onChange={(v) => setRec(h.id, { net: v })} />
              <Nombre label="Temps de travail" valeur={h.tempsPct} suffixe="%" min={0} max={100} pas={10} onChange={(v) => setRec(h.id, { tempsPct: v })} />
              {h.role === "commercial" ? (
                <Nombre label="Clients trouvés" valeur={h.productivite} suffixe="/mois" min={0} onChange={(v) => setRec(h.id, { productivite: v })} />
              ) : (
                <div />
              )}
            </div>
            <p className="mt-2 text-xs text-ink/55">
              Coût pour la société : {eur(h.net * (h.tempsPct / 100) * r.coefEmployeur + 150)}/mois (outils compris)
              {r.inflation ? `, +${r.inflation} %/an d'inflation` : ""}.
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ------------------------------------------------------------ le monde

const GROUPES: { label: string; ids: string[] }[] = [
  { label: "France seule", ids: ["fr"] },
  { label: "Francophonie", ids: ["fr", "franco", "quebec", "afrique"] },
  { label: "Europe", ids: ["fr", "franco", "sud", "portugal", "allemagne", "benelux", "uk"] },
  { label: "Le monde entier", ids: MARCHES_DEFAUT.map((m) => m.id) },
];

export function PanneauMonde({ r, maj, p, jourEnMois }: { r: Reglages; maj: Maj; p: Projection; jourEnMois: (j: number) => string }) {
  const setMk = (id: string, patch: Partial<Marche>) => maj((x) => ({ ...x, marches: x.marches.map((mk) => (mk.id === id ? { ...mk, ...patch } : mk)) }));
  const actifs = r.marches.filter((mk) => mk.actif && mk.id !== "fr").length;
  const colonnes: { cle: keyof Marche; label: string; pas: number; titre: string }[] = [
    { cle: "entreprises", label: "Entreprises", pas: 1000, titre: "Entreprises du bâtiment visées (ordre de grandeur)" },
    { cle: "seuil", label: "Dès … clients", pas: 500, titre: "Clients au total avant de s'y lancer" },
    { cle: "lancement", label: "Lancement €", pas: 5000, titre: "Traduction, juridique, campagne de lancement" },
    { cle: "coutMensuel", label: "€/mois sur place", pas: 100, titre: "Présence, support local, conformité" },
    { cle: "prixX", label: "Prix ×", pas: 0.05, titre: "Prix local par rapport à la France" },
    { cle: "presence", label: "Part tenable ×", pas: 0.05, titre: "Part de marché tenable par rapport à la France (0 à 1)" },
    { cle: "poids", label: "Acquisition ×", pas: 0.05, titre: "Force de l'acquisition, France = 1" },
    { cle: "cacX", label: "Coût client ×", pas: 0.1, titre: "Coût d'un client en publicité par rapport à la France" },
    { cle: "langues", label: "Langues", pas: 1, titre: "Langues à ajouter (un développeur de plus chacune)" },
  ];
  return (
    <Section titre="Le monde" resume={r.international ? `${actifs} marché${actifs > 1 ? "s" : ""} à l'étranger possible${actifs > 1 ? "s" : ""}, ${p.marchesLances.length} atteint${p.marchesLances.length > 1 ? "s" : ""}` : "France seulement"}>
      <Interrupteur id="international" label="S'étendre à l'étranger" detail="un marché s'ouvre quand son seuil est atteint ET que la société peut payer une fois et demie son lancement" actif={r.international} onChange={(v) => maj((x) => ({ ...x, international: v }))} />
      <div className="mt-2 flex flex-wrap gap-2">
        {GROUPES.map((g) => (
          <BoutonPetit key={g.label} onClick={() => maj((x) => ({ ...x, international: g.ids.length > 1, marches: x.marches.map((mk) => ({ ...mk, actif: mk.id === "fr" || g.ids.includes(mk.id) })) }))}>
            {g.label}
          </BoutonPetit>
        ))}
        <BoutonPetit onClick={() => maj((x) => ({ ...x, marches: MARCHES_DEFAUT }))}>Valeurs d&apos;origine</BoutonPetit>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead>
            <tr className="text-left text-[11px] text-ink/55">
              <th className="px-1.5 pb-2 font-medium">Marché</th>
              {colonnes.map((c) => (
                <th key={c.cle} className="px-1.5 pb-2 font-medium" title={c.titre}>{c.label}</th>
              ))}
              <th className="px-1.5 pb-2 font-medium">Ici</th>
            </tr>
          </thead>
          <tbody>
            {r.marches.map((mk) => {
              const lance = p.marchesLances.includes(mk.id);
              const jourLance = lance ? p.evenements.find((e) => e.type === "international" && e.texte.endsWith(mk.nom))?.jour : undefined;
              return (
                <tr key={mk.id} className="border-t border-ink/10 align-middle">
                  <td className="px-1.5 py-1.5">
                    <label className="flex min-h-10 items-center gap-2">
                      <input type="checkbox" checked={mk.id === "fr" || mk.actif} disabled={mk.id === "fr"} onChange={(e) => setMk(mk.id, { actif: e.target.checked })} className="h-4 w-4 accent-signal" />
                      <span className="whitespace-nowrap">{mk.nom}</span>
                    </label>
                  </td>
                  {colonnes.map((c) => (
                    <td key={c.cle} className="px-1.5 py-1.5">
                      <input
                        type="number"
                        aria-label={`${c.label} · ${mk.nom}`}
                        value={mk[c.cle] as number}
                        step={c.pas}
                        min={0}
                        disabled={mk.id === "fr" && ["seuil", "lancement", "coutMensuel", "presence", "prixX", "poids", "cacX", "langues"].includes(c.cle)}
                        onChange={(e) => setMk(mk.id, { [c.cle]: Number(e.target.value) || 0 } as Partial<Marche>)}
                        className={`${CHAMP} min-w-[5.5rem] disabled:opacity-40`}
                      />
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-1.5 py-1.5 text-xs text-ink/55">
                    {mk.id === "fr" ? "dès le lancement" : lance && jourLance !== undefined ? `ouvert ${jourEnMois(jourLance)}` : r.international && mk.actif ? "pas atteint" : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-ink/45">
        Les tailles de marché sont des ordres de grandeur à vérifier. La part tenable multiplie la part de marché que le scénario tient en France.
      </p>
    </Section>
  );
}

// ------------------------------------------------------------ les événements

const MODELES_PONCTUELS: Record<TypePonctuel, Omit<Ponctuel, "id" | "mois">> = {
  depense: { libelle: "Grosse dépense", type: "depense", montant: 50000, repetition: 1, dilution: 0, taux: 0, duree: 0, effet: 0 },
  recette: { libelle: "Subvention ou prix", type: "recette", montant: 20000, repetition: 1, dilution: 0, taux: 0, duree: 0, effet: 0 },
  levee: { libelle: "Levée de fonds", type: "levee", montant: 500000, repetition: 1, dilution: 15, taux: 0, duree: 0, effet: 0 },
  pret: { libelle: "Prêt bancaire", type: "pret", montant: 50000, repetition: 1, dilution: 0, taux: 5, duree: 60, effet: 0 },
  choc: { libelle: "Un concurrent fort arrive", type: "choc", montant: 0, repetition: 0, dilution: 0, taux: 0, duree: 0, effet: -30 },
};

export function PanneauPonctuels({ r, maj, nbMois }: { r: Reglages; maj: Maj; nbMois: number }) {
  const setE = (id: string, patch: Partial<Ponctuel>) => maj((x) => ({ ...x, ponctuels: x.ponctuels.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const ajouter = (type: TypePonctuel, patch: Partial<Ponctuel> = {}) =>
    maj((x) => ({ ...x, ponctuels: [...x.ponctuels, { id: nouvelId(), mois: Math.min(nbMois - 1, 12), ...MODELES_PONCTUELS[type], ...patch }] }));
  return (
    <Section titre="Événements ponctuels" resume={r.ponctuels.length ? `${r.ponctuels.length} événement${r.ponctuels.length > 1 ? "s" : ""}` : "Une grosse dépense, une levée de fonds, un prêt, un concurrent…"}>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(MODELES_PONCTUELS) as TypePonctuel[]).map((t) => (
          <BoutonPetit key={t} onClick={() => ajouter(t)}>+ {TYPES_PONCTUELS[t]}</BoutonPetit>
        ))}
        <BoutonPetit plein onClick={() => ajouter("depense", { libelle: "Gros coût au bout d'un an", montant: 5000000, mois: Math.min(nbMois - 1, 12) })}>
          Exemple : 5 M€ au bout d&apos;un an
        </BoutonPetit>
        <BoutonPetit onClick={() => ajouter("choc", { libelle: "Passage à la télé", effet: 60, repetition: 3 })}>Exemple : passage télé</BoutonPetit>
      </div>
      <ul className="mt-3 space-y-3">
        {r.ponctuels.map((e) => (
          <li key={e.id} className="rounded-xl border border-ink/10 p-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
              <label className="block">
                <span className="block text-xs text-ink/60">Type</span>
                <select value={e.type} onChange={(ev) => setE(e.id, { type: ev.target.value as TypePonctuel })} className={`mt-1 ${CHAMP}`}>
                  {(Object.keys(TYPES_PONCTUELS) as TypePonctuel[]).map((t) => (
                    <option key={t} value={t}>{TYPES_PONCTUELS[t]}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs text-ink/60">Libellé</span>
                <input value={e.libelle} onChange={(ev) => setE(e.id, { libelle: ev.target.value })} className={`mt-1 ${CHAMP}`} />
              </label>
              <div className="flex items-end">
                <BoutonPetit onClick={() => maj((x) => ({ ...x, ponctuels: x.ponctuels.filter((y) => y.id !== e.id) }))}>Retirer</BoutonPetit>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <ChoixMois label="Quand" valeur={e.mois} nbMois={nbMois} onChange={(v) => setE(e.id, { mois: v ?? 0 })} />
              {e.type !== "choc" && (
                <Nombre label={e.type === "depense" || e.type === "recette" ? (e.repetition === 1 ? "Montant" : "Montant par mois") : "Montant"} valeur={e.montant} suffixe="€" min={0} pas={1000} onChange={(v) => setE(e.id, { montant: v })} />
              )}
              {(e.type === "depense" || e.type === "recette" || e.type === "choc") && (
                <Nombre label="Pendant" valeur={e.repetition} suffixe={e.repetition === 0 ? "mois (jusqu'au bout)" : "mois"} min={0} onChange={(v) => setE(e.id, { repetition: v })} aide="1 = une seule fois ; 0 = jusqu'à la fin" />
              )}
              {e.type === "choc" && (
                <Nombre label="Effet sur les nouveaux clients" valeur={e.effet} suffixe="%" min={-100} max={500} pas={5} onChange={(v) => setE(e.id, { effet: v })} aide="−30 : un concurrent ; +60 : un passage télé" />
              )}
              {e.type === "levee" && (
                <Nombre label="Part de la société cédée" valeur={e.dilution} suffixe="%" min={0} max={100} onChange={(v) => setE(e.id, { dilution: v })} aide="Tes dividendes baissent d'autant" />
              )}
              {e.type === "pret" && (
                <>
                  <Nombre label="Taux annuel" valeur={e.taux} suffixe="%" min={0} pas={0.1} onChange={(v) => setE(e.id, { taux: v })} />
                  <Nombre label="Remboursé en" valeur={e.duree} suffixe="mois" min={1} onChange={(v) => setE(e.id, { duree: v })} />
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-ink/45">
        Dépense et recette passent dans le résultat (donc dans l&apos;impôt). Une levée ou un prêt remplissent la caisse sans être du chiffre d&apos;affaires ; seuls les
        intérêts du prêt sont une charge.
      </p>
    </Section>
  );
}

// ------------------------------------------------------------ le réalisme

export function PanneauRealisme({ r, maj }: { r: Reglages; maj: Maj }) {
  const set = <K extends keyof Reglages>(k: K, v: Reglages[K]) => maj((x) => ({ ...x, [k]: v }));
  const fois = (v: number) => `×${v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}`;
  return (
    <Section titre="Marché, coûts et impôts" resume={`acquisition ${fois(r.multAcquisition)} · départs ${fois(r.multChurn)}${r.saisonnalite ? " · saisonnalité" : ""}${r.inflation ? ` · inflation ${r.inflation} %` : ""}`}>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <Curseur id="multAcq" label="Nouveaux clients (tous canaux)" valeur={r.multAcquisition} min={0.25} max={3} pas={0.05} format={fois} onChange={(v) => set("multAcquisition", v)} />
        <Curseur id="multChurn" label="Départs" valeur={r.multChurn} min={0.25} max={3} pas={0.05} format={fois} onChange={(v) => set("multChurn", v)} />
        <Curseur id="multCac" label="Coût d'un client en publicité" valeur={r.multCac} min={0.25} max={4} pas={0.05} format={fois} onChange={(v) => set("multCac", v)} />
        <Curseur id="inflation" label="Inflation (salaires, frais fixes)" valeur={r.inflation} min={0} max={8} pas={0.5} suffixe=" %/an" onChange={(v) => set("inflation", v)} />
        <Nombre label="IA par client au départ" valeur={r.coutIA} suffixe="€/mois" min={0} pas={0.5} onChange={(v) => set("coutIA", v)} />
        <Curseur id="baisseIA" label="Baisse du prix de l'IA par an" valeur={r.baisseIA} min={0} max={40} pas={5} suffixe=" %" onChange={(v) => set("baisseIA", v)} />
        <Nombre label="Réserve gardée avant les dividendes" valeur={r.reserveMois} suffixe="mois de charges" min={0} max={24} onChange={(v) => set("reserveMois", v)} />
        <Nombre label="Prélèvement sur les dividendes" valeur={r.flatTax} suffixe="%" min={0} max={60} pas={0.5} onChange={(v) => set("flatTax", v)} aide="Flat tax : 30 %. Impôt sur les sociétés : 15 % jusqu'à 42 500 €, 25 % au-delà." />
      </div>
      <Interrupteur id="saison" label="Saisonnalité du bâtiment" detail="on signe moitié moins en août, peu avant Noël, beaucoup à la rentrée" actif={r.saisonnalite} onChange={(v) => set("saisonnalite", v)} />
    </Section>
  );
}

// ------------------------------------------------------------ leviers

export function PanneauLeviers({ r, maj }: { r: Reglages; maj: Maj }) {
  const n = LEVIERS.filter((l) => r.leviers[l.id]).length;
  return (
    <Section titre="Fonctionnalités et techniques" resume={`${n} levier${n > 1 ? "s" : ""} allumé${n > 1 ? "s" : ""} sur ${LEVIERS.length}`}>
      <div className="grid sm:grid-cols-2">
        {LEVIERS.map((l) => (
          <Interrupteur
            key={l.id}
            id={`levier-${l.id}`}
            label={l.label}
            detail={`${l.type === "fonctionnalité" ? "À construire" : "Technique"} · ${l.effet}`}
            actif={r.leviers[l.id]}
            onChange={(v) => maj((x) => ({ ...x, leviers: { ...x.leviers, [l.id as IdLevier]: v } }))}
          />
        ))}
      </div>
    </Section>
  );
}

// ------------------------------------------------------------ le scénario

export function PanneauScenario({ r, maj, sc }: { r: Reglages; maj: Maj; sc: Scenario }) {
  const ajuste = r.ajustements[sc.id] ?? {};
  const nb = Object.keys(ajuste).length;
  const setChamp = (cle: string, v: number | number[]) =>
    maj((x) => ({ ...x, ajustements: { ...x.ajustements, [sc.id]: { ...(x.ajustements[sc.id] ?? {}), [cle]: v } } }));
  const commerciaux = (ajuste.commerciaux ?? sc.commerciaux).join(", ");
  return (
    <Section titre={`Le scénario « ${sc.label} », champ par champ`} resume={nb ? `${nb} paramètre${nb > 1 ? "s" : ""} modifié${nb > 1 ? "s" : ""}` : "valeurs d'origine"}>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {CHAMPS_SCENARIO.map((c) => {
          const valeur = (ajuste[c.cle] as number | undefined) ?? sc[c.cle];
          return (
            <Nombre
              key={c.cle}
              label={c.label}
              valeur={valeur}
              suffixe={c.suffixe}
              pas={c.pas}
              min={0}
              onChange={(v) => setChamp(c.cle, v)}
              aide={ajuste[c.cle] !== undefined ? `à l'origine : ${sc[c.cle]}` : undefined}
            />
          );
        })}
        <label className="block">
          <span className="block text-xs text-ink/60">Commerciaux embauchés à … clients</span>
          <input
            defaultValue={commerciaux}
            key={`${sc.id}-${commerciaux}`}
            onBlur={(e) => setChamp("commerciaux", e.target.value.split(/[,;\s]+/).map(Number).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b))}
            className={`mt-1 ${CHAMP}`}
            placeholder="1000, 2500, 5000"
          />
          <span className="mt-0.5 block text-[11px] text-ink/45">Séparés par des virgules (embauches automatiques).</span>
        </label>
      </div>
      {nb > 0 && (
        <div className="mt-3">
          <BoutonPetit onClick={() => maj((x) => ({ ...x, ajustements: { ...x.ajustements, [sc.id]: {} } }))}>Revenir aux valeurs d&apos;origine</BoutonPetit>
        </div>
      )}
    </Section>
  );
}
