import { formatMontant, formatQuantite, dateLongue, type ModeleDevis } from "@/lib/devis/modeleDocument";

// ============================================================
// Le devis tel que le client le lit (17/09) — rendu web du modèle
// construit par lib/devis/modeleDocument.ts. Aucune donnée n'est décidée
// ici : seulement la mise en page.
//
// Toujours "papier" : blanc et texte sombre, même en mode sombre (voir
// .document-papier dans app/globals.css) — un devis est un document, pas
// un écran de l'application.
// ============================================================

function Etiquette({ children }: { children: React.ReactNode }) {
  return <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink/45">{children}</p>;
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
      className="document-papier doc-imprimable rounded-2xl sm:rounded-md border border-ink/10 bg-surface text-ink shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_28px_-12px_rgb(0_0_0/0.18)] px-5 py-6 sm:px-10 sm:py-10 text-[13px] leading-relaxed"
    >
      {/* En-tête : qui propose, et quoi. */}
      <header className="flex flex-col-reverse gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          {emetteur.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={emetteur.logoUrl} alt="" className="h-14 w-14 shrink-0 object-contain" />
          )}
          <div className="min-w-0">
            <p className="font-display text-[17px] font-bold leading-snug tracking-tight text-ink break-words">
              {emetteur.nom}
            </p>
            {emetteur.adresse && <p className="mt-0.5 text-ink/65 whitespace-pre-line">{emetteur.adresse}</p>}
            {emetteur.contact && <p className="text-ink/65 break-words">{emetteur.contact}</p>}
          </div>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="font-display text-[26px] font-extrabold uppercase leading-none tracking-[0.08em] text-signal">
            Devis
          </p>
          <p className="mt-2 text-ink/60">
            N° <span className="font-semibold text-ink tabular-nums">{modele.numero}</span>
          </p>
          <p className="text-ink/60">du {modele.date}</p>
        </div>
      </header>

      <div className="mt-6 h-px bg-gradient-to-r from-signal/70 via-signal/25 to-transparent" />

      {/* Pour qui, et où. */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-paper-warm/55 px-4 py-3">
          <Etiquette>Client</Etiquette>
          <p className="mt-1 font-semibold text-ink break-words">{client.nom}</p>
          {client.adresse && <p className="text-ink/70 whitespace-pre-line">{client.adresse}</p>}
          {client.telephone && <p className="text-ink/70 tabular-nums">{client.telephone}</p>}
        </div>
        {modele.adresseChantier && (
          <div className="rounded-lg bg-paper-warm/55 px-4 py-3">
            <Etiquette>Adresse du chantier</Etiquette>
            <p className="mt-1 text-ink/80 whitespace-pre-line">{modele.adresseChantier}</p>
          </div>
        )}
      </section>

      {modele.objet && (
        <section className="mt-6">
          <Etiquette>Objet</Etiquette>
          <p className="mt-1 text-[14px] leading-relaxed text-ink">{modele.objet}</p>
        </section>
      )}

      {/* Détail chiffré — tableau sur grand écran et sur papier. */}
      <section className="mt-7">
        <table className="hidden w-full border-collapse sm:table">
          <thead>
            <tr className="border-b-2 border-ink/80 text-[10.5px] uppercase tracking-[0.1em] text-ink/55">
              <th className="py-2 pr-3 text-left font-semibold">Désignation</th>
              <th className="w-14 px-2 py-2 text-right font-semibold">Qté</th>
              <th className="w-20 px-2 py-2 text-left font-semibold">Unité</th>
              <th className="w-28 px-2 py-2 text-right font-semibold">PU HT</th>
              <th className="w-28 py-2 pl-2 text-right font-semibold">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {modele.lignes.map((ligne, i) => (
              <tr key={i} className="break-inside-avoid border-b border-ink/10 align-top">
                <td className="py-2.5 pr-3 text-ink break-words">{ligne.description}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-ink/80">{formatQuantite(ligne.quantite)}</td>
                <td className="px-2 py-2.5 text-ink/60">{ligne.unite}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-ink/80 whitespace-nowrap">
                  {formatMontant(ligne.prix_unitaire)}
                </td>
                <td className="py-2.5 pl-2 text-right font-medium tabular-nums text-ink whitespace-nowrap">
                  {formatMontant(ligne.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Sur téléphone, cinq colonnes seraient illisibles : chaque ligne
            devient un bloc, le calcul reste visible en une ligne. */}
        <ul className="divide-y divide-ink/10 border-y border-ink/15 sm:hidden">
          {modele.lignes.map((ligne, i) => (
            <li key={i} className="py-3">
              <p className="text-ink break-words">{ligne.description}</p>
              <div className="mt-1 flex items-baseline justify-between gap-3">
                <p className="text-[12px] text-ink/55 tabular-nums">
                  {formatQuantite(ligne.quantite)} {ligne.unite} × {formatMontant(ligne.prix_unitaire)} HT
                </p>
                <p className="shrink-0 font-medium tabular-nums text-ink">{formatMontant(ligne.total)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Totaux, alignés sous la colonne des montants. */}
      <section className="mt-5 flex justify-end break-inside-avoid">
        <div className="w-full sm:w-80">
          {modele.sousTotaux.length > 0 && (
            <div className="mb-2 space-y-1 border-b border-ink/10 pb-2 text-[12px] text-ink/55">
              {modele.sousTotaux.map((st) => (
                <div key={st.libelle} className="flex justify-between gap-4">
                  <span>dont {st.libelle.toLowerCase()}</span>
                  <span className="tabular-nums">{formatMontant(st.montant)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-1">
            <div className="flex justify-between gap-4 text-ink/75">
              <span>Total HT</span>
              <span className="tabular-nums">{formatMontant(totaux.totalHt)}</span>
            </div>
            {totaux.tva ? (
              <div className="flex justify-between gap-4 text-ink/75">
                <span>{totaux.tva.libelle}</span>
                <span className="tabular-nums">{formatMontant(totaux.tva.montant)}</span>
              </div>
            ) : (
              <p className="text-[12px] text-ink/60">TVA non applicable, art. 293 B du CGI</p>
            )}
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-4 rounded-lg bg-anthracite px-4 py-3 text-white">
            <span className="font-medium">{totaux.libelleTotal}</span>
            <span className="font-display text-[19px] font-bold tabular-nums">{formatMontant(totaux.totalTtc)}</span>
          </div>
        </div>
      </section>

      {modele.mentionTva && (
        <p className="mt-4 text-[11px] leading-relaxed text-ink/55">{modele.mentionTva}</p>
      )}

      {(modele.conditions.length > 0 || modele.coordonneesBancaires) && (
        <section className="mt-8 break-inside-avoid">
          <Etiquette>Conditions</Etiquette>
          {/* Une seule colonne, libellé à gauche : les conditions se lisent
              dans l'ordre (validité, calendrier, paiement), sans libellé
              coupé en deux. */}
          <dl className="mt-2 divide-y divide-ink/10 border-y border-ink/10">
            {modele.conditions.map((c) => (
              <div key={c.libelle} className="grid gap-x-6 py-1.5 sm:grid-cols-[12rem_1fr]">
                <dt className="text-ink/55">{c.libelle}</dt>
                <dd className="font-medium text-ink">{c.valeur}</dd>
              </div>
            ))}
          </dl>
          {modele.coordonneesBancaires && (
            <p className="mt-2 text-[12px] text-ink/65 break-words">
              Règlement par virement :{" "}
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
        <section className="mt-6 break-inside-avoid">
          <Etiquette>Remarques</Etiquette>
          <p className="mt-1 text-ink/80 whitespace-pre-line">{modele.commentaires}</p>
        </section>
      )}

      {/* Acceptation. Signé en ligne : on l'écrit, avec le tracé. Sinon, la
          zone à remplir à la main, avec la mention manuscrite exacte. */}
      <div className={signature || zoneSignature === "toujours" ? "" : "bloc-signature"}>
        <section className="mt-8 grid gap-5 break-inside-avoid sm:grid-cols-2">
          <div>
            <Etiquette>Bon pour accord</Etiquette>
            {signature ? (
              <p className="mt-1 text-ink/75">
                Devis accepté et signé électroniquement
                {signature.nom ? (
                  <>
                    {" "}par <span className="font-medium text-ink">{signature.nom}</span>
                  </>
                ) : null}{" "}
                le {dateLongue(signature.le)}.
              </p>
            ) : (
              <p className="mt-1 text-ink/70">
                Pour accepter ce devis, datez-le et signez-le en faisant précéder votre signature de la
                mention manuscrite : <span className="font-medium text-ink">« {modele.mentionManuscrite} »</span>.
              </p>
            )}
          </div>
          <div className="flex min-h-[132px] flex-col rounded-lg border border-ink/25 px-4 py-3">
            <p className="text-[11px] text-ink/50">Date et signature du client</p>
            {signature?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signature.image} alt="Signature du client" className="mt-2 h-20 w-auto self-start object-contain" />
            )}
          </div>
        </section>
      </div>

      {/* Mentions légales : en pied de document, comme sur papier. */}
      <footer className="mt-10 space-y-1.5 border-t border-ink/15 pt-4 text-[10.5px] leading-relaxed text-ink/55">
        {emetteur.identite.length > 0 && <p>{[emetteur.nom, ...emetteur.identite].join(" · ")}</p>}
        {modele.assurances.map((a) => (
          <p key={a}>{a}</p>
        ))}
        {modele.mentionsFin.map((m) => (
          <p key={m}>{m}</p>
        ))}
        {modele.conditionsGenerales && (
          <div className="pt-2">
            <p className="font-semibold text-ink/65">Conditions générales</p>
            <p className="whitespace-pre-line">{modele.conditionsGenerales}</p>
          </div>
        )}
      </footer>
    </article>
  );
}
