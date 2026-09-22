import type { Part } from "@/lib/statistiques/calculerStatistiques";

// ============================================================
// Graphiques de /admin/statistiques (22/09) — en HTML/CSS, rendus côté
// serveur, sans bibliothèque : mêmes raisons que le bilan des artisans
// (components/dashboard/GraphiqueActivite.tsx). Les textes gardent leur
// vraie taille sur téléphone, et rien n'est envoyé au navigateur.
//
// Chaque graphique a son équivalent en texte (tableau ou liste) pour les
// lecteurs d'écran.
// ============================================================

// Couleurs des parts : des tokens seulement (le mode sombre suit), du plus
// marqué au plus discret.
const TEINTES = [
  "rgb(var(--c-signal))",
  "rgb(var(--c-ink) / 0.8)",
  "rgb(var(--c-steel))",
  "rgb(var(--c-signal-clair))",
  "rgb(var(--c-ink) / 0.35)",
  "rgb(var(--c-signal-fonce))",
  "rgb(var(--c-ink) / 0.15)",
];

function pourcent(valeur: number, total: number): string {
  if (total === 0) return "0 %";
  const p = (valeur / total) * 100;
  return `${p < 1 && p > 0 ? "< 1" : Math.round(p)} %`;
}

/** Le « camembert » : un anneau en CSS (conic-gradient), sa légende à côté. */
export function Anneau({ parts, titre }: { parts: Part[]; titre: string }) {
  const total = parts.reduce((s, p) => s + p.valeur, 0);
  if (total === 0) return <p className="text-sm text-ink/45">Pas encore de données.</p>;

  let cumul = 0;
  const segments = parts.map((p, i) => {
    const debut = (cumul / total) * 360;
    cumul += p.valeur;
    const fin = (cumul / total) * 360;
    return `${TEINTES[i % TEINTES.length]} ${debut}deg ${fin}deg`;
  });

  return (
    <figure className="flex flex-wrap items-center gap-6">
      <div
        role="img"
        aria-label={`${titre} : ${parts.map((p) => `${p.nom} ${pourcent(p.valeur, total)}`).join(", ")}`}
        className="relative h-32 w-32 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${segments.join(", ")})` }}
      >
        <div className="absolute inset-[22%] grid place-items-center rounded-full bg-surface">
          <span className="font-display text-lg font-semibold tabular-nums">{total}</span>
        </div>
      </div>
      <ul className="min-w-[10rem] flex-1 space-y-1.5 text-sm">
        {parts.map((p, i) => (
          <li key={p.nom} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: TEINTES[i % TEINTES.length] }} />
              <span className="truncate">{p.nom}</span>
            </span>
            <span className="shrink-0 tabular-nums text-ink/60">
              {pourcent(p.valeur, total)} <span className="text-ink/35">({p.valeur})</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Une liste classée, chaque ligne avec sa barre proportionnelle. */
export function ListeBarres({ parts, unite, vide = "Pas encore de données." }: { parts: Part[]; unite?: string; vide?: string }) {
  if (parts.length === 0) return <p className="text-sm text-ink/45">{vide}</p>;
  const max = Math.max(...parts.map((p) => p.valeur));
  return (
    <ul className="space-y-2.5">
      {parts.map((p) => (
        <li key={p.nom}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{p.nom}</span>
            <span className="shrink-0 tabular-nums text-ink/60">
              {p.valeur}
              {unite ? ` ${unite}` : ""}
            </span>
          </div>
          <div aria-hidden className="mt-1 h-1.5 rounded-full bg-ink/5">
            <div className="h-full rounded-full bg-ink/60" style={{ width: `${(p.valeur / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Visiteurs jour par jour. */
export function BarresJours({ jours, jourActuel }: { jours: { jour: number; visiteurs: number }[]; jourActuel: number | null }) {
  const max = Math.max(1, ...jours.map((j) => j.visiteurs));
  const total = jours.reduce((s, j) => s + j.visiteurs, 0);
  return (
    <figure>
      <div className="flex h-36 items-end gap-[3px]" role="img" aria-label={`${total} visites sur le mois, jour par jour`}>
        {jours.map((j) => {
          const futur = jourActuel !== null && j.jour > jourActuel;
          return (
            <div key={j.jour} className="group relative flex h-full flex-1 items-end" title={`${j.jour} : ${j.visiteurs} visite${j.visiteurs > 1 ? "s" : ""}`}>
              <div
                className={`w-full rounded-t-[3px] ${futur ? "bg-ink/5" : j.jour === jourActuel ? "bg-signal" : "bg-ink/60"}`}
                style={{ height: futur ? "3%" : `${j.visiteurs === 0 ? 1.5 : Math.max(4, (j.visiteurs / max) * 100)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div aria-hidden className="mt-1.5 flex justify-between font-mono text-[10px] text-steel">
        <span>1</span>
        <span>{Math.ceil(jours.length / 2)}</span>
        <span>{jours.length}</span>
      </div>
      <figcaption className="mt-2 text-xs text-ink/50">
        Le plus haut : {max} visite{max > 1 ? "s" : ""} dans la journée.
      </figcaption>
    </figure>
  );
}

/** Le parcours, étape par étape : où les gens décrochent. */
export function Entonnoir({ etapes }: { etapes: Part[] }) {
  const premier = Math.max(1, etapes[0]?.valeur ?? 1);
  return (
    // Deux lignes par étape (libellé et chiffre, puis la barre sur toute la
    // largeur) : sur une seule ligne, un téléphone ne laissait que quelques
    // pixels à la barre.
    <ol className="space-y-3">
      {etapes.map((e, i) => {
        const precedente = i > 0 ? etapes[i - 1].valeur : null;
        const passage = precedente ? Math.round((e.valeur / precedente) * 100) : null;
        return (
          <li key={e.nom} className="text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-ink/75">{e.nom}</span>
              <span className="shrink-0 tabular-nums">
                <span className="font-medium">{e.valeur}</span>
                {passage !== null && <span className="ml-1.5 text-xs text-ink/45">({passage} %)</span>}
              </span>
            </div>
            <div aria-hidden className="mt-1 h-2.5 rounded-full bg-ink/5">
              <div
                className={`h-full rounded-full ${i === 0 ? "bg-ink/70" : "bg-signal/70"}`}
                style={{ width: `${Math.max(e.valeur > 0 ? 2 : 0, (e.valeur / premier) * 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
