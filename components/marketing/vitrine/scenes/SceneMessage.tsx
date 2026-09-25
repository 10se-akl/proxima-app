import { CompyoMark } from "@/components/marketing/CompyoMark";
import { Carte, Coche, Etiquette, d } from "./outils";

// ============================================================
// 07:48 — le message du client devient un projet.
//
// Ce qui se passe, dans l'ordre : le message arrive ; l'artisan le
// partage vers Compyo (la feuille de partage du téléphone, où Compyo
// apparaît comme n'importe quelle app) ; le projet se remplit tout seul.
// C'est la fonction réelle de l'app (partage natif Android / capture
// d'écran), pas une promesse.
//
// Le numéro de téléphone est dans la tranche réservée à la fiction par
// l'ARCEP (06 39 98) : il ne peut appartenir à personne.
// ============================================================

const APPS = [
  { nom: "Messages", couleur: "bg-[#5fbf6b]" },
  { nom: "Mail", couleur: "bg-[#4b8fe3]" },
  { nom: "Compyo", couleur: "" },
  { nom: "Notes", couleur: "bg-[#f1c84b]" },
];

const CHAMPS = [
  { libelle: "Client", valeur: "Mme Garnier" },
  { libelle: "Téléphone", valeur: "06 39 98 41 18" },
  { libelle: "Adresse", valeur: "12 rue des Lilas, Nantes" },
  { libelle: "Demande", valeur: "Fuite sous l'évier de la cuisine" },
];

export function SceneMessage() {
  return (
    <div className="relative grid items-center gap-6 px-5 pb-20 pt-8 max-md:gap-0 max-md:px-4 max-md:pb-5 max-md:pt-5 sm:px-10 sm:pb-24 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)] lg:gap-4 lg:px-14 lg:py-16">
      {/* La conversation */}
      <Carte className="v-entre relative mx-auto w-full max-w-[20rem] overflow-hidden" style={d(0.1)}>
        <div className="flex items-center gap-3 border-b border-ink/[0.06] px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-signal-clair/70 text-[12px] font-semibold text-signal-fonce">
            MG
          </span>
          <div className="leading-tight">
            <p className="text-[14px] font-semibold text-ink">Mme Garnier</p>
            <p className="text-[11px] text-steel">Messages</p>
          </div>
        </div>
        <div className="min-h-[15.5rem] space-y-3 bg-paper px-3.5 pb-24 pt-4 max-md:min-h-[10rem] max-md:pb-20">
          <p className="text-center font-mono text-[10px] uppercase tracking-wider text-steel">Aujourd&apos;hui 07:46</p>
          <p
            className="v-pop max-w-[90%] origin-bottom-left rounded-2xl rounded-bl-md bg-surface px-3.5 py-2.5 text-[13.5px] leading-snug text-ink shadow-[var(--v-ombre-legere)] ring-1 ring-ink/[0.06]"
            style={d(0.7)}
          >
            Bonjour, fuite sous l&apos;évier de la cuisine depuis hier soir. Vous pourriez passer cette
            semaine&nbsp;? 12 rue des Lilas, Nantes. 06&nbsp;39&nbsp;98&nbsp;41&nbsp;18
          </p>
        </div>

        {/* La feuille de partage du téléphone : elle monte, on touche
            Compyo, elle redescend. */}
        <div
          aria-hidden
          className="v-passe absolute inset-x-0 bottom-0 rounded-t-[1.3rem] bg-surface px-4 pb-5 pt-2.5 shadow-[0_-16px_40px_-16px_rgb(0_0_0/0.35)]"
          style={d(1.8, { "--duree": "2.5s" })}
        >
          <span className="mx-auto block h-1 w-9 rounded-full bg-ink/15" />
          <p className="mt-3 text-[12px] font-medium text-ink/55">Partager avec</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {APPS.map((app) => (
              <div key={app.nom} className="flex flex-col items-center gap-1.5">
                <span className="relative">
                  {app.nom === "Compyo" ? (
                    <>
                      <span className="grid h-12 w-12 place-items-center rounded-[0.9rem] bg-[#FAF8F5] ring-1 ring-black/10">
                        <CompyoMark taille={30} />
                      </span>
                      <span className="v-clic absolute -inset-2 rounded-[1.2rem] bg-signal/35" style={d(2.9)} />
                    </>
                  ) : (
                    <span className={`block h-12 w-12 rounded-[0.9rem] ${app.couleur} opacity-80`} />
                  )}
                </span>
                <span className={`text-[10.5px] ${app.nom === "Compyo" ? "font-semibold text-ink" : "text-ink/55"}`}>
                  {app.nom}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Carte>

      {/* Le lien entre les deux : vertical sur téléphone, horizontal sur
          ordinateur. */}
      <svg aria-hidden viewBox="0 0 24 56" className="mx-auto h-12 w-6 text-signal max-md:hidden lg:hidden">
        <path d="M12 2v46" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 5" strokeLinecap="round" />
        <path className="v-trace" pathLength={1} d="M12 2v46" stroke="currentColor" strokeWidth="1.6" style={d(3.4, { "--duree": "0.6s" })} />
        <path d="M6 44l6 7 6-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg aria-hidden viewBox="0 0 72 24" className="hidden h-6 w-full text-signal lg:block">
        <path d="M2 12h60" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.6" strokeDasharray="3 5" strokeLinecap="round" />
        <path className="v-trace" pathLength={1} d="M2 12h60" stroke="currentColor" strokeWidth="1.6" style={d(3.4, { "--duree": "0.6s" })} />
        <path d="M58 6l7 6-7 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Le projet, qui se remplit tout seul. Sur téléphone, il recouvre le
          bas de la conversation : la marge sous la bulle (pb-20) est plus
          haute que le recouvrement (-mt-12), pour que le texte du message
          ne passe jamais dessous, et l'ombre vers le haut sépare les deux
          cartes, de la même couleur en mode sombre. */}
      <div className="relative z-10 mx-auto w-full max-w-[21rem] max-md:-mt-12 max-md:px-2">
        <Carte className="v-droite p-5 max-md:shadow-[0_-12px_28px_-14px_rgb(0_0_0/0.45)] max-md:ring-ink/[0.12] sm:p-6" style={d(3.7)}>
          <div className="flex items-center justify-between gap-3">
            <Etiquette>Nouveau projet</Etiquette>
            <span
              className="v-pop inline-flex items-center gap-1 rounded-full bg-succes/10 px-2.5 py-1 text-[11px] font-medium text-succes"
              style={d(5.6)}
            >
              <Coche className="h-3 w-3" /> Créé
            </span>
          </div>
          <p className="v-entre mt-2 font-display text-[1.35rem] font-semibold leading-tight text-ink" style={d(4.1)}>
            Fuite sous l&apos;évier
          </p>
          <dl className="mt-4 divide-y divide-ink/[0.07]">
            {CHAMPS.map((c, i) => (
              <div key={c.libelle} className="v-entre flex items-baseline justify-between gap-4 py-2.5 max-md:py-2" style={d(4.4 + i * 0.28)}>
                <dt className="text-[12px] text-steel">{c.libelle}</dt>
                <dd className="text-right text-[13.5px] font-medium text-ink">{c.valeur}</dd>
              </div>
            ))}
          </dl>
        </Carte>
        <p className="v-entre mt-4 text-center text-[13px] text-steel max-md:hidden" style={d(6)}>
          Rien n&apos;a été tapé à la main.
        </p>
      </div>
    </div>
  );
}
