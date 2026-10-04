import Link from "next/link";
import { SECTIONS, lireCapture } from "@/lib/guide/contenu";
import { CaptureAnnotee } from "./CaptureAnnotee";
import { BoutonRevoirTuto } from "./BoutonRevoirTuto";
import { EnTetePage } from "@/components/ui/EnTetePage";
import { Pastille } from "@/components/ui/Pastille";
import { IconeGuide } from "@/components/ui/Icones";

// ============================================================
// Le guide (27/09) — « comment l'utiliser, avec des flèches, des images »
// (Axel). Un sommaire des huit moments de la journée, puis chaque moment
// en quelques étapes : la phrase d'abord (ce qu'on lit en premier sur
// téléphone), la capture ensuite. Aucune donnée chargée, aucun script :
// la page s'affiche aussitôt, même avec peu de réseau (les images
// arrivent au fur et à mesure qu'on descend).
// ============================================================

export function VueGuide() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-5 pb-12 sm:p-8">
      <div id="sommaire" className="scroll-mt-16">
        <EnTetePage
          titre={`Compyo en ${SECTIONS.length} moments`}
          sousTitre="Touchez un moment de votre journée pour voir comment faire, écran par écran."
          icone={
            <Pastille couleur="bleu" taille="grande">
              <IconeGuide taille={24} />
            </Pastille>
          }
        >
          <BoutonRevoirTuto />
        </EnTetePage>
      </div>

      <nav aria-label="Sommaire du guide" className="mt-5">
        <ol className="grid gap-2 sm:grid-cols-2">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="flex min-h-16 items-center gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ring-ink/10 transition hover:ring-ink/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-signal/12 font-display text-[15px] font-semibold text-signal">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-ink">{s.titre}</span>
                  <span className="block text-[13px] leading-snug text-ink/55">{s.resume}</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {SECTIONS.map((s, i) => (
        <section key={s.id} id={s.id} aria-labelledby={`titre-${s.id}`} className="mt-14 scroll-mt-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-steel">
            {i + 1} / {SECTIONS.length}
          </p>
          <h2 id={`titre-${s.id}`} className="mt-1 font-display text-[1.35rem] font-semibold leading-tight text-ink">
            {s.titre}
          </h2>
          <p className="mt-1 text-[15px] text-ink/60">{s.resume}</p>

          <ol className="mt-6 flex flex-col gap-10">
            {s.etapes.map((e, j) => (
              <li key={e.capture} className="grid gap-4 sm:grid-cols-[minmax(0,300px)_minmax(0,1fr)] sm:items-start sm:gap-8">
                <div className="flex gap-3 sm:order-2 sm:pt-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[14px] font-semibold text-paper">
                    {j + 1}
                  </span>
                  <p className="pt-0.5 text-[16px] leading-relaxed text-ink">{e.texte}</p>
                </div>
                <div className="sm:order-1">
                  <CaptureAnnotee id={e.capture} capture={lireCapture(e.capture)} alt={e.alt} />
                </div>
              </li>
            ))}
          </ol>

          {s.astuce && (
            <p className="mt-8 rounded-2xl bg-paper-warm px-4 py-3.5 text-[15px] leading-relaxed text-ink/80">
              <span className="font-semibold text-ink">Astuce · </span>
              {s.astuce}
            </p>
          )}
          {s.lien && (
            <Link
              href={s.lien.href}
              className="mt-8 flex min-h-14 items-center justify-center rounded-2xl text-[16px] font-semibold text-ink ring-1 ring-ink/15 transition hover:ring-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
            >
              {s.lien.libelle} →
            </Link>
          )}

          <a
            href="#sommaire"
            className="mt-6 inline-flex min-h-11 items-center text-[14px] text-ink/55 underline decoration-ink/20 underline-offset-4 hover:text-ink"
          >
            ↑ Revenir au sommaire
          </a>
        </section>
      ))}
    </div>
  );
}
