import type { Metadata } from "next";
import { LayoutJuridique } from "@/components/marketing/LayoutJuridique";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
};

export default function PolitiqueConfidentialitePage() {
  return (
    <LayoutJuridique titre="Politique de confidentialité" misAJour="10 août 2026">
      <section>
        <p>
          Compyo est un outil destiné aux artisans du bâtiment, actuellement en bêta privée
          gratuite. Cette page explique quelles données sont collectées, pourquoi, et comment les
          artisans utilisateurs et leurs clients peuvent exercer leurs droits, conformément au
          Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et
          Libertés.
        </p>
        <p>
          Le responsable du traitement est identifié dans les{" "}
          <a href="/mentions-legales">mentions légales</a>. Compyo n&apos;a pas de délégué à la
          protection des données (DPO) désigné : ce n&apos;est pas une obligation légale à
          l&apos;échelle actuelle du service, mais toute demande peut être adressée à{" "}
          <a href="mailto:thfoinaxel@gmail.com">thfoinaxel@gmail.com</a>.
        </p>
      </section>

      <section>
        <h2>Données collectées via le formulaire de candidature à la bêta</h2>
        <p>
          Pour candidater à l&apos;accès bêta (page &laquo;&nbsp;Demander un accès&nbsp;&raquo;) :
          nom, prénom, entreprise (facultatif), métier, téléphone, email, nombre d&apos;employés
          (facultatif), nombre de devis par semaine (facultatif), description du problème
          principal rencontré, et comment vous avez découvert Compyo (facultatif).
        </p>
        <p>
          Ces informations servent uniquement à évaluer et traiter votre candidature, et à vous
          contacter à ce sujet. Elles sont conservées le temps de l&apos;examen de la candidature,
          puis pendant la durée de la relation si elle est acceptée ; en cas de refus, elles
          peuvent être conservées un temps raisonnable pour garder une trace des échanges, puis
          supprimées sur simple demande.
        </p>
      </section>

      <section>
        <h2>Données traitées une fois artisan utilisateur de Compyo</h2>
        <p>
          Une fois un accès accordé, l&apos;artisan saisit et Compyo traite, pour son propre
          usage professionnel :
        </p>
        <ul>
          <li>Les informations de son profil (nom de l&apos;entreprise, coordonnées, paramètres de facturation).</li>
          <li>
            Les informations de ses clients et chantiers qu&apos;il choisit de renseigner (nom,
            téléphone, adresse, description du chantier), qu&apos;il saisisse ces informations
            manuellement, par dictée vocale, ou en important une capture d&apos;écran d&apos;une
            conversation (WhatsApp, SMS, etc.).
          </li>
          <li>Les devis générés, leurs montants et leur historique.</li>
          <li>Les photos de chantier qu&apos;il ajoute à un projet.</li>
        </ul>
        <p>
          <strong>Important :</strong> ce sont les clients de l&apos;artisan, pas Compyo, qui sont
          à l&apos;origine de ces données (via l&apos;artisan). L&apos;artisan reste responsable de
          n&apos;importer et de ne saisir que des informations qu&apos;il a le droit de traiter
          dans le cadre de son activité professionnelle.
        </p>
      </section>

      <section>
        <h2>Traitement par intelligence artificielle</h2>
        <p>
          Compyo utilise l&apos;API de la société Anthropic (modèles Claude) pour certaines
          fonctionnalités : analyse d&apos;un message client pour préremplir un projet, analyse
          d&apos;images (captures d&apos;écran de conversation, photos de chantier) pour en
          extraire des informations utiles, génération de la liste des postes d&apos;un devis, et
          résumé de fin de journée. Le contenu envoyé pour analyse (texte, notes vocales
          transcrites, images) transite par les serveurs d&apos;Anthropic pour être traité, sans
          être utilisé par Compyo à d&apos;autres fins que la fonctionnalité demandée par
          l&apos;artisan. L&apos;IA propose des informations ou des suggestions : c&apos;est
          toujours l&apos;artisan qui valide ou modifie avant tout enregistrement définitif.
        </p>
      </section>

      <section>
        <h2>Sous-traitants et hébergement</h2>
        <p>Les données sont hébergées et traitées par les prestataires suivants :</p>
        <ul>
          <li><strong>Vercel</strong> — hébergement de l&apos;application et du site (États-Unis).</li>
          <li><strong>Supabase</strong> — base de données, authentification et stockage des fichiers (photos, captures d&apos;écran).</li>
          <li><strong>Anthropic</strong> — traitement par intelligence artificielle (voir ci-dessus).</li>
          <li><strong>Resend</strong> — envoi des emails de notification (ex. nouvelle candidature à la bêta).</li>
        </ul>
        <p>
          Certains de ces prestataires sont situés aux États-Unis. Le lieu exact d&apos;hébergement
          des données au sein de Supabase dépend de la configuration de la région du projet ; cette
          page sera précisée dès que ce point est confirmé. Aucune donnée n&apos;est vendue à des
          tiers ni utilisée à des fins publicitaires.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          Compyo utilise uniquement des cookies strictement nécessaires au fonctionnement du
          service : ceux déposés par Supabase pour maintenir votre session connectée. Aucun cookie
          publicitaire ni de mesure d&apos;audience (Google Analytics ou équivalent) n&apos;est
          utilisé à ce jour.
        </p>
      </section>

      <section>
        <h2>Vos droits</h2>
        <p>
          Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification,
          d&apos;effacement, de limitation, d&apos;opposition et de portabilité sur les données
          vous concernant. Pour l&apos;exercer, écrivez à{" "}
          <a href="mailto:thfoinaxel@gmail.com">thfoinaxel@gmail.com</a> en précisant votre
          demande ; une réponse sera apportée dans un délai raisonnable. Vous disposez également du
          droit d&apos;introduire une réclamation auprès de la CNIL (
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
            cnil.fr
          </a>
          ).
        </p>
      </section>

      <section>
        <h2>Évolution de cette page</h2>
        <p>
          Compyo est un service en développement actif. Cette politique sera mise à jour à mesure
          que de nouvelles fonctionnalités sont ajoutées ou que la structure juridique du service
          évolue (passage à une entreprise, ouverture au public, etc.). La date de dernière mise à
          jour figure en haut de cette page.
        </p>
      </section>
    </LayoutJuridique>
  );
}
