import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  dateLongue,
  formatMontant as formatMontantEcran,
  formatQuantite as formatQuantiteEcran,
  type ModeleDevis,
} from "@/lib/devis/modeleDocument";

// ============================================================
// Le devis en VRAI PDF (17/09) — même modèle que la version web
// (components/devis/DocumentDevis.tsx), même ordre, même texte. Ce module
// n'est chargé qu'à la demande (voir genererPdf.ts) : le moteur PDF est
// lourd, il n'a rien à faire dans le reste de l'application.
//
// Couleurs : celles de l'application, pré-mélangées sur fond blanc (un PDF
// n'a pas de transparence fiable à l'impression).
// ============================================================

const C = {
  encre: "#1F2937",
  encre80: "#4C545F",
  encre70: "#626973",
  encre55: "#848991",
  encre45: "#9A9FA5",
  trait25: "#C7CACD",
  trait15: "#DDDFE1",
  trait10: "#E9EAEB",
  signal: "#C96B4A",
  signalPale: "#EFD3C9",
  encadre: "#F8F5F1",
  blanc: "#FFFFFF",
};

const s = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 64,
    paddingHorizontal: 44,
    fontFamily: "Inter",
    fontSize: 9.5,
    lineHeight: 1.45,
    color: C.encre,
  },
  rappelHaut: {
    position: "absolute",
    top: 18,
    left: 44,
    right: 44,
    fontSize: 7.5,
    color: C.encre45,
  },
  // Pied de page, ancré par le HAUT (une page A4 fait 841,89 pt) : le
  // moteur recalcule un texte dynamique avec une hauteur nulle, et ancré par
  // le bas, le numéro de page sortait vide. Des Text posés directement sur
  // la page : regroupés dans une View "fixed", rien n'était dessiné.
  piedFilet: { position: "absolute", top: 798, left: 44, right: 44, height: 0.5, backgroundColor: C.trait15 },
  piedGauche: { position: "absolute", top: 804, left: 44, right: 150, fontSize: 7.5, color: C.encre45 },
  piedDroite: { position: "absolute", top: 804, left: 44, right: 44, textAlign: "right", fontSize: 7.5, color: C.encre45 },
  entete: { flexDirection: "row", justifyContent: "space-between" },
  emetteur: { flexDirection: "row", maxWidth: 300 },
  logo: { width: 52, height: 52, objectFit: "contain", marginRight: 12 },
  nomEntreprise: { fontFamily: "Manrope", fontWeight: 700, fontSize: 13.5, lineHeight: 1.25 },
  gris: { color: C.encre70 },
  titreBloc: { alignItems: "flex-end" },
  titre: { fontFamily: "Manrope", fontWeight: 800, fontSize: 24, letterSpacing: 2.5, color: C.signal, lineHeight: 1 },
  filet: { flexDirection: "row", marginTop: 18, height: 1.5 },
  etiquette: { fontSize: 7, fontWeight: 600, letterSpacing: 1.1, color: C.encre55, marginBottom: 3 },
  parties: { flexDirection: "row", marginTop: 18 },
  encadre: { backgroundColor: C.encadre, borderRadius: 5, paddingVertical: 9, paddingHorizontal: 11, width: "48.5%" },
  section: { marginTop: 18 },
  objet: { fontSize: 10.5, lineHeight: 1.45 },
  tableEntete: {
    flexDirection: "row",
    borderBottomWidth: 1.2,
    borderBottomColor: C.encre80,
    paddingBottom: 5,
    fontSize: 7,
    fontWeight: 600,
    letterSpacing: 0.9,
    color: C.encre55,
  },
  tableLigne: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.trait10, paddingVertical: 6 },
  colDesignation: { flex: 1, paddingRight: 8 },
  colQte: { width: 38, textAlign: "right", paddingRight: 6 },
  colUnite: { width: 52, paddingLeft: 4 },
  colPu: { width: 74, textAlign: "right" },
  colTotal: { width: 80, textAlign: "right" },
  totaux: { marginTop: 12, alignSelf: "flex-end", width: 230 },
  ligneTotal: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  bandeauTotal: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.encre,
    borderRadius: 5,
    paddingVertical: 9,
    paddingHorizontal: 12,
    color: C.blanc,
  },
  petit: { fontSize: 8, lineHeight: 1.45, color: C.encre55 },
  condition: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.trait10, paddingVertical: 4 },
  conditionLibelle: { width: 150, color: C.encre55 },
  conditionValeur: { flex: 1, fontWeight: 500 },
  signature: { flexDirection: "row", justifyContent: "space-between", marginTop: 22 },
  cadreSignature: {
    width: "48.5%",
    minHeight: 96,
    borderWidth: 0.8,
    borderColor: C.trait25,
    borderRadius: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  mentions: {
    marginTop: 26,
    paddingTop: 9,
    borderTopWidth: 0.6,
    borderTopColor: C.trait15,
    fontSize: 7.3,
    lineHeight: 1.5,
    color: C.encre55,
  },
});

// Les polices du PDF n'ont pas l'espace fine insécable (U+202F) que le
// format français place entre les milliers : "1 234,56 €" y devenait
// "1234,56 €". L'espace insécable ordinaire joue le même rôle. Les textes
// déjà mis en forme dans le modèle sont traités de même dans genererPdf.ts.
const sansFine = (texte: string) => texte.replace(/\u202f/g, "\u00a0");
const formatMontant = (n: number) => sansFine(formatMontantEcran(n));
const formatQuantite = (n: number) => sansFine(formatQuantiteEcran(n));

function Etiquette({ children }: { children: string }) {
  return <Text style={s.etiquette}>{children.toUpperCase()}</Text>;
}

export function DocumentDevisPdf({
  modele,
  logo,
}: {
  modele: ModeleDevis;
  // Logo déjà converti en PNG (voir genererPdf.ts) : le moteur PDF ne lit
  // ni le WebP ni le SVG qu'un artisan peut avoir envoyé.
  logo: string | null;
}) {
  const { emetteur, client, totaux, signature } = modele;
  const reference = `Devis n° ${modele.numero} — ${emetteur.nom}`;

  return (
    <Document title={`Devis ${modele.numero}`} author={emetteur.nom} subject={modele.objet ?? undefined} language="fr-FR">
      <Page size="A4" style={s.page}>
        {/* À partir de la page 2 : rappel discret de ce qu'on lit. */}
        <Text style={s.rappelHaut} fixed render={({ pageNumber }) => (pageNumber > 1 ? reference : "")} />

        <View style={s.piedFilet} fixed />
        <Text style={s.piedGauche} fixed>
          {reference}
        </Text>
        <Text style={s.piedDroite} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />

        {/* En-tête */}
        <View style={s.entete}>
          <View style={s.emetteur}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {logo && <Image src={logo} style={s.logo} />}
            <View style={{ flexShrink: 1 }}>
              <Text style={s.nomEntreprise}>{emetteur.nom}</Text>
              {emetteur.adresse && <Text style={[s.gris, { marginTop: 2 }]}>{emetteur.adresse}</Text>}
              {emetteur.contact && <Text style={s.gris}>{emetteur.contact}</Text>}
            </View>
          </View>
          <View style={s.titreBloc}>
            <Text style={s.titre}>DEVIS</Text>
            <Text style={[s.gris, { marginTop: 7 }]}>
              N° <Text style={{ color: C.encre, fontWeight: 600 }}>{modele.numero}</Text>
            </Text>
            <Text style={s.gris}>du {modele.date}</Text>
          </View>
        </View>

        <View style={s.filet}>
          <View style={{ width: "32%", backgroundColor: C.signal }} />
          <View style={{ flex: 1, backgroundColor: C.signalPale }} />
        </View>

        {/* Client et chantier */}
        <View style={s.parties}>
          <View style={s.encadre}>
            <Etiquette>Client</Etiquette>
            <Text style={{ fontWeight: 600 }}>{client.nom}</Text>
            {client.adresse && <Text style={{ color: C.encre80 }}>{client.adresse}</Text>}
            {client.telephone && <Text style={{ color: C.encre80 }}>{client.telephone}</Text>}
          </View>
          {modele.adresseChantier && (
            <View style={[s.encadre, { marginLeft: "3%" }]}>
              <Etiquette>Adresse du chantier</Etiquette>
              <Text style={{ color: C.encre80 }}>{modele.adresseChantier}</Text>
            </View>
          )}
        </View>

        {modele.objet && (
          <View style={s.section}>
            <Etiquette>Objet</Etiquette>
            <Text style={s.objet}>{modele.objet}</Text>
          </View>
        )}

        {/* Détail chiffré — l'en-tête du tableau se répète sur chaque page. */}
        <View style={{ marginTop: 20 }}>
          <View style={s.tableEntete} fixed>
            <Text style={s.colDesignation}>DÉSIGNATION</Text>
            <Text style={s.colQte}>QTÉ</Text>
            <Text style={s.colUnite}>UNITÉ</Text>
            <Text style={s.colPu}>PU HT</Text>
            <Text style={s.colTotal}>TOTAL HT</Text>
          </View>
          {modele.lignes.map((ligne, i) => (
            <View key={i} style={s.tableLigne} wrap={false}>
              <Text style={s.colDesignation}>{ligne.description}</Text>
              <Text style={[s.colQte, { color: C.encre80 }]}>{formatQuantite(ligne.quantite)}</Text>
              <Text style={[s.colUnite, { color: C.encre55 }]}>{ligne.unite}</Text>
              <Text style={[s.colPu, { color: C.encre80 }]}>{formatMontant(ligne.prix_unitaire)}</Text>
              <Text style={[s.colTotal, { fontWeight: 500 }]}>{formatMontant(ligne.total)}</Text>
            </View>
          ))}
        </View>

        {/* Totaux */}
        <View style={s.totaux} wrap={false}>
          {modele.sousTotaux.length > 0 && (
            <View style={{ borderBottomWidth: 0.5, borderBottomColor: C.trait10, paddingBottom: 4, marginBottom: 5 }}>
              {modele.sousTotaux.map((st) => (
                <View key={st.libelle} style={[s.ligneTotal, { fontSize: 8.3, color: C.encre55 }]}>
                  <Text>dont {st.libelle.toLowerCase()}</Text>
                  <Text>{formatMontant(st.montant)}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={[s.ligneTotal, { color: C.encre80 }]}>
            <Text>Total HT</Text>
            <Text>{formatMontant(totaux.totalHt)}</Text>
          </View>
          {totaux.tva ? (
            <View style={[s.ligneTotal, { color: C.encre80 }]}>
              <Text>{totaux.tva.libelle}</Text>
              <Text>{formatMontant(totaux.tva.montant)}</Text>
            </View>
          ) : (
            <Text style={s.petit}>TVA non applicable, art. 293 B du CGI</Text>
          )}
          <View style={s.bandeauTotal}>
            <Text style={{ fontWeight: 500 }}>{totaux.libelleTotal}</Text>
            <Text style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 14 }}>{formatMontant(totaux.totalTtc)}</Text>
          </View>
        </View>

        {modele.mentionTva && <Text style={[s.petit, { marginTop: 10 }]}>{modele.mentionTva}</Text>}

        {(modele.conditions.length > 0 || modele.coordonneesBancaires) && (
          <View style={{ marginTop: 20 }} wrap={false}>
            <Etiquette>Conditions</Etiquette>
            <View style={{ borderTopWidth: 0.5, borderTopColor: C.trait10 }}>
              {modele.conditions.map((c) => (
                <View key={c.libelle} style={s.condition}>
                  <Text style={s.conditionLibelle}>{c.libelle}</Text>
                  <Text style={s.conditionValeur}>{c.valeur}</Text>
                </View>
              ))}
            </View>
            {modele.coordonneesBancaires && (
              <Text style={[s.gris, { marginTop: 5, fontSize: 8.5 }]}>
                Règlement par virement :{" "}
                {[
                  modele.coordonneesBancaires.iban && `IBAN ${modele.coordonneesBancaires.iban}`,
                  modele.coordonneesBancaires.bic && `BIC ${modele.coordonneesBancaires.bic}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            )}
          </View>
        )}

        {modele.commentaires && (
          <View style={s.section} wrap={false}>
            <Etiquette>Remarques</Etiquette>
            <Text style={{ color: C.encre80 }}>{modele.commentaires}</Text>
          </View>
        )}

        {/* Acceptation */}
        <View style={s.signature} wrap={false}>
          <View style={{ width: "48.5%" }}>
            <Etiquette>Bon pour accord</Etiquette>
            {signature ? (
              <Text style={{ color: C.encre80 }}>
                Devis accepté et signé électroniquement
                {signature.nom ? ` par ${signature.nom}` : ""} le {dateLongue(signature.le)}.
              </Text>
            ) : (
              <Text style={{ color: C.encre70 }}>
                Pour accepter ce devis, datez-le et signez-le en faisant précéder votre signature de la mention
                manuscrite : <Text style={{ color: C.encre, fontWeight: 500 }}>« {modele.mentionManuscrite} »</Text>.
              </Text>
            )}
          </View>
          <View style={s.cadreSignature}>
            <Text style={{ fontSize: 7.5, color: C.encre55 }}>Date et signature du client</Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {signature?.image && <Image src={signature.image} style={{ height: 60, objectFit: "contain", marginTop: 4 }} />}
          </View>
        </View>

        {/* Mentions légales */}
        <View style={s.mentions}>
          {emetteur.identite.length > 0 && <Text>{[emetteur.nom, ...emetteur.identite].join(" · ")}</Text>}
          {modele.assurances.map((a) => (
            <Text key={a}>{a}</Text>
          ))}
          {modele.mentionsFin.map((m) => (
            <Text key={m}>{m}</Text>
          ))}
          {modele.conditionsGenerales && (
            <View style={{ marginTop: 6 }}>
              <Text style={{ fontWeight: 600, color: C.encre70 }}>Conditions générales</Text>
              <Text>{modele.conditionsGenerales}</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
