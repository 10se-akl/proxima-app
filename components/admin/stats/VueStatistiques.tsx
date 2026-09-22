import Link from "next/link";
import type { ReactNode } from "react";
import { evolution } from "@/lib/activite";
import { cle, decaler, libelle, nomMois } from "@/lib/moisParis";
import type { Part, Statistiques } from "@/lib/statistiques/calculerStatistiques";
import { Card } from "@/components/ui/Card";
import { Anneau, BarresJours, Entonnoir, ListeBarres } from "./Graphiques";
import { InterrupteurAppareil, InterrupteurExclusion } from "./Interrupteurs";

// ============================================================
// /admin/statistiques — l'affichage (22/09). Les données viennent de
// lib/statistiques/calculerStatistiques.ts ; séparé pour pouvoir être
// vérifié avec des données d'exemple, sans session ni base.
//
// Deux questions, dans cet ordre : qui vient sur le site, et que font les
// artisans dans l'app. Le parcours entre les deux (l'entonnoir) dit où ils
// décrochent — c'est le graphique qui dit quoi améliorer en premier.
// ============================================================

function nomPays(code: string): string {
  try {
    return new Intl.DisplayNames(["fr"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function Evolution({ actuel, precedent, reference }: { actuel: number; precedent: number; reference: string }) {
  const e = evolution(actuel, precedent);
  if (e.sens === "aucun") return null;
  if (e.sens === "nouveau") return <p className="mt-1 text-xs text-ink/45">Rien sur {reference}</p>;
  if (e.sens === "stable") return <p className="mt-1 text-xs text-ink/45">Comme {reference}</p>;
  const hausse = e.sens === "hausse";
  return (
    <p className={`mt-1 text-xs ${hausse ? "text-succes" : "text-ink/45"}`}>
      <span aria-hidden>{hausse ? "▲" : "▼"}</span>
      <span className="sr-only">{hausse ? "En hausse de" : "En baisse de"}</span> {e.pourcentage} %{" "}
      <span className="text-ink/45">vs {reference}</span>
    </p>
  );
}

function Chiffre({ titre, valeur, detail, children }: { titre: string; valeur: string; detail?: string; children?: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-ink/55">{titre}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{valeur}</p>
      {detail && <p className="mt-0.5 text-xs text-ink/45">{detail}</p>}
      {children}
    </Card>
  );
}

function Bloc({ titre, sousTitre, children }: { titre: string; sousTitre?: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="font-display text-base font-semibold">{titre}</h3>
      {sousTitre && <p className="mt-0.5 text-xs text-ink/50">{sousTitre}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

const avecPays = (parts: Part[]) => parts.map((p) => ({ ...p, nom: p.nom === "Autres" ? p.nom : nomPays(p.nom) }));

export function VueStatistiques({ stats }: { stats: Statistiques }) {
  const { site, app, mois } = stats;
  const precedent = decaler(mois, -1);
  const reference = stats.enCours ? `1er–${stats.jourCompare} ${nomMois(precedent)}` : nomMois(precedent);
  const pagesParVisite = site.visiteurs > 0 ? (site.pagesVues / site.visiteurs).toFixed(1).replace(".", ",") : "—";

  return (
    <div className="mx-auto max-w-5xl p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-steel">Statistiques</p>
          <h1 className="mt-1 font-display text-2xl font-semibold capitalize sm:text-3xl">{libelle(mois)}</h1>
          <p className="mt-1 text-sm text-ink/55">
            {stats.enCours ? `Mois en cours · chiffres au ${stats.jourCompare} ${nomMois(mois)}` : "Mois terminé"}
          </p>
        </div>
        <nav aria-label="Changer de mois" className="flex items-center gap-2">
          <Link
            href={`/admin/statistiques?mois=${cle(precedent)}`}
            className="grid h-10 w-10 place-items-center rounded-xl border border-ink/15 text-ink/70 hover:border-ink/30 hover:text-ink"
            aria-label={`Voir ${libelle(precedent)}`}
          >
            ‹
          </Link>
          {stats.enCours ? (
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-ink/10 text-ink/20" aria-hidden>
              ›
            </span>
          ) : (
            <Link
              href={`/admin/statistiques?mois=${cle(decaler(mois, 1))}`}
              className="grid h-10 w-10 place-items-center rounded-xl border border-ink/15 text-ink/70 hover:border-ink/30 hover:text-ink"
              aria-label={`Voir ${libelle(decaler(mois, 1))}`}
            >
              ›
            </Link>
          )}
          {!stats.enCours && (
            <Link href="/admin/statistiques" className="ml-1 text-xs text-ink/55 underline hover:text-ink">
              Mois en cours
            </Link>
          )}
        </nav>
      </div>

      {stats.migrationManquante && (
        <p className="mt-6 rounded-xl border border-alerte-orange/30 bg-alerte-orange/10 px-4 py-3 text-sm">
          La mesure des visites n&apos;est pas encore active : applique le <strong>Module 44</strong> dans
          Supabase (fichier <code>migration-44-statistiques.sql</code>). L&apos;usage de l&apos;app
          s&apos;affiche déjà, mais sans pouvoir exclure tes comptes de test.
        </p>
      )}

      {/* ---------------------------------------------------------- le site */}
      <h2 className="mt-10 font-display text-xl font-semibold">Le site</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Chiffre titre="Visiteurs" valeur={String(site.visiteurs)} detail="Une personne par jour">
          <Evolution actuel={site.visiteurs} precedent={site.precedent.visiteurs} reference={reference} />
        </Chiffre>
        <Chiffre titre="Pages vues" valeur={String(site.pagesVues)}>
          <Evolution actuel={site.pagesVues} precedent={site.precedent.pagesVues} reference={reference} />
        </Chiffre>
        <Chiffre titre="Pages par visite" valeur={pagesParVisite} detail="Plus c'est haut, plus ils explorent" />
        <Chiffre titre="Candidatures" valeur={String(app.candidatures)}>
          <Evolution actuel={app.candidatures} precedent={app.precedent.candidatures} reference={reference} />
        </Chiffre>
      </div>

      <div className="mt-3">
        <Bloc titre="Visiteurs, jour par jour">
          <BarresJours jours={site.parJour} jourActuel={stats.enCours ? stats.jourCompare : null} />
        </Bloc>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Bloc titre="Sur quel appareil">
          <Anneau parts={site.appareils} titre="Appareils" />
        </Bloc>
        <Bloc titre="D'où ils viennent" sousTitre="Le site qui les a envoyés, à leur arrivée">
          <ListeBarres parts={site.origines} unite="visiteurs" />
        </Bloc>
        <Bloc titre="Pages les plus vues">
          <ListeBarres parts={site.pages} unite="vues" />
        </Bloc>
        <div className="grid gap-3">
          <Bloc titre="Pays">
            <ListeBarres parts={avecPays(site.pays)} unite="visiteurs" vide="Indisponible en local — renseigné en production." />
          </Bloc>
          <Bloc titre="Navigateurs">
            <ListeBarres parts={site.navigateurs} unite="visiteurs" />
          </Bloc>
        </div>
      </div>

      {/* ----------------------------------------------------------- l'app */}
      <h2 className="mt-12 font-display text-xl font-semibold">L&apos;app</h2>
      <p className="mt-1 text-sm text-ink/50">Tes comptes de test sont exclus de tous ces chiffres.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Chiffre titre="Artisans actifs" valeur={`${app.artisansActifs} / ${app.comptes}`} detail="Au moins une action ce mois">
          <Evolution actuel={app.artisansActifs} precedent={app.precedent.artisansActifs} reference={reference} />
        </Chiffre>
        <Chiffre titre="Nouveaux comptes" valeur={String(app.nouveauxComptes)} />
        <Chiffre
          titre="Taux d'activité"
          valeur={app.comptes > 0 ? `${Math.round((app.artisansActifs / app.comptes) * 100)} %` : "—"}
          detail="Des comptes ouverts"
        />
        <Chiffre titre="À relancer" valeur={String(app.inactifs.length)} detail={`Sans activité depuis 14 jours ou plus`} />
      </div>

      <div className="mt-3">
        <Bloc
          titre="Ce que les artisans utilisent"
          sousTitre="Classé par nombre d'artisans qui s'en servent : une fonctionnalité utilisée beaucoup par un seul artisan compte moins qu'une utilisée un peu par tous."
        >
          {app.fonctionnalites.length === 0 ? (
            <p className="text-sm text-ink/45">Aucune action ce mois-ci pour l&apos;instant.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink/45">
                  <th className="pb-2 font-normal">Fonctionnalité</th>
                  <th className="pb-2 font-normal">Artisans</th>
                  <th className="pb-2 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {app.fonctionnalites.map((f) => (
                  <tr key={f.nom}>
                    <td className="py-2 pr-3">{f.nom}</td>
                    <td className="w-2/5 py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <div aria-hidden className="h-1.5 flex-1 rounded-full bg-ink/5">
                          <div
                            className="h-full rounded-full bg-signal/70"
                            style={{ width: `${app.comptes ? (f.artisans / app.comptes) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="w-12 shrink-0 text-right tabular-nums text-ink/60">
                          {f.artisans} / {app.comptes}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-right tabular-nums text-ink/60">{f.actions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Bloc>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Bloc
          titre="Le parcours"
          sousTitre="Chaque étape, et la part de l'étape d'avant qui la franchit : là où le pourcentage chute, c'est là qu'ils décrochent."
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink/45">De la visite au compte</p>
          <Entonnoir etapes={app.acquisition} />
          <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-wider text-ink/45">Du compte au devis signé</p>
          <Entonnoir etapes={app.activation} />
        </Bloc>
        <Bloc titre="Écrans les plus ouverts">
          <ListeBarres parts={app.ecrans} unite="ouvertures" vide="Pas encore de données." />
        </Bloc>
      </div>

      <div className="mt-3">
        <Bloc titre="À relancer" sousTitre="Comptes sans aucune action depuis 14 jours ou plus.">
          {app.inactifs.length === 0 ? (
            <p className="text-sm text-ink/45">Tout le monde a été actif récemment.</p>
          ) : (
            <ul className="divide-y divide-ink/5 text-sm">
              {app.inactifs.map((c) => (
                <li key={c.nom} className="flex justify-between gap-3 py-2">
                  <span className="truncate">{c.nom}</span>
                  <span className="shrink-0 text-ink/55">
                    {c.jours === null ? "rien depuis plus de 90 jours" : `${c.jours} jours`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Bloc>
      </div>

      {/* -------------------------------------------------------- réglages */}
      <h2 className="mt-12 font-display text-xl font-semibold">Tes tests ne comptent pas</h2>
      <div className="mt-4 grid gap-3">
        <Card className="p-5">
          <InterrupteurAppareil />
        </Card>
        <Bloc titre="Comptes" sousTitre="Exclus un compte que tu as créé pour tester : il disparaît de toutes les statistiques de l'app.">
          <ul className="divide-y divide-ink/5">
            {stats.comptes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className={`min-w-0 truncate ${c.exclu ? "text-ink/40 line-through" : ""}`}>{c.nom}</span>
                <InterrupteurExclusion organisationId={c.id} exclu={c.exclu} verrouille={c.estAdmin} />
              </li>
            ))}
          </ul>
        </Bloc>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-ink/40">
        Visites mesurées sans cookie ni adresse IP conservée : un visiteur est compté une fois par
        jour, sans pouvoir être suivi d&apos;un jour à l&apos;autre. Les navigateurs qui demandent à ne
        pas être suivis ne sont pas comptés. Conservation : 13 mois.
      </p>
    </div>
  );
}
