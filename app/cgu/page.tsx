import type { Metadata } from "next";
import { metaPage } from "@/lib/seo";
import { LayoutJuridique } from "@/components/marketing/LayoutJuridique";

// 25/09 — metaPage : adresse canonique et aperçu de partage propres à
// la page (avant, ils étaient hérités de l'accueil). Voir lib/seo.ts.
export const metadata: Metadata = metaPage({
  titre: "Conditions générales d'utilisation",
  description:
    "Conditions d'utilisation de Compyo : accès en bêta privée, rôle de l'IA, responsabilités de l'artisan et de l'éditeur.",
  chemin: "/cgu",
});

export default function CguPage() {
  return (
    <LayoutJuridique
      titre="Conditions générales d'utilisation"
      misAJour="10 août 2026"
    >
      <section>
        <h2>1. Objet et champ d&apos;application</h2>
        <p>
          Les présentes conditions générales d&apos;utilisation (CGU) régissent l&apos;accès et
          l&apos;utilisation de Compyo, un outil destiné à aider les artisans du bâtiment à
          organiser leurs chantiers, clients et devis. Compyo est actuellement proposé en{" "}
          <strong>bêta privée, gratuite, sur invitation</strong>. L&apos;utilisation du service
          implique l&apos;acceptation pleine et entière des présentes CGU.
        </p>
      </section>

      <section>
        <h2>2. Accès au service</h2>
        <p>
          L&apos;accès à Compyo se fait sur candidature, examinée manuellement. L&apos;éditeur se
          réserve le droit d&apos;accepter, de refuser ou de retirer un accès à tout moment,
          notamment en cas d&apos;utilisation non conforme à ces CGU, sans que cela ouvre droit à
          une quelconque indemnité, le service étant gratuit et fourni à titre de bêta-test.
        </p>
      </section>

      <section>
        <h2>3. Nature bêta du service</h2>
        <p>
          Compyo est un service en développement actif. À ce titre :
        </p>
        <ul>
          <li>Des fonctionnalités peuvent être ajoutées, modifiées ou retirées sans préavis.</li>
          <li>Des interruptions, bugs ou pertes de données ponctuelles sont possibles.</li>
          <li>
            Aucune garantie de disponibilité, de performance ou d&apos;exactitude n&apos;est
            apportée pendant cette phase de bêta.
          </li>
        </ul>
        <p>
          Il est recommandé à chaque artisan utilisateur de conserver, de son côté, une copie des
          informations essentielles (devis envoyés, coordonnées clients) tant que le service est
          en bêta.
        </p>
      </section>

      <section>
        <h2>4. Utilisation des fonctionnalités d&apos;intelligence artificielle</h2>
        <p>
          Certaines fonctionnalités de Compyo (analyse de messages, analyse de captures
          d&apos;écran ou de photos, génération de devis, résumé de fin de journée) reposent sur de
          l&apos;intelligence artificielle. Ces fonctionnalités proposent des suggestions ou des
          extractions d&apos;information à partir de ce que l&apos;artisan fournit : elles peuvent
          contenir des erreurs, des omissions ou des approximations. L&apos;IA ne calcule jamais de
          prix elle-même — les montants d&apos;un devis sont toujours calculés par un moteur
          déterministe distinct, à partir des paramètres propres à chaque artisan.
        </p>
        <p>
          <strong>
            L&apos;artisan reste seul responsable de la vérification et de la validation de toute
            information générée ou suggérée par l&apos;IA avant de l&apos;utiliser, notamment avant
            d&apos;envoyer un devis à un client.
          </strong>{" "}
          Compyo ne saurait être tenu responsable d&apos;une erreur contenue dans un document
          transmis à un tiers sans vérification préalable par l&apos;artisan.
        </p>
      </section>

      <section>
        <h2>5. Contenu et responsabilité de l&apos;artisan</h2>
        <p>
          L&apos;artisan est seul responsable des données qu&apos;il saisit ou importe dans Compyo
          (coordonnées de ses clients, descriptions de chantiers, captures d&apos;écran de
          conversations, photos). Il s&apos;engage à n&apos;utiliser Compyo que dans le cadre de
          son activité professionnelle légitime, et à ne pas y importer de données qu&apos;il
          n&apos;a pas le droit de traiter.
        </p>
      </section>

      <section>
        <h2>6. Propriété intellectuelle</h2>
        <p>
          Compyo (marque, logo, code, structure du site) reste la propriété de son éditeur.
          L&apos;artisan reste propriétaire des données qu&apos;il saisit dans l&apos;outil
          (informations clients, devis, chantiers).
        </p>
      </section>

      <section>
        <h2>7. Données personnelles</h2>
        <p>
          Le traitement des données personnelles est détaillé dans la{" "}
          <a href="/politique-de-confidentialite">politique de confidentialité</a>.
        </p>
      </section>

      <section>
        <h2>8. Modification des CGU</h2>
        <p>
          Ces CGU peuvent être modifiées à mesure que Compyo évolue, notamment lors du passage
          d&apos;une version bêta gratuite à une offre commerciale. La date de dernière mise à jour
          figure en haut de cette page. En cas de changement important, les artisans utilisateurs
          en seront informés par email.
        </p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>
          Pour toute question relative à ces conditions :{" "}
          <a href="mailto:thfoinaxel@gmail.com">thfoinaxel@gmail.com</a>.
        </p>
      </section>
    </LayoutJuridique>
  );
}
