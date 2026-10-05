"use client";

import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import {
  LEVIERS, NB_JOURS, REGLAGES_DEFAUT, SCENARIOS, apportDesLeviers, dateDuJour, projeter,
  type IdLevier, type IdScenario, type Reglages,
} from "@/lib/projection/moteur";
import { GraphiqueTemps, Navigateur, bornerPlage, type Plage } from "./GraphiqueTemps";

// ============================================================
// /admin/projection (05/10) — Compyo sur 10 ans, jour par jour.
//
// Quatre scénarios du pire au meilleur, des réglages, des leviers
// (fonctionnalités et techniques) qu'on allume pour voir ce qu'ils
// changent, et des graphiques qui partagent le même zoom : de 10 ans à
// une semaine, chaque jour se lit au survol. Rien n'est enregistré en
// base : les réglages restent dans ce navigateur (localStorage).
// ============================================================

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

const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const eur = (v: number) => `${fmt.format(Math.round(v))} €`;
const nb = (v: number) => fmt.format(Math.round(v));
const nb1 = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: v < 10 ? 1 : 0 });
function compact(v: number, suffixe = "€") {
  const a = Math.abs(v), s = v < 0 ? "−" : "";
  if (a >= 1e6) return `${s}${(a / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M${suffixe}`;
  if (a >= 1e4) return `${s}${Math.round(a / 1e3).toLocaleString("fr-FR")} k${suffixe}`;
  if (a >= 1e3) return `${s}${(a / 1e3).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k${suffixe}`;
  return `${s}${Math.round(a)} ${suffixe}`.trim();
}
const dateLongue = (j: number) =>
  dateDuJour(j).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const dateCourte = (j: number) => dateDuJour(j).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const isoDuJour = (j: number) => dateDuJour(j).toISOString().slice(0, 10);

const ZOOMS: { label: string; jours: number }[] = [
  { label: "10 ans", jours: NB_JOURS - 1 },
  { label: "5 ans", jours: 1826 },
  { label: "1 an", jours: 365 },
  { label: "3 mois", jours: 91 },
  { label: "1 mois", jours: 30 },
  { label: "1 semaine", jours: 7 },
];

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

function Curseur({ id, label, valeur, min, max, pas, suffixe, onChange }: {
  id: string; label: string; valeur: number; min: number; max: number; pas: number; suffixe: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex justify-between gap-2 text-xs text-ink/60">
        {label}
        <output htmlFor={id} className="font-semibold tabular-nums text-ink">{valeur}{suffixe}</output>
      </label>
      <input id={id} type="range" min={min} max={max} step={pas} value={valeur} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 h-8 w-full accent-signal" />
    </div>
  );
}

function Interrupteur({ id, label, detail, actif, onChange }: { id: string; label: string; detail?: string; actif: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-ink/[0.03]">
      <input id={id} type="checkbox" checked={actif} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-signal" />
      <span className="min-w-0">
        <span className="block text-sm">{label}</span>
        {detail && <span className="block text-xs text-ink/50">{detail}</span>}
      </span>
    </label>
  );
}

export function VueProjection() {
  const [idScenario, setIdScenario] = useState<IdScenario>("prudent");
  const [reglages, setReglages] = useState<Reglages>(REGLAGES_DEFAUT);
  const [plage, setPlage] = useState<Plage>([0, NB_JOURS - 1]);
  const [survol, setSurvol] = useState<number | null>(null);
  const [jourChoisi, setJourChoisi] = useState<number>(365);

  // Réglages gardés dans ce navigateur seulement.
  useEffect(() => {
    try {
      const memo = JSON.parse(localStorage.getItem("compyo-admin-projection") || "null");
      if (memo?.reglages) setReglages({ ...REGLAGES_DEFAUT, ...memo.reglages, leviers: { ...REGLAGES_DEFAUT.leviers, ...memo.reglages.leviers } });
      if (memo?.scenario) setIdScenario(memo.scenario);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("compyo-admin-projection", JSON.stringify({ reglages, scenario: idScenario }));
    } catch {}
  }, [reglages, idScenario]);

  const r = useDeferredValue(reglages);
  const projections = useMemo(() => SCENARIOS.map((sc) => ({ sc, p: projeter(sc, r) })), [r]);
  const choisi = projections.find((x) => x.sc.id === idScenario)!;
  const sc = choisi.sc, p = choisi.p;
  const apports = useMemo(() => apportDesLeviers(sc, r), [sc, r]);
  const fin = NB_JOURS - 1;
  const derniere = p.annees[p.annees.length - 1];
  const couleur = COULEUR_SCENARIO[sc.id];
  const reperes = p.evenements.map((e) => ({ jour: e.jour, texte: `${dateCourte(e.jour)} : ${e.texte}` }));
  const regler = <K extends keyof Reglages>(k: K, v: Reglages[K]) => setReglages((x) => ({ ...x, [k]: v }));
  const reglerLevier = (id: IdLevier, v: boolean) => setReglages((x) => ({ ...x, leviers: { ...x.leviers, [id]: v } }));
  const zoomSur = (j: number, jours: number) => setPlage(bornerPlage([j - jours / 2, j + jours / 2], NB_JOURS));
  const choisir = (j: number) => setJourChoisi(Math.max(0, Math.min(fin, j)));
  const commun = { plage, total: NB_JOURS, onPlage: setPlage, survol, onSurvol: setSurvol, onChoisir: choisir, reperes };
  const maxApport = Math.max(1, ...apports.map((x) => Math.abs(x.poche)));
  const j = jourChoisi;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-5 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-steel">Projection · nov. 2026 → oct. 2036</p>
          <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Compyo sur 10 ans, jour par jour</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink/55">
            Clients, chiffre d&apos;affaires, bénéfice et ce qui arrive dans ta poche, du pire au meilleur cas. Ce sont des
            hypothèses réglables, pas une promesse : elles sont toutes écrites en bas de la page.
          </p>
        </div>
      </header>

      {/* Les quatre scénarios */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Scénario">
        {projections.map(({ sc: s, p: ps }) => {
          const actif = s.id === idScenario;
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
              </span>
              <span className="mt-1 block text-xs leading-snug text-ink/55">{s.resume}</span>
              <span className="mt-3 flex items-end justify-between gap-2">
                <span>
                  <span className="block font-display text-xl font-semibold tabular-nums">{nb(ps.clients[fin])}</span>
                  <span className="block text-[11px] text-ink/50">clients en 2036</span>
                </span>
                <span className="text-right">
                  <span className="block font-display text-xl font-semibold tabular-nums">{compact(ps.totalPoche)}</span>
                  <span className="block text-[11px] text-ink/50">dans ta poche</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Chiffres clés du scénario choisi */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { t: "Dans ta poche en 10 ans", v: compact(p.totalPoche), d: "salaire net + dividendes nets", fort: true },
          { t: "Par mois, la 10e année", v: eur(derniere.poche / 12), d: `salaire ${eur(derniere.salaireNet / 12)} · dividendes ${eur(derniere.dividendesNets / 12)}` },
          { t: "Chiffre d'affaires la 10e année", v: compact(derniere.ca), d: `bénéfice ${compact(derniere.resultat)}` },
          { t: "Clients en oct. 2036", v: nb(derniere.clientsFin), d: derniere.etrangerFin >= 1 ? `dont ${nb(derniere.etrangerFin)} à l'étranger · équipe de ${derniere.effectifFin}` : derniere.effectifFin ? `équipe de ${derniere.effectifFin}` : "tu restes seul" },
          { t: "Premier mois rentable", v: p.premierJourRentable !== null ? dateDuJour(p.premierJourRentable).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }) : "jamais", d: `${eur(p.avance)} avancés avant le lancement` },
        ].map((c) => (
          <Card key={c.t} className={`p-4 ${c.fort ? "border-signal/50 bg-signal/[0.06]" : ""}`}>
            <p className="text-xs text-ink/55">{c.t}</p>
            <p className="mt-1 font-display text-2xl font-semibold capitalize">{c.v}</p>
            <p className="mt-0.5 text-xs text-ink/45">{c.d}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Bloc titre="Réglages" sousTitre="Ils s'appliquent aux quatre scénarios.">
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Curseur id="prix" label="Prix par entreprise et par mois" valeur={reglages.prix} min={19} max={49} pas={1} suffixe=" € HT" onChange={(v) => regler("prix", v)} />
            <Curseur id="mois16" label="Tes 16 ans (lancement payant) dans" valeur={reglages.mois16} min={0} max={24} pas={1} suffixe=" mois" onChange={(v) => regler("mois16", v)} />
            <Curseur id="reinvest" label="Bénéfice laissé dans la société" valeur={reglages.reinvest} min={0} max={80} pas={5} suffixe=" %" onChange={(v) => regler("reinvest", v)} />
            <Curseur id="baisseIA" label="Baisse du prix de l'IA par an" valeur={reglages.baisseIA} min={0} max={30} pas={5} suffixe=" %" onChange={(v) => regler("baisseIA", v)} />
          </div>
          <div className="mt-2 grid sm:grid-cols-3">
            <Interrupteur id="embauches" label="Embaucher" detail="quand Compyo grandit" actif={reglages.embauches} onChange={(v) => regler("embauches", v)} />
            <Interrupteur id="international" label="Étranger" detail="quand c'est possible" actif={reglages.international} onChange={(v) => regler("international", v)} />
            <Interrupteur id="pleinTemps" label="Plein temps à 18 ans" detail="avec un salaire" actif={reglages.pleinTemps} onChange={(v) => regler("pleinTemps", v)} />
          </div>
        </Bloc>

        <Bloc titre="Fonctionnalités et techniques" sousTitre="Allume un levier pour voir ce qu'il change. L'effet supposé est écrit sous chacun.">
          <div className="grid sm:grid-cols-2">
            {LEVIERS.map((l) => (
              <Interrupteur key={l.id} id={`levier-${l.id}`} label={l.label} detail={`${l.type === "fonctionnalité" ? "À construire" : "Technique"} · ${l.effet}`} actif={reglages.leviers[l.id]} onChange={(v) => reglerLevier(l.id, v)} />
            ))}
          </div>
        </Bloc>
      </div>

      <Bloc titre="Ce qui rapporte le plus" sousTitre={`Scénario « ${sc.label} » : ce que chaque levier ajoute dans ta poche sur 10 ans (la même projection avec et sans lui).`}>
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
                <strong>+{compact(x.poche)}</strong>
                <span className="block text-[11px] text-ink/50">+{nb(x.clients)} clients en 2036</span>
              </span>
            </li>
          ))}
        </ul>
      </Bloc>

      {/* Le zoom, commun à tous les graphiques */}
      <div className="sticky top-0 z-20 -mx-5 border-b border-ink/10 bg-paper/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium">
            Du {dateCourte(plage[0])} au {dateCourte(plage[1])}
            <span className="ml-2 text-xs font-normal text-ink/50">{nb(plage[1] - plage[0] + 1)} jours</span>
          </p>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Zoom">
            {ZOOMS.map((z) => (
              <button
                key={z.label}
                type="button"
                onClick={() => (z.jours >= NB_JOURS - 1 ? setPlage([0, NB_JOURS - 1]) : zoomSur(survol ?? (plage[0] + plage[1]) / 2, z.jours))}
                className={`min-h-11 rounded-lg px-3 text-xs transition-colors ${plage[1] - plage[0] === Math.min(z.jours, NB_JOURS - 1) ? "bg-ink text-paper" : "bg-surface text-ink/70 hover:bg-ink/5"}`}
              >
                {z.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2">
          <Navigateur valeurs={p.clients} couleur={couleur} plage={plage} total={NB_JOURS} onPlage={setPlage} />
        </div>
        <p className="mt-1.5 text-[11px] text-ink/45">Glisse un graphique pour te déplacer · double-clic ou Ctrl + molette pour zoomer · un clic choisit le jour détaillé plus bas</p>
      </div>

      <Bloc titre="Clients payants" sousTitre="Les quatre scénarios, entreprises abonnées ce jour-là (France et étranger). Les traits terracotta marquent les événements du scénario choisi.">
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

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloc titre="Chaque jour : ce qui rentre et ce qui sort" sousTitre="Chiffre d'affaires du jour (abonnements ramenés au jour) et toutes les charges du jour.">
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
            { nom: "Démarchage et partenaires", couleur: COULEURS_CANAUX.demarchage, aire: true },
            { nom: "Google", couleur: COULEURS_CANAUX.internet, aire: true },
            { nom: "Publicité", couleur: COULEURS_CANAUX.pub, aire: true },
          ]} />
          <GraphiqueTemps
            {...commun}
            titre="Nouveaux clients par jour et par canal"
            series={[
              { nom: "Bouche-à-oreille", couleur: COULEURS_CANAUX.bao, valeurs: p.nouveaux.bao, forme: "pile" },
              { nom: "Démarchage et partenaires", couleur: COULEURS_CANAUX.demarchage, valeurs: p.nouveaux.demarchage, forme: "pile" },
              { nom: "Google", couleur: COULEURS_CANAUX.internet, valeurs: p.nouveaux.internet, forme: "pile" },
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
              <button type="button" onClick={() => { zoomSur(e.jour, 120); choisir(e.jour); }} className="min-h-11 rounded-full border border-ink/10 bg-surface px-3 text-left text-xs hover:border-signal/50">
                <span className="font-semibold">{dateCourte(e.jour)}</span> · {e.texte}
              </button>
            </li>
          ))}
        </ol>
      </Bloc>

      <Bloc titre="Année par année : où va l'argent" sousTitre="Exercices de novembre à octobre.">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm tabular-nums">
            <thead>
              <tr className="text-xs text-ink/55">
                {["Année", "Clients", "Équipe", "Rentre", "Ton salaire (coût)", "Équipe (coût)", "Pub et acquisition", "IA et hébergement", "Étranger", "Le reste", "Bénéfice", "Impôt", "Dans ta poche", "Par mois"].map((h, i) => (
                  <th key={h} scope="col" className={`whitespace-nowrap px-2 pb-2 font-medium ${i === 0 ? "text-left" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.annees.map((y) => (
                <tr key={y.n} className="border-t border-ink/10 hover:bg-signal/[0.04]">
                  <td className="whitespace-nowrap px-2 py-2 text-left">
                    <button type="button" onClick={() => setPlage(bornerPlage([y.debut, y.fin], NB_JOURS))} className="min-h-11 underline decoration-ink/20 underline-offset-4 hover:decoration-signal">
                      An {y.n} · {dateDuJour(y.debut).getUTCFullYear()}-{String(dateDuJour(y.fin).getUTCFullYear()).slice(2)}
                    </button>
                  </td>
                  <td className="px-2">{nb(y.clientsFin)}</td>
                  <td className="px-2">{y.effectifFin || "—"}</td>
                  <td className="whitespace-nowrap px-2">{compact(y.ca)}</td>
                  <td className="whitespace-nowrap px-2">{compact(y.charges.toi)}</td>
                  <td className="whitespace-nowrap px-2">{compact(y.charges.equipe)}</td>
                  <td className="whitespace-nowrap px-2">{compact(y.charges.pub)}</td>
                  <td className="whitespace-nowrap px-2">{compact(y.charges.ia)}</td>
                  <td className="whitespace-nowrap px-2">{compact(y.charges.international)}</td>
                  <td className="whitespace-nowrap px-2">{compact(y.charges.reste)}</td>
                  <td className={`whitespace-nowrap px-2 ${y.resultat < 0 ? "text-signal" : ""}`}>{compact(y.resultat)}</td>
                  <td className="whitespace-nowrap px-2">{compact(y.is)}</td>
                  <td className="whitespace-nowrap px-2 font-semibold">{compact(y.poche)}</td>
                  <td className="whitespace-nowrap px-2">{eur(y.poche / 12)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bloc>

      <div className="grid gap-5 md:grid-cols-2">
        <Bloc titre="Les hypothèses">
          <ul className="list-disc space-y-1.5 pl-4 text-sm text-ink/65">
            <li>Avant tes 16 ans : 10 testeurs gratuits ; à 16 ans, SASU (225 €), 7 testeurs restent à 19 € à vie.</li>
            <li>Bouche-à-oreille : 0,4 à 1,6 % des clients font venir un collègue chaque mois. Ton démarchage : 2 à 6 clients/mois pendant tes études, 3 à 12 à plein temps, et il double dès que les premiers clients restent (entre 20 et 150 clients).</li>
            <li>Google monte en 3 ans jusqu&apos;à 3 à 30 clients/mois. Publicité : 0 à 12 % du chiffre d&apos;affaires, 170 à 220 € par client au départ. Partenaires : 2 à 20 clients/mois, 60 € de commission.</li>
            <li>Départs : 1,6 à 4 % des clients par mois, en baisse quand le produit mûrit. Marché : au plus 10 % des 440 000 entreprises du bâtiment en France.</li>
            <li>Étranger : Belgique, Suisse, Luxembourg dès 1 500 clients en France (25 000 €) ; Espagne et Italie dès 5 000 clients (120 000 €), seulement si la société a de quoi payer.</li>
            <li>Équipe (coût employeur/mois) : support 3 300 €, développeur 5 100 €, commercial et marketing 4 350 €, administratif 3 650 €, plus outils, recrutement et bureaux.</li>
            <li>Ton salaire à partir de 18 ans : 1 500 à 6 000 € net/mois selon le chiffre d&apos;affaires (coût ×1,8). Impôt sur les sociétés 15 % puis 25 %, environ 30 % sur les dividendes.</li>
          </ul>
        </Bloc>
        <Bloc titre="Ce que ça ne dit pas">
          <ul className="list-disc space-y-1.5 pl-4 text-sm text-ink/65">
            <li>Les effets des leviers sont des ordres de grandeur, pas des mesures : les 10 premiers artisans donneront les vrais.</li>
            <li>Le prix ne monte jamais en 10 ans, les concurrents ne bougent pas, aucune levée de fonds.</li>
            <li>Les tailles de marché à l&apos;étranger sont à vérifier.</li>
            <li>Jusqu&apos;à tes 18 ans, la loi confie la gestion de ton argent à tes parents.</li>
            <li>Les réglages restent dans ce navigateur ; rien n&apos;est enregistré dans Compyo.</li>
          </ul>
        </Bloc>
      </div>
    </div>
  );
}
