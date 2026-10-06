"use client";

import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import {
  HORIZON_MAX, MARCHES_DEFAUT, REGLAGES_DEFAUT, SCENARIOS, apportDesLeviers, dateDuJour, libelleMois, moisDuJour, nbJoursPour, projeter,
  relireReglages, scenarioAjuste, type IdScenario, type Periode, type Reglages,
} from "@/lib/projection/moteur";
import { GraphiqueTemps, Navigateur, bornerPlage, type Plage } from "./GraphiqueTemps";
import { BoutonPetit, CHAMP, nouvelId } from "./Controles";
import { PanneauEquipe, PanneauLeviers, PanneauMonde, PanneauOffre, PanneauPonctuels, PanneauRealisme, PanneauScenario, PanneauToi } from "./Panneaux";

// ============================================================
// /admin/projection — Compyo jour par jour (05/10, élargie le 06/10).
//
// La durée se choisit (1 à 15 ans). Quatre scénarios du pire au meilleur,
// chacun ajustable champ par champ ; ton salaire (fixe ou selon le chiffre
// d'affaires) ; tes recrutements ; les événements ponctuels (grosse
// dépense, levée de fonds, prêt, concurrent…) ; les marchés du monde un
// par un ; la saisonnalité, l'inflation, les impôts. Une alerte dit quand
// la société manquerait d'argent, et combien il faudrait trouver.
// Rien n'est enregistré en base : les réglages et les sauvegardes restent
// dans ce navigateur (localStorage).
// ============================================================

const CLE_REGLAGES = "compyo-admin-projection";
const CLE_SAUVEGARDES = "compyo-admin-projection-sauvegardes";
type Sauvegarde = { id: string; nom: string; scenario: IdScenario; reglages: Reglages; le: string };

const COULEUR_SCENARIO: Record<IdScenario, string> = {
  pire: "rgb(var(--c-alerte-orange))",
  prudent: "rgb(var(--c-bleu))",
  reussite: "rgb(var(--c-succes))",
  meilleur: "rgb(var(--c-violet))",
};
const COULEURS_CANAUX = {
  bao: "rgb(var(--c-signal))",
  demarchage: "rgb(var(--c-ink) / 0.7)",
  internet: "rgb(var(--c-steel))",
  pub: "rgb(var(--c-signal-clair))",
};
// Une couleur par marché, dans l'ordre de MARCHES_DEFAUT.
const COULEURS_MARCHES = [
  "rgb(var(--c-ink) / 0.75)", "rgb(var(--c-signal))", "rgb(var(--c-bleu))", "rgb(var(--c-violet))", "rgb(var(--c-succes))",
  "rgb(var(--c-alerte-orange))", "rgb(var(--c-steel))", "rgb(var(--c-signal-clair))", "rgb(var(--c-bleu) / 0.5)",
  "rgb(var(--c-violet) / 0.5)", "rgb(var(--c-succes) / 0.5)",
];

const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const eur = (v: number) => `${fmt.format(Math.round(v))} €`;
const nb = (v: number) => fmt.format(Math.round(v));
const nb1 = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: v < 10 ? 1 : 0 });
function compact(v: number, suffixe = "€") {
  const a = Math.abs(v), s = v < 0 ? "−" : "";
  if (a >= 1e9) return `${s}${(a / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Md${suffixe}`;
  if (a >= 1e6) return `${s}${(a / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M${suffixe}`;
  if (a >= 1e4) return `${s}${Math.round(a / 1e3).toLocaleString("fr-FR")} k${suffixe}`;
  if (a >= 1e3) return `${s}${(a / 1e3).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k${suffixe}`;
  return `${s}${Math.round(a)} ${suffixe}`.trim();
}
const dateLongue = (j: number) =>
  dateDuJour(j).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const dateCourte = (j: number) => dateDuJour(j).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const moisAnnee = (j: number) => dateDuJour(j).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const isoDuJour = (j: number) => dateDuJour(j).toISOString().slice(0, 10);
const duree = (h: number) => (h === 1 ? "1 an" : `${h} ans`);

const HORIZONS = [1, 2, 3, 5, 10, 15];
const ZOOMS: { label: string; jours: number }[] = [
  { label: "Tout", jours: Infinity },
  { label: "5 ans", jours: 1826 },
  { label: "2 ans", jours: 730 },
  { label: "1 an", jours: 365 },
  { label: "3 mois", jours: 91 },
  { label: "1 mois", jours: 30 },
  { label: "1 semaine", jours: 7 },
];

type Granularite = "mois" | "trimestre" | "exercice";

/** Regroupe des mois en trimestres : les flux s'additionnent, les stocks
 *  (clients, trésorerie, équipe) sont ceux de la fin. */
function regrouper(mois: Periode[], taille: number): Periode[] {
  const out: Periode[] = [];
  for (let i = 0; i < mois.length; i += taille) {
    const bloc = mois.slice(i, i + taille);
    const dernier = bloc[bloc.length - 1];
    const somme = (f: (x: Periode) => number) => bloc.reduce((s, x) => s + f(x), 0);
    out.push({
      ...dernier,
      n: out.length + 1,
      debut: bloc[0].debut,
      ca: somme((x) => x.ca), totalCharges: somme((x) => x.totalCharges), resultat: somme((x) => x.resultat), is: somme((x) => x.is),
      salaireNet: somme((x) => x.salaireNet), dividendesNets: somme((x) => x.dividendesNets), poche: somme((x) => x.poche),
      reinvesti: somme((x) => x.reinvesti), departs: somme((x) => x.departs), apports: somme((x) => x.apports),
      charges: {
        toi: somme((x) => x.charges.toi), equipe: somme((x) => x.charges.equipe), pub: somme((x) => x.charges.pub), ia: somme((x) => x.charges.ia),
        international: somme((x) => x.charges.international), reste: somme((x) => x.charges.reste), ponctuel: somme((x) => x.charges.ponctuel),
      },
      nouveaux: {
        bao: somme((x) => x.nouveaux.bao), demarchage: somme((x) => x.nouveaux.demarchage), internet: somme((x) => x.nouveaux.internet), pub: somme((x) => x.nouveaux.pub),
      },
    });
  }
  return out;
}

function Bloc({ titre, sousTitre, droite, children }: { titre: string; sousTitre?: ReactNode; droite?: ReactNode; children: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold">{titre}</h2>
          {sousTitre && <p className="mt-0.5 max-w-3xl text-xs text-ink/55">{sousTitre}</p>}
        </div>
        {droite}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function Legende({ items }: { items: { nom: string; couleur: string; aire?: boolean }[] }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/60">
      {items.map((i) => (
        <li key={i.nom} className="flex items-center gap-1.5">
          <span aria-hidden className={i.aire ? "h-2.5 w-2.5 rounded-sm" : "h-0.5 w-3.5 rounded"} style={{ background: i.couleur }} />
          {i.nom}
        </li>
      ))}
    </ul>
  );
}

export function VueProjection() {
  const [idScenario, setIdScenario] = useState<IdScenario>("prudent");
  const [reglages, setReglages] = useState<Reglages>(REGLAGES_DEFAUT);
  const [plage, setPlage] = useState<Plage>([0, nbJoursPour(REGLAGES_DEFAUT.horizon) - 1]);
  const [survol, setSurvol] = useState<number | null>(null);
  const [jourChoisi, setJourChoisi] = useState<number>(365);
  const [granularite, setGranularite] = useState<Granularite>("exercice");
  const [sauvegardes, setSauvegardes] = useState<Sauvegarde[]>([]);
  const [nomSauvegarde, setNomSauvegarde] = useState("");
  const [voirApports, setVoirApports] = useState(false);

  // Réglages et sauvegardes gardés dans ce navigateur seulement.
  useEffect(() => {
    try {
      const memo = JSON.parse(localStorage.getItem(CLE_REGLAGES) || "null");
      if (memo?.reglages) setReglages(relireReglages(memo.reglages));
      if (memo?.scenario) setIdScenario(memo.scenario);
      const liste = JSON.parse(localStorage.getItem(CLE_SAUVEGARDES) || "[]");
      if (Array.isArray(liste)) setSauvegardes(liste);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(CLE_REGLAGES, JSON.stringify({ reglages, scenario: idScenario }));
    } catch {}
  }, [reglages, idScenario]);
  const ecrireSauvegardes = (liste: Sauvegarde[]) => {
    setSauvegardes(liste);
    try {
      localStorage.setItem(CLE_SAUVEGARDES, JSON.stringify(liste));
    } catch {}
  };

  const r = useDeferredValue(reglages);
  const N = nbJoursPour(r.horizon);
  const fin = N - 1;
  const nbMois = r.horizon * 12;
  // La durée change : on montre tout, et le jour choisi reste dedans.
  useEffect(() => {
    setPlage([0, N - 1]);
    setJourChoisi((j) => Math.min(j, N - 1));
  }, [N]);
  const plageSure: Plage = plage[1] > fin ? [0, fin] : plage;

  const projections = useMemo(() => SCENARIOS.map((sc) => ({ sc: scenarioAjuste(sc, r), brut: sc, p: projeter(sc, r) })), [r]);
  const choisi = projections.find((x) => x.sc.id === idScenario)!;
  const sc = choisi.sc, p = choisi.p;
  const apports = useMemo(() => (voirApports ? apportDesLeviers(choisi.brut, r) : []), [voirApports, choisi.brut, r]);
  const derniere = p.annees[p.annees.length - 1];
  const couleur = COULEUR_SCENARIO[sc.id];
  const reperes = p.evenements.map((e) => ({ jour: e.jour, texte: `${dateCourte(e.jour)} : ${e.texte}` }));
  const maj = (f: (x: Reglages) => Reglages) => setReglages((x) => f(x));
  const zoomSur = (j: number, jours: number) => setPlage(bornerPlage([j - jours / 2, j + jours / 2], N));
  const choisir = (j: number) => setJourChoisi(Math.max(0, Math.min(fin, j)));
  const commun = { plage: plageSure, total: N, onPlage: setPlage, survol, onSurvol: setSurvol, onChoisir: choisir, reperes };
  const maxApport = Math.max(1, ...apports.map((x) => Math.abs(x.poche)));
  const j = Math.min(jourChoisi, fin);
  const finLibelle = moisAnnee(fin);
  const lignes = granularite === "exercice" ? p.annees : granularite === "trimestre" ? regrouper(p.mois, 3) : p.mois;
  const marchesVus = MARCHES_DEFAUT.map((mk, i) => ({ mk, couleur: COULEURS_MARCHES[i % COULEURS_MARCHES.length] })).filter(
    ({ mk }) => p.parMarche[mk.id] && (mk.id === "fr" || p.marchesLances.includes(mk.id))
  );
  // Ce qu'il faudrait trouver pour ne jamais passer sous zéro, arrondi.
  const besoin = p.premierJourNegatif !== null ? Math.ceil((-p.tresorerieMin * 1.2) / 10000) * 10000 : 0;

  function exporterCsv() {
    const entete = ["Période", "Début", "Fin", "Clients", "Nouveaux", "Départs", "Équipe", "Chiffre d'affaires", "Ton salaire (coût)", "Équipe (coût)", "Pub", "IA", "Étranger", "Reste", "Ponctuel", "Bénéfice", "Impôt", "Levées et prêts", "Trésorerie fin", "Dans ta poche"];
    const ligne = (y: Periode, i: number) => [
      granularite === "exercice" ? `An ${y.n}` : granularite === "trimestre" ? `T${i + 1}` : libelleMois(moisDuJour(y.debut)),
      isoDuJour(y.debut), isoDuJour(y.fin), Math.round(y.clientsFin), Math.round(y.nouveaux.bao + y.nouveaux.demarchage + y.nouveaux.internet + y.nouveaux.pub),
      Math.round(y.departs), y.effectifFin, Math.round(y.ca), Math.round(y.charges.toi), Math.round(y.charges.equipe), Math.round(y.charges.pub),
      Math.round(y.charges.ia), Math.round(y.charges.international), Math.round(y.charges.reste), Math.round(y.charges.ponctuel),
      Math.round(y.resultat), Math.round(y.is), Math.round(y.apports), Math.round(y.tresorerieFin), Math.round(y.poche),
    ];
    const csv = [entete, ...lignes.map(ligne)].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = `projection-compyo-${sc.id}-${r.horizon}ans-${granularite}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  }

  const chiffres = [
    { t: `Dans ta poche en ${duree(r.horizon)}`, v: compact(p.totalPoche), d: "salaire net + dividendes nets", fort: true },
    { t: `Par mois, la ${r.horizon === 1 ? "1re" : `${r.horizon}e`} année`, v: eur(derniere.poche / 12), d: `salaire ${eur(derniere.salaireNet / 12)} · dividendes ${eur(derniere.dividendesNets / 12)}` },
    { t: `Chiffre d'affaires la ${r.horizon === 1 ? "1re" : "dernière"} année`, v: compact(derniere.ca), d: `bénéfice ${compact(derniere.resultat)}` },
    { t: `Clients en ${finLibelle}`, v: nb(derniere.clientsFin), d: derniere.etrangerFin >= 1 ? `dont ${nb(derniere.etrangerFin)} à l'étranger · équipe de ${derniere.effectifFin}` : derniere.effectifFin ? `équipe de ${derniere.effectifFin}` : "tu restes seul" },
    { t: "Premier mois rentable", v: p.premierJourRentable !== null ? moisAnnee(p.premierJourRentable) : "pas encore", d: `${eur(p.avance)} avancés avant la société` },
    { t: "Trésorerie au plus bas", v: compact(p.tresorerieMin), d: p.tresorerieMin < 0 ? `le ${dateCourte(p.jourTresorerieMin)}` : "jamais à découvert", alerte: p.tresorerieMin < 0 },
    { t: "Coût d'un client en pub", v: p.cacMoyen !== null ? eur(p.cacMoyen) : "—", d: `un client rapporte ≈ ${eur(p.ltv)} de marge sur sa vie` },
    { t: "Valeur de la société (ordre de grandeur)", v: `${compact(p.arrFin * 3)} – ${compact(p.arrFin * 6)}`, d: `3 à 6 × le chiffre d'affaires récurrent · ta part ${Math.round(p.partFinale * 100)} %` },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-5 sm:p-8">
      <header className="space-y-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-steel">Projection · nov. 2026 → {finLibelle}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Compyo sur {duree(r.horizon)}, jour par jour</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink/55">
            Clients, chiffre d&apos;affaires, bénéfice, trésorerie et ce qui arrive dans ta poche, du pire au meilleur cas. Tout est réglable plus bas ; ce sont des
            hypothèses, pas une promesse.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink/55">Durée</span>
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Durée de la projection">
            {HORIZONS.map((h) => (
              <button
                key={h}
                type="button"
                role="radio"
                aria-checked={reglages.horizon === h}
                onClick={() => maj((x) => ({ ...x, horizon: h }))}
                className={`min-h-11 rounded-lg px-3 text-sm transition-colors ${reglages.horizon === h ? "bg-ink text-paper" : "border border-ink/15 bg-surface hover:border-ink/40"}`}
              >
                {duree(h)}
              </button>
            ))}
          </div>
          <label className="ml-1 flex items-center gap-2 text-xs text-ink/55">
            ou
            <input
              type="number"
              min={1}
              max={HORIZON_MAX}
              value={reglages.horizon}
              onChange={(e) => maj((x) => ({ ...x, horizon: Math.max(1, Math.min(HORIZON_MAX, Math.round(Number(e.target.value) || 1))) }))}
              className={`${CHAMP} w-20`}
              aria-label="Durée en années"
            />
            ans
          </label>
        </div>
      </header>

      {/* L'alerte : la société manquerait d'argent */}
      {p.premierJourNegatif !== null && (
        <div role="alert" className="rounded-2xl border border-signal/40 bg-signal/[0.07] p-4">
          <p className="font-display text-base font-semibold">
            Scénario « {sc.label} » : la société n&apos;a plus d&apos;argent le {dateCourte(p.premierJourNegatif)}.
          </p>
          <p className="mt-1 text-sm text-ink/70">
            Au plus bas, il manque {eur(-p.tresorerieMin)} (le {dateCourte(p.jourTresorerieMin)}). En vrai, il faudrait trouver environ {eur(besoin)} avant : une levée de
            fonds, un prêt, moins de dépenses ou plus tard.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <BoutonPetit
              plein
              onClick={() =>
                maj((x) => ({
                  ...x,
                  ponctuels: [...x.ponctuels, { id: nouvelId(), libelle: "Prêt pour passer le creux", type: "pret", mois: Math.max(x.mois16, moisDuJour(p.premierJourNegatif as number) - 1), montant: besoin, repetition: 1, dilution: 0, taux: 5, duree: 60, effet: 0 }],
                }))
              }
            >
              Ajouter un prêt de {compact(besoin)}
            </BoutonPetit>
            <BoutonPetit
              onClick={() =>
                maj((x) => ({
                  ...x,
                  ponctuels: [...x.ponctuels, { id: nouvelId(), libelle: "Levée de fonds", type: "levee", mois: Math.max(x.mois16, moisDuJour(p.premierJourNegatif as number) - 1), montant: besoin, repetition: 1, dilution: 15, taux: 0, duree: 0, effet: 0 }],
                }))
              }
            >
              Ajouter une levée de {compact(besoin)} (15 %)
            </BoutonPetit>
          </div>
        </div>
      )}

      {/* Les quatre scénarios */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Scénario">
        {projections.map(({ sc: s, p: ps }) => {
          const actif = s.id === idScenario;
          const ajuste = Object.keys(reglages.ajustements[s.id] ?? {}).length > 0;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={actif}
              onClick={() => setIdScenario(s.id)}
              className={`min-h-12 rounded-2xl border p-4 text-left transition-colors ${actif ? "border-ink bg-surface shadow-sm ring-1 ring-ink" : "border-ink/10 bg-surface hover:border-ink/30"}`}
            >
              <span className="flex items-center gap-2 font-display text-sm font-semibold">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: COULEUR_SCENARIO[s.id] }} />
                {s.label}
                {ajuste && <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-normal text-ink/60">ajusté</span>}
                {ps.premierJourNegatif !== null && <span className="rounded-full bg-signal/15 px-2 py-0.5 text-[10px] font-normal text-signal-fonce dark:text-signal-clair">à court</span>}
              </span>
              <span className="mt-1 block text-xs leading-snug text-ink/55">{s.resume}</span>
              <span className="mt-3 flex items-end justify-between gap-2">
                <span>
                  <span className="block font-display text-xl font-semibold tabular-nums">{nb(ps.clients[ps.nbJours - 1])}</span>
                  <span className="block text-[11px] text-ink/50">clients en {finLibelle}</span>
                </span>
                <span className="text-right">
                  <span className="block font-display text-xl font-semibold tabular-nums">{compact(ps.totalPoche)}</span>
                  <span className="block text-[11px] text-ink/50">dans ta poche</span>
                </span>
              </span>
              <span className="mt-3 flex items-end justify-between gap-2 border-t border-ink/10 pt-3">
                <span>
                  <span className="block font-display text-base font-semibold tabular-nums">{compact(ps.caCumul[ps.nbJours - 1])}</span>
                  <span className="block text-[11px] text-ink/50">chiffre d&apos;affaires en {duree(r.horizon)}</span>
                </span>
                <span className="text-right">
                  <span className="block font-display text-base font-semibold tabular-nums">{compact(ps.resultatCumul[ps.nbJours - 1])}</span>
                  <span className="block text-[11px] text-ink/50">bénéfice en {duree(r.horizon)}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Chiffres clés du scénario choisi */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {chiffres.map((c) => (
          <Card key={c.t} className={`p-4 ${c.fort ? "border-signal/50 bg-signal/[0.06]" : ""} ${c.alerte ? "border-signal/40" : ""}`}>
            <p className="text-xs text-ink/55">{c.t}</p>
            <p className={`mt-1 font-display text-2xl font-semibold first-letter:uppercase ${c.alerte ? "text-signal-fonce dark:text-signal-clair" : ""}`}>{c.v}</p>
            <p className="mt-0.5 text-xs text-ink/45">{c.d}</p>
          </Card>
        ))}
      </div>

      {/* Les réglages */}
      <section aria-labelledby="titre-reglages" className="space-y-3">
        <div className="space-y-2">
          <div>
            <h2 id="titre-reglages" className="font-display text-lg font-semibold">Réglages</h2>
            <p className="text-xs text-ink/55">Ils s&apos;appliquent aux quatre scénarios, sauf le dernier bloc (le scénario choisi). Sauvegarde un jeu de réglages pour le retrouver.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={nomSauvegarde}
              onChange={(e) => setNomSauvegarde(e.target.value)}
              placeholder="Nom de la sauvegarde"
              aria-label="Nom de la sauvegarde"
              className={`${CHAMP} w-48`}
            />
            <BoutonPetit
              plein
              onClick={() => {
                const nom = nomSauvegarde.trim() || `Réglages du ${new Date().toLocaleDateString("fr-FR")}`;
                ecrireSauvegardes([...sauvegardes.filter((s) => s.nom !== nom), { id: nouvelId(), nom, scenario: idScenario, reglages, le: new Date().toISOString() }]);
                setNomSauvegarde("");
              }}
            >
              Sauvegarder
            </BoutonPetit>
            <BoutonPetit onClick={() => { setReglages(REGLAGES_DEFAUT); }}>Tout remettre par défaut</BoutonPetit>
          </div>
        </div>
        {sauvegardes.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {sauvegardes.map((s) => (
              <li key={s.id} className="flex items-center overflow-hidden rounded-lg border border-ink/15 bg-surface text-xs">
                <button type="button" onClick={() => { setReglages(relireReglages(s.reglages)); setIdScenario(s.scenario); }} className="min-h-10 px-3 hover:bg-ink/5">
                  {s.nom}
                </button>
                <button type="button" aria-label={`Supprimer ${s.nom}`} onClick={() => ecrireSauvegardes(sauvegardes.filter((x) => x.id !== s.id))} className="min-h-10 border-l border-ink/10 px-2.5 text-ink/50 hover:bg-ink/5 hover:text-ink">
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-3 lg:grid-cols-2">
          <PanneauOffre r={reglages} maj={maj} />
          <PanneauToi r={reglages} maj={maj} nbMois={nbMois} />
        </div>
        <PanneauEquipe r={reglages} maj={maj} nbMois={nbMois} />
        <PanneauPonctuels r={reglages} maj={maj} nbMois={nbMois} />
        <PanneauMonde r={reglages} maj={maj} p={p} jourEnMois={moisAnnee} />
        <div className="grid gap-3 lg:grid-cols-2">
          <PanneauRealisme r={reglages} maj={maj} />
          <PanneauLeviers r={reglages} maj={maj} />
        </div>
        <PanneauScenario r={reglages} maj={maj} sc={choisi.brut} />
      </section>

      <Bloc
        titre="Ce qui rapporte le plus"
        sousTitre={`Scénario « ${sc.label} » : ce que chaque levier ajoute dans ta poche en ${duree(r.horizon)} (la même projection avec et sans lui).`}
        droite={!voirApports ? <BoutonPetit plein onClick={() => setVoirApports(true)}>Calculer</BoutonPetit> : <BoutonPetit onClick={() => setVoirApports(false)}>Masquer</BoutonPetit>}
      >
        {!voirApports ? (
          <p className="text-sm text-ink/55">Seize projections de plus : calculées à la demande, pour que les réglages restent fluides.</p>
        ) : (
          <ul className="space-y-2.5">
            {apports.map((x) => (
              <li key={x.levier.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto]">
                <span className="min-w-0 text-sm">
                  {x.levier.label}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${x.actif ? "bg-succes/15 text-succes" : "bg-ink/5 text-ink/50"}`}>{x.actif ? "allumé" : "éteint"}</span>
                </span>
                <span className="order-3 col-span-2 h-3 overflow-hidden rounded-full bg-ink/5 sm:order-none sm:col-span-1">
                  <span className="block h-full rounded-full" style={{ width: `${Math.max(1, (Math.max(0, x.poche) / maxApport) * 100)}%`, background: x.actif ? "rgb(var(--c-signal))" : "rgb(var(--c-signal) / 0.4)" }} />
                </span>
                <span className="text-right text-sm tabular-nums">
                  <strong>{x.poche >= 0 ? "+" : ""}{compact(x.poche)}</strong>
                  <span className="block text-[11px] text-ink/50">{x.clients >= 0 ? "+" : ""}{nb(x.clients)} clients en {finLibelle}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Bloc>

      {/* Le zoom, commun à tous les graphiques */}
      <div className="sticky top-0 z-20 -mx-5 border-b border-ink/10 bg-paper/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium">
            Du {dateCourte(plageSure[0])} au {dateCourte(plageSure[1])}
            <span className="ml-2 text-xs font-normal text-ink/50">{nb(plageSure[1] - plageSure[0] + 1)} jours</span>
          </p>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Zoom">
            {ZOOMS.filter((z) => z.jours === Infinity || z.jours < fin).map((z) => (
              <button
                key={z.label}
                type="button"
                onClick={() => (z.jours === Infinity ? setPlage([0, fin]) : zoomSur(survol ?? (plageSure[0] + plageSure[1]) / 2, z.jours))}
                className={`min-h-11 rounded-lg px-3 text-xs transition-colors ${plageSure[1] - plageSure[0] === Math.min(z.jours, fin) ? "bg-ink text-paper" : "bg-surface text-ink/70 hover:bg-ink/5"}`}
              >
                {z.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2">
          <Navigateur valeurs={p.clients} couleur={couleur} plage={plageSure} total={N} onPlage={setPlage} />
        </div>
        <p className="mt-1.5 text-[11px] text-ink/45">Glisse un graphique pour te déplacer · double-clic ou Ctrl + molette pour zoomer · un clic choisit le jour détaillé plus bas</p>
      </div>

      <Bloc titre="Clients payants" sousTitre="Les quatre scénarios, entreprises abonnées ce jour-là (pendant la bêta : les testeurs). Les traits terracotta marquent les étapes du scénario choisi.">
        <Legende items={SCENARIOS.map((s) => ({ nom: s.label, couleur: COULEUR_SCENARIO[s.id] }))} />
        <GraphiqueTemps
          {...commun}
          titre="Clients payants selon les quatre scénarios"
          series={projections.map(({ sc: s, p: ps }) => ({ nom: s.label, couleur: COULEUR_SCENARIO[s.id], valeurs: ps.clients, epaisseur: s.id === idScenario ? 2.5 : 1.75, attenuee: s.id !== idScenario }))}
          format={(v) => `${nb(v)} clients`}
          formatAxe={nb}
          hauteur={260}
        />
      </Bloc>

      <Bloc
        titre="La trésorerie de la société"
        sousTitre={`Scénario « ${sc.label} ». L'argent sur le compte de la société chaque jour : sous la ligne zéro, elle ne peut plus payer. Les levées et les prêts la remplissent ; les dividendes, l'impôt et les gros coûts la vident.`}
      >
        <Legende items={[{ nom: "Trésorerie", couleur, aire: true }]} />
        <GraphiqueTemps
          {...commun}
          titre="Trésorerie de la société"
          series={[{ nom: "Trésorerie", couleur, valeurs: p.tresorerie, forme: "aire", epaisseur: 2 }]}
          format={eur}
          formatAxe={(v) => compact(v)}
          hauteur={220}
        />
      </Bloc>

      <Bloc titre="L'argent, cumulé depuis le début" sousTitre={`Scénario « ${sc.label} ». Ce qui est entré dans la société, ce qu'elle a gagné, et ce qui est arrivé dans ta poche (salaire chaque fin de mois, dividendes chaque fin d'exercice).`}>
        <Legende items={[
          { nom: "Chiffre d'affaires cumulé", couleur: "rgb(var(--c-ink) / 0.35)" },
          { nom: "Bénéfice cumulé (avant impôt)", couleur: "rgb(var(--c-steel))" },
          { nom: "Dans ta poche", couleur: "rgb(var(--c-signal))", aire: true },
        ]} />
        <GraphiqueTemps
          {...commun}
          titre="Chiffre d'affaires, bénéfice et poche cumulés"
          series={[
            { nom: "Chiffre d'affaires cumulé", couleur: "rgb(var(--c-ink) / 0.35)", valeurs: p.caCumul },
            { nom: "Bénéfice cumulé", couleur: "rgb(var(--c-steel))", valeurs: p.resultatCumul },
            { nom: "Dans ta poche", couleur: "rgb(var(--c-signal))", valeurs: p.pocheCumul, forme: "aire", epaisseur: 2.5 },
          ]}
          format={eur}
          formatAxe={(v) => compact(v)}
          hauteur={260}
        />
      </Bloc>

      {marchesVus.length > 1 && (
        <Bloc titre="Clients par pays" sousTitre={`Scénario « ${sc.label} ». Les marchés ouverts, empilés.`}>
          <Legende items={marchesVus.map(({ mk, couleur: c }) => ({ nom: mk.nom, couleur: c, aire: true }))} />
          <GraphiqueTemps
            {...commun}
            titre="Clients par marché"
            series={marchesVus.map(({ mk, couleur: c }) => ({ nom: mk.nom, couleur: c, valeurs: p.parMarche[mk.id], forme: "pile" as const }))}
            format={(v) => `${nb(v)} clients`}
            formatAxe={nb}
            hauteur={240}
          />
        </Bloc>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloc titre="Chaque jour : ce qui rentre et ce qui sort" sousTitre="Chiffre d'affaires du jour (abonnements ramenés au jour) et toutes les charges du jour. Un pic : une dépense ou une recette ponctuelle.">
          <Legende items={[{ nom: "Rentre", couleur, aire: true }, { nom: "Sort", couleur: "rgb(var(--c-ink) / 0.6)" }]} />
          <GraphiqueTemps
            {...commun}
            titre="Chiffre d'affaires et charges par jour"
            series={[
              { nom: "Rentre", couleur, valeurs: p.ca, forme: "aire" },
              { nom: "Sort", couleur: "rgb(var(--c-ink) / 0.6)", valeurs: p.charges },
            ]}
            format={eur}
            formatAxe={(v) => compact(v)}
          />
        </Bloc>
        <Bloc titre="Nouveaux clients par jour" sousTitre="D'où ils viennent, en moyenne ce jour-là.">
          <Legende items={[
            { nom: "Bouche-à-oreille", couleur: COULEURS_CANAUX.bao, aire: true },
            { nom: "Démarchage, partenaires, commerciaux", couleur: COULEURS_CANAUX.demarchage, aire: true },
            { nom: "Google et réseaux", couleur: COULEURS_CANAUX.internet, aire: true },
            { nom: "Publicité", couleur: COULEURS_CANAUX.pub, aire: true },
          ]} />
          <GraphiqueTemps
            {...commun}
            titre="Nouveaux clients par jour et par canal"
            series={[
              { nom: "Bouche-à-oreille", couleur: COULEURS_CANAUX.bao, valeurs: p.nouveaux.bao, forme: "pile" },
              { nom: "Démarchage", couleur: COULEURS_CANAUX.demarchage, valeurs: p.nouveaux.demarchage, forme: "pile" },
              { nom: "Google et réseaux", couleur: COULEURS_CANAUX.internet, valeurs: p.nouveaux.internet, forme: "pile" },
              { nom: "Publicité", couleur: COULEURS_CANAUX.pub, valeurs: p.nouveaux.pub, forme: "pile" },
            ]}
            format={nb1}
          />
        </Bloc>
      </div>

      {/* Le jour choisi */}
      <Bloc
        titre={`Le ${dateLongue(j)}`}
        sousTitre={`Scénario « ${sc.label} ». Choisis un jour ici ou d'un clic sur un graphique.`}
        droite={
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="jour" className="sr-only">Choisir un jour</label>
            <input
              id="jour"
              type="date"
              min={isoDuJour(0)}
              max={isoDuJour(fin)}
              value={isoDuJour(j)}
              onChange={(e) => {
                const t = Date.parse(`${e.target.value}T00:00:00Z`);
                if (!Number.isNaN(t)) choisir(Math.round((t - dateDuJour(0).getTime()) / 86400000));
              }}
              className="min-h-11 rounded-xl border border-ink/15 bg-paper px-3 text-sm"
            />
            <button type="button" onClick={() => zoomSur(j, 30)} className="min-h-11 rounded-xl bg-ink px-3 text-sm text-paper">
              Zoomer sur ce jour
            </button>
          </div>
        }
      >
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Clients", nb(p.clients[j])],
            ["Nouveaux ce jour", nb1(p.nouveaux.bao[j] + p.nouveaux.demarchage[j] + p.nouveaux.internet[j] + p.nouveaux.pub[j])],
            ["Rentre ce jour", eur(p.ca[j])],
            ["Sort ce jour", eur(p.charges[j])],
            ["Bénéfice du jour", eur(p.resultat[j])],
            ["Dans la société", eur(p.tresorerie[j])],
            ["Chiffre d'affaires depuis le début", eur(p.caCumul[j])],
            ["Dans ta poche depuis le début", eur(p.pocheCumul[j])],
          ].map(([t, v]) => (
            <div key={t} className="rounded-xl bg-ink/[0.03] p-3">
              <dt className="text-xs text-ink/55">{t}</dt>
              <dd className="mt-0.5 font-display text-lg font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-ink/50">
          Équipe ce jour-là : {p.effectif[j] ? `${p.effectif[j]} salarié${p.effectif[j] > 1 ? "s" : ""}` : "toi seul"}
          {p.etranger[j] >= 1 ? ` · ${nb(p.etranger[j])} clients à l'étranger` : ""}
        </p>
      </Bloc>

      <Bloc titre="Les grandes étapes" sousTitre={`Scénario « ${sc.label} ». Un appui zoome sur l'étape.`}>
        <ol className="flex flex-wrap gap-2">
          {p.evenements.map((e) => (
            <li key={`${e.jour}-${e.texte}`}>
              <button
                type="button"
                onClick={() => { zoomSur(e.jour, Math.min(120, fin)); choisir(e.jour); }}
                className={`min-h-11 rounded-full border px-3 text-left text-xs hover:border-signal/50 ${e.type === "alerte" ? "border-signal/50 bg-signal/10" : "border-ink/10 bg-surface"}`}
              >
                <span className="font-semibold">{dateCourte(e.jour)}</span> · {e.texte}
              </button>
            </li>
          ))}
        </ol>
      </Bloc>

      <Bloc
        titre="Période par période : où va l'argent"
        sousTitre="Exercices de novembre à octobre. Les flux s'additionnent ; clients, équipe et trésorerie sont ceux de la fin de la période."
        droite={
          <div className="flex flex-wrap gap-1">
            {(["mois", "trimestre", "exercice"] as Granularite[]).map((g) => (
              <button key={g} type="button" onClick={() => setGranularite(g)} className={`min-h-10 rounded-lg px-3 text-xs ${granularite === g ? "bg-ink text-paper" : "border border-ink/15 bg-surface"}`}>
                {g === "mois" ? "Par mois" : g === "trimestre" ? "Par trimestre" : "Par exercice"}
              </button>
            ))}
            <BoutonPetit onClick={exporterCsv}>Exporter (CSV)</BoutonPetit>
          </div>
        }
      >
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full text-right text-sm tabular-nums">
            <thead className="sticky top-0 bg-surface">
              <tr className="text-xs text-ink/55">
                {["Période", "Clients", "Nouveaux", "Départs", "Équipe", "Rentre", "Ton salaire (coût)", "Équipe (coût)", "Pub et acquisition", "IA et hébergement", "Étranger", "Le reste", "Ponctuel", "Bénéfice", "Impôt", "Levées et prêts", "Trésorerie", "Dans ta poche", "Par mois"].map((h, i) => (
                  <th key={h} scope="col" className={`whitespace-nowrap px-2 pb-2 font-medium ${i === 0 ? "text-left" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes.map((y, i) => {
                const nbMoisPeriode = granularite === "exercice" ? 12 : granularite === "trimestre" ? 3 : 1;
                const titre = granularite === "exercice"
                  ? `An ${y.n} · ${dateDuJour(y.debut).getUTCFullYear()}-${String(dateDuJour(y.fin).getUTCFullYear()).slice(2)}`
                  : granularite === "trimestre"
                    ? `T${i + 1} · ${libelleMois(moisDuJour(y.debut))}`
                    : libelleMois(moisDuJour(y.debut));
                return (
                  <tr key={`${granularite}-${y.debut}`} className="border-t border-ink/10 hover:bg-signal/[0.04]">
                    <td className="whitespace-nowrap px-2 py-2 text-left">
                      <button type="button" onClick={() => setPlage(bornerPlage([y.debut, y.fin], N))} className="min-h-10 underline decoration-ink/20 underline-offset-4 hover:decoration-signal">
                        {titre}
                      </button>
                    </td>
                    <td className="px-2">{nb(y.clientsFin)}</td>
                    <td className="px-2">{nb(y.nouveaux.bao + y.nouveaux.demarchage + y.nouveaux.internet + y.nouveaux.pub)}</td>
                    <td className="px-2">{nb(y.departs)}</td>
                    <td className="px-2">{y.effectifFin || "—"}</td>
                    <td className="whitespace-nowrap px-2">{compact(y.ca)}</td>
                    <td className="whitespace-nowrap px-2">{compact(y.charges.toi)}</td>
                    <td className="whitespace-nowrap px-2">{compact(y.charges.equipe)}</td>
                    <td className="whitespace-nowrap px-2">{compact(y.charges.pub)}</td>
                    <td className="whitespace-nowrap px-2">{compact(y.charges.ia)}</td>
                    <td className="whitespace-nowrap px-2">{compact(y.charges.international)}</td>
                    <td className="whitespace-nowrap px-2">{compact(y.charges.reste)}</td>
                    <td className="whitespace-nowrap px-2">{y.charges.ponctuel ? compact(y.charges.ponctuel) : "—"}</td>
                    <td className={`whitespace-nowrap px-2 ${y.resultat < 0 ? "text-signal-fonce dark:text-signal-clair" : ""}`}>{compact(y.resultat)}</td>
                    <td className="whitespace-nowrap px-2">{y.is ? compact(y.is) : "—"}</td>
                    <td className="whitespace-nowrap px-2">{y.apports ? compact(y.apports) : "—"}</td>
                    <td className={`whitespace-nowrap px-2 ${y.tresorerieFin < 0 ? "text-signal-fonce dark:text-signal-clair" : ""}`}>{compact(y.tresorerieFin)}</td>
                    <td className="whitespace-nowrap px-2 font-semibold">{compact(y.poche)}</td>
                    <td className="whitespace-nowrap px-2">{eur(y.poche / nbMoisPeriode)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Bloc>

      <div className="grid gap-5 md:grid-cols-2">
        <Bloc titre="Les hypothèses">
          <ul className="list-disc space-y-1.5 pl-4 text-sm text-ink/65">
            <li>La bêta, gratuite, dès le premier mois : ton démarchage (une fois et demie plus facile qu&apos;en payant), le bouche-à-oreille et un début de Google. À la création de la SASU ({libelleMois(r.mois16)}), {r.conversionBeta} % des testeurs encore actifs passent à {r.prixTesteurs} €/mois à vie.</li>
            <li>Bouche-à-oreille : chaque mois, une part des clients fait venir un collègue. Ton démarchage double dès que les premiers clients restent (entre 20 et 150 clients), puis passe au niveau « plein temps » à tes 18 ans ({libelleMois(r.mois18)}).</li>
            <li>Effet boule de neige : plus il y a de clients, mieux chaque démarchage, chaque recherche et chaque publicité convertit (jusqu&apos;à +60 % vers 500 clients).</li>
            <li>Plafond : la part de marché que le scénario peut tenir en France ({nb(sc.capFrance)} entreprises sur 440 000) ; plus on s&apos;en approche, plus chaque client coûte d&apos;efforts. À l&apos;étranger, la même part multipliée par la « part tenable » du marché.</li>
            <li>Équipe automatique (coût employeur/mois) : support 3 300 €, développeur 5 100 €, commercial et marketing 4 350 €, administratif 3 650 €, plus outils, recrutement (3 000 €) et bureaux dès 5 personnes. Tes recrutements : net × {r.coefEmployeur.toLocaleString("fr-FR")}, plus 150 € d&apos;outils.</li>
            <li>Ton salaire coûte {r.coefDirigeant.toLocaleString("fr-FR")} fois le net à la société. Impôt sur les sociétés 15 % jusqu&apos;à 42 500 € puis 25 % ; {r.flatTax} % prélevés sur les dividendes ; {r.reserveMois} mois de charges gardés en réserve, {r.reinvest} % du reste réinvestis.</li>
            <li>Un prêt se rembourse par mensualités constantes (seuls les intérêts sont une charge) ; une levée remplit la caisse et réduit ta part des dividendes.</li>
          </ul>
        </Bloc>
        <Bloc titre="Ce que ça ne dit pas">
          <ul className="list-disc space-y-1.5 pl-4 text-sm text-ink/65">
            <li>Les effets des leviers et des chocs sont des ordres de grandeur, pas des mesures : les 10 premiers artisans donneront les vrais.</li>
            <li>Les tailles de marché à l&apos;étranger, les coûts de lancement et les prix locaux sont à vérifier pays par pays (TVA, facture électronique, langue, droit du travail).</li>
            <li>Une société à court d&apos;argent ne continue pas comme si de rien n&apos;était : la projection continue pour montrer l&apos;écart, la réalité s&apos;arrête.</li>
            <li>La valeur de la société est un ordre de grandeur (3 à 6 fois le chiffre d&apos;affaires récurrent pour un logiciel qui grandit), pas une offre.</li>
            <li>Jusqu&apos;à tes 18 ans, la loi confie la gestion de ton argent à tes parents.</li>
            <li>Les réglages et les sauvegardes restent dans ce navigateur ; rien n&apos;est enregistré dans Compyo.</li>
          </ul>
        </Bloc>
      </div>
    </div>
  );
}
