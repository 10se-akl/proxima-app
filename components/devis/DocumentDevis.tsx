import { Fragment } from "react";
import { formatQuantite, dateLongue, type ModeleDevis } from "@/lib/devis/modeleDocument";
import { euros } from "@/components/ui/recettes";

// ============================================================
// Le devis tel que le client le lit (17/09) — rendu web du modèle
// construit par lib/devis/modeleDocument.ts. Aucune donnée n'est décidée
// ici : seulement la mise en page.
//
// Toujours "papier" : blanc et texte sombre, même en mode sombre (voir
// .document-papier dans app/globals.css) — un devis est un document, pas
// un écran de l'application.
//
// Design v3 (24/10) : une typographie d'impression, à l'encre seule. Plus
// de couleur décorative (titre orange, filet en dégradé, liserés de lots,
// bandeau sombre du total), plus de capitales espacées ni de gris par
// transparence : le secondaire est en `steel`. Le total TTC se lit en gros
// sous un trait d'encre, comme sur une facture Stripe. Les mentions restent
// en 12-13 px (jamais sous 12) : le document garde ses tailles d'impression
// (le plancher de 13 px de l'application l'épargne, voir globals.css).
// ============================================================

// Design v3 (25/10) : les étiquettes de section sont des titres (h3, sous
// le « Devis » en h2) pour qu'un lecteur d'écran puisse sauter de l'une à
// l'autre ; l'apparence ne change pas.
function Etiquette({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[13px] font-semibold text-steel">{children}</h3>;
}

// Un montant de document : avec centimes, espace insécable lisible entre
// les milliers (euros() de recettes : « 2 137,08 € », jamais coupé).
const montant = (n: number) => euros(n, true);

// Typographie seulement (aucun mot ne change) : une espace insécable entre
// un nombre et son unité (« 8 mm », « 3 jours », « 30 % ») et avant « : »,
// pour ne jamais laisser l'unité ou les deux-points seuls en début de
// ligne. L'espace fine des milliers (U+202F, presque invisible en petit)
// devient une insécable ordinaire, comme dans euros().
const UNITES = "mm|cm|m|m²|m2|m³|m3|ml|kg|g|l|L|u|h|j|jours?|mois|ans?|%|€|°C|°|W|kW";
// (Lettres écrites à la main plutôt que \p{L}, inconnu des vieux Safari.)
const NOMBRE_UNITE = new RegExp(`(\\d) (?=(?:${UNITES})(?![A-Za-zÀ-ÖØ-öø-ÿ0-9]))`, "g");
function insecables(texte: string): string {
  return texte
    .replace(/\u202f/g, "\u00a0")
    .replace(NOMBRE_UNITE, "$1\u00a0")
    .replace(/ ([:;!?»])/g, "\u00a0$1")
    // Un tiret d'incise ne commence jamais une ligne (« — police n° »).
    .replace(/ — /g, "\u00a0— ")
    .replace(/« /g, "«\u00a0");
}

export function DocumentDevis({
  modele,
  zoneSignature = "toujours",
  id = "devis-imprimable",
}: {
  modele: ModeleDevis;
  // "impression" : la zone "Bon pour accord" n'apparaît que sur papier —
  // utile sur la page de signature, où le client signe juste en dessous.
  zoneSignature?: "toujours" | "impression";
  id?: string;
}) {
  const { emetteur, client, totaux, signature } = modele;

  return (
    <article
      id={id}
      className="document-papier doc-imprimable rounded-[14px] bg-surface px-5 py-7 text-[15px] leading-relaxed text-ink ombre-douce sm:rounded-[6px] sm:px-12 sm:py-12 sm:text-[14px]"
    >
      {/* En-tête : qui propose, et quoi. Sur téléphone, l'artisan d'abord,
          puis le numéro et la date. */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {emetteur.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={emetteur.logoUrl} alt="" className="h-14 w-14 shrink-0 object-contain" />
          )}
          <div className="min-w-0">
            <p className="break-words font-display text-[18px] font-bold leading-snug text-ink">{emetteur.nom}</p>
            {emetteur.adresse && <p className="mt-1 whitespace-pre-line text-steel">{emetteur.adresse}</p>}
            {emetteur.contact && <p className="break-words text-steel">{emetteur.contact}</p>}
          </div>
        </div>
        <div className="shrink-0 sm:text-right">
          <h2 className="font-display text-[28px] font-bold leading-none tracking-[-0.02em] text-ink">Devis</h2>
          <p className="mt-2.5 text-steel">
            N° <span className="font-semibold tabular-nums text-ink">{modele.numero}</span>
          </p>
          <p className="text-steel">du {modele.date}</p>
        </div>
      </header>

      {/* Pour qui, et où. */}
      <section className="mt-8 grid gap-5 border-t border-gris-clair pt-6 sm:grid-cols-2 sm:gap-8">
        <div className="min-w-0">
          <Etiquette>Client</Etiquette>
          <p className="mt-1 break-words font-semibold text-ink">{client.nom}</p>
          {client.adresse && <p className="whitespace-pre-line text-ink">{client.adresse}</p>}
          {client.telephone && <p className="tabular-nums text-ink">{client.telephone}</p>}
        </div>
        {modele.adresseChantier && (
          <div className="min-w-0">
            <Etiquette>Adresse du chantier</Etiquette>
            <p className="mt-1 whitespace-pre-line text-ink">{modele.adresseChantier}</p>
          </div>
        )}
      </section>

      {modele.objet && (
        <section className="mt-6">
          <Etiquette>Objet</Etiquette>
          <p className="mt-1 text-[16px] font-medium leading-snug text-ink [text-wrap:pretty] sm:text-[15px]">
            {insecables(modele.objet)}
          </p>
        </section>
      )}

      {/* Détail chiffré — tableau sur grand écran et sur papier. */}
      <section className="mt-8">
        <table className="hidden w-full border-collapse sm:table">
          <caption className="sr-only">Détail chiffré</caption>
          <thead>
            <tr className="border-b border-ink text-[13px] text-steel">
              <th scope="col" className="py-2 pr-3 text-left font-semibold">Désignation</th>
              <th scope="col" className="w-14 px-2 py-2 text-right font-semibold">Qté</th>
              <th scope="col" className="w-20 px-2 py-2 text-left font-semibold">Unité</th>
              <th scope="col" className="w-28 px-2 py-2 text-right font-semibold">PU HT</th>
              <th scope="col" className="w-28 py-2 pl-2 text-right font-semibold">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {modele.groupes.map((groupe, g) => (
              <Fragment key={g}>
                {groupe.titre && (
                  <tr className="break-inside-avoid border-b border-gris-clair">
                    <td colSpan={5} className={g === 0 ? "pb-2 pt-4" : "pb-2 pt-7"}>
                      <p className="font-display text-[15px] font-bold text-ink">{insecables(groupe.titre)}</p>
                    </td>
                  </tr>
                )}
                {groupe.lignes.map((ligne, i) => (
                  <tr key={i} className="break-inside-avoid border-b border-gris-clair align-top">
                    <td className="break-words py-3 pr-3 text-ink">
                      {insecables(ligne.description)}
                      {ligne.explication && (
                        <span className="mt-0.5 block text-[13px] leading-snug text-steel">
                          {insecables(ligne.explication)}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums text-ink">{formatQuantite(ligne.quantite)}</td>
                    <td className="px-2 py-3 text-steel">{ligne.unite}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums text-ink">
                      {montant(ligne.prix_unitaire)}
                    </td>
                    <td className="whitespace-nowrap py-3 pl-2 text-right font-semibold tabular-nums text-ink">
                      {montant(ligne.total)}
                    </td>
                  </tr>
                ))}
                {groupe.sousTotal !== null && (
                  <tr className="break-inside-avoid">
                    <td colSpan={4} className="py-2.5 pr-2 text-right text-[13px] text-steel">
                      Sous-total {groupe.nom}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pl-2 text-right font-semibold tabular-nums text-ink">
                      {montant(groupe.sousTotal)}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>

        {/* Sur téléphone, cinq colonnes seraient illisibles : chaque ligne
            devient un bloc (désignation et montant sur la première ligne,
            le calcul dessous), sans défilement horizontal à 360 px. */}
        <div className="space-y-6 sm:hidden">
          {modele.groupes.map((groupe, g) => (
            <div key={g}>
              {groupe.titre && (
                <p className="mb-1 font-display text-[16px] font-bold text-ink">{insecables(groupe.titre)}</p>
              )}
              <ul className="divide-y divide-gris-clair border-y border-gris-clair">
                {groupe.lignes.map((ligne, i) => (
                  <li key={i} className="py-3.5">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="min-w-0 break-words text-ink">{insecables(ligne.description)}</p>
                      <p className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-ink">
                        {montant(ligne.total)}
                      </p>
                    </div>
                    {ligne.explication && (
                      <p className="mt-0.5 text-[13px] leading-snug text-steel">{insecables(ligne.explication)}</p>
                    )}
                    <p className="mt-1 text-[13px] tabular-nums text-steel">
                      {insecables(formatQuantite(ligne.quantite))}{"\u00a0"}{ligne.unite} × {montant(ligne.prix_unitaire)}{"\u00a0"}HT
                    </p>
                  </li>
                ))}
              </ul>
              {groupe.sousTotal !== null && (
                <p className="mt-2 flex justify-between gap-3 text-[14px] text-steel">
                  <span>Sous-total {groupe.nom}</span>
                  <span className="whitespace-nowrap font-semibold tabular-nums text-ink">
                    {montant(groupe.sousTotal)}
                  </span>
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Totaux, alignés sous la colonne des montants. Le total TTC en gros
          sous un trait d'encre : c'est le chiffre que le client cherche. */}
      <section className="mt-6 flex justify-end break-inside-avoid">
        <div className="w-full sm:w-80">
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-steel">Total HT</span>
              <span className="whitespace-nowrap tabular-nums text-ink">{montant(totaux.totalHt)}</span>
            </div>
            {/* Design v3 (25/10) : le détail « dont … » se lit APRÈS le total
                HT qu'il décompose (à l'écran comme au lecteur d'écran), en
                retrait. Mêmes valeurs qu'avant. */}
            {modele.sousTotaux.length > 0 && (
              <div className="space-y-1 pb-1 pl-4 text-[13px] text-steel">
                {modele.sousTotaux.map((st) => (
                  <div key={st.libelle} className="flex justify-between gap-4">
                    <span>dont {st.libelle.toLowerCase()}</span>
                    <span className="whitespace-nowrap tabular-nums">{montant(st.montant)}</span>
                  </div>
                ))}
              </div>
            )}
            {totaux.tva ? (
              <div className="flex justify-between gap-4">
                <span className="text-steel">{totaux.tva.libelle}</span>
                <span className="whitespace-nowrap tabular-nums text-ink">{montant(totaux.tva.montant)}</span>
              </div>
            ) : (
              <p className="text-[13px] text-steel">TVA non applicable, art. 293 B du CGI</p>
            )}
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-4 border-t-2 border-ink pt-3">
            <span className="font-semibold text-ink">{totaux.libelleTotal}</span>
            <span className="whitespace-nowrap font-display text-[26px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink sm:text-[24px]">
              {montant(totaux.totalTtc)}
            </span>
          </div>
        </div>
      </section>

      {modele.mentionTva && (
        <p className="mt-4 text-[13px] leading-relaxed text-steel [text-wrap:pretty]">{insecables(modele.mentionTva)}</p>
      )}

      {(modele.conditions.length > 0 || modele.coordonneesBancaires) && (
        <section className="mt-10 break-inside-avoid">
          <Etiquette>Conditions</Etiquette>
          {/* Une seule colonne, libellé à gauche : les conditions se lisent
              dans l'ordre (validité, calendrier, paiement), sans libellé
              coupé en deux. */}
          <dl className="mt-2 divide-y divide-gris-clair border-y border-gris-clair">
            {modele.conditions.map((c) => (
              <div key={c.libelle} className="grid gap-x-6 py-2.5 sm:grid-cols-[12rem_1fr]">
                <dt className="text-steel">{c.libelle}</dt>
                <dd className="font-medium text-ink">{insecables(c.valeur)}</dd>
              </div>
            ))}
          </dl>
          {modele.coordonneesBancaires && (
            <p className="mt-2.5 break-words text-[13px] text-steel">
              Règlement par virement{"\u00a0"}:{" "}
              {[
                modele.coordonneesBancaires.iban && `IBAN ${modele.coordonneesBancaires.iban}`,
                modele.coordonneesBancaires.bic && `BIC ${modele.coordonneesBancaires.bic}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </section>
      )}

      {modele.commentaires && (
        <section className="mt-8 break-inside-avoid">
          <Etiquette>Remarques</Etiquette>
          <p className="mt-1 whitespace-pre-line text-ink [text-wrap:pretty]">{insecables(modele.commentaires)}</p>
        </section>
      )}

      {/* Acceptation. Signé en ligne : on l'écrit, avec le tracé. Sinon, la
          zone à remplir à la main, avec la mention manuscrite exacte. */}
      <div className={signature || zoneSignature === "toujours" ? "" : "bloc-signature"}>
        <section className="mt-10 grid gap-5 break-inside-avoid sm:grid-cols-2">
          <div>
            <Etiquette>Bon pour accord</Etiquette>
            {signature ? (
              <p className="mt-1 text-ink">
                Devis accepté et signé électroniquement
                {signature.nom ? (
                  <>
                    {" "}par <span className="font-semibold text-ink">{signature.nom}</span>
                  </>
                ) : null}{" "}
                le {dateLongue(signature.le)}.
              </p>
            ) : (
              <p className="mt-1 text-ink">
                Pour accepter ce devis, datez-le et signez-le en faisant précéder votre signature de la
                mention manuscrite{"\u00a0"}: <span className="font-semibold text-ink">«{"\u00a0"}{modele.mentionManuscrite}{"\u00a0"}»</span>.
              </p>
            )}
          </div>
          <div className="flex min-h-[132px] flex-col rounded-[8px] border border-steel px-4 py-3">
            <p className="text-[13px] text-steel">Date et signature du client</p>
            {signature?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signature.image} alt="Signature du client" className="mt-2 h-20 w-auto self-start object-contain" />
            )}
          </div>
        </section>
      </div>

      {/* Mentions légales : en pied de document, comme sur papier. */}
      {/* Design v3 (25/10) : 13 px à l'écran, 12 px sur papier. */}
      <footer className="mt-12 space-y-1.5 border-t border-gris-clair pt-5 text-[13px] leading-relaxed text-steel [text-wrap:pretty] print:text-[12px]">
        {emetteur.identite.length > 0 && <p>{[emetteur.nom, ...emetteur.identite].join(" · ")}</p>}
        {modele.assurances.map((a) => (
          <p key={a}>{insecables(a)}</p>
        ))}
        {modele.mentionsFin.map((m) => (
          <p key={m}>{insecables(m)}</p>
        ))}
        {modele.conditionsGenerales && (
          <div className="pt-2">
            <p className="font-semibold text-ink">Conditions générales</p>
            <p className="whitespace-pre-line">{insecables(modele.conditionsGenerales)}</p>
          </div>
        )}
      </footer>
    </article>
  );
}
