import type { Metadata } from "next";
import { LayoutJuridique } from "@/components/marketing/LayoutJuridique";

export const metadata: Metadata = {
  title: "Mentions légales",
};

export default function MentionsLegalesPage() {
  return (
    <LayoutJuridique titre="Mentions légales" misAJour="10 août 2026">
      <section>
        <h2>Éditeur du site</h2>
        <p>
          Le site et l&apos;application Compyo (accessible actuellement à l&apos;adresse{" "}
          <a href="https://compyo.vercel.app">compyo.vercel.app</a>, un nom de domaine en{" "}
          <strong>.fr</strong> propre à Compyo étant prévu ultérieurement) sont édités à titre
          non professionnel, dans le cadre d&apos;un projet personnel encore en bêta privée
          gratuite, par :
        </p>
        <ul>
          <li>
            <strong>Axel Thfoin</strong>, éditeur et développeur du site, mineur au moment de la
            publication.
          </li>
          <li>
            <strong>Willy Thfoin</strong>, titulaire de l&apos;autorité parentale et responsable
            légal de la publication, conformément à l&apos;article 6 de la loi n° 2004-575 du 21
            juin 2004 pour la confiance dans l&apos;économie numérique (un mineur ne pouvant être
            seul responsable civil d&apos;une publication en ligne).
          </li>
        </ul>
        <p>
          Adresse : 20 rue de l&apos;Orme, 91460.
          <br />
          Contact : <a href="mailto:thfoinaxel@gmail.com">thfoinaxel@gmail.com</a>
        </p>
        <p>
          Compyo n&apos;est, à la date de mise à jour de cette page, exploité par aucune personne
          morale (pas d&apos;entreprise, d&apos;auto-entreprise ni d&apos;association enregistrée).
          Ces mentions seront mises à jour si et quand une structure juridique est créée, avant
          toute commercialisation du service.
        </p>
      </section>

      <section>
        <h2>Hébergement</h2>
        <p>
          <strong>Application et site web :</strong> Vercel Inc., 340 S Lemon Ave #4133, Walnut,
          CA 91789, États-Unis —{" "}
          <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
            vercel.com
          </a>
          .
        </p>
        <p>
          <strong>Base de données et authentification :</strong> Supabase Inc. —{" "}
          <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">
            supabase.com
          </a>
          . Voir la{" "}
          <a href="/politique-de-confidentialite">politique de confidentialité</a> pour le détail
          des données hébergées.
        </p>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble des éléments du site Compyo (textes, identité visuelle, logo, structure,
          code) est la propriété de son éditeur, sauf mention contraire. Toute reproduction ou
          représentation, totale ou partielle, sans autorisation préalable, est interdite.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Pour toute question relative au site, au traitement de vos données ou à ces mentions
          légales : <a href="mailto:thfoinaxel@gmail.com">thfoinaxel@gmail.com</a>.
        </p>
      </section>
    </LayoutJuridique>
  );
}
