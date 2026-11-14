import Link from "next/link";
import { AnimationsCarnet } from "./AnimationsCarnet";
import { VotesIdees } from "./VotesIdees";
import { IDEES_VOTEES } from "@/lib/ideesVotees";
import { Header, Footer } from "@/components/marketing/Cadre";
import "./carnet.css";

// ============================================================
// L'accueil « carnet de chantier » (01/11/2026).
//
// Le look : la vitrine expérience du 11/10 (papier quadrillé, cordeau,
// crayon), préférée 7 fois sur 8 et lue 2 fois mieux au soleil que
// l'ancien accueil sombre. Le texte : la page courte « vos clients
// n'attendent plus », préférée pour son texte 8 fois sur 8. Tests et
// chiffres : compyo/test-accueil-01-11/RESULTATS.md (hors dépôt).
//
// Ce que les panels ont demandé, et qui est ici :
//   - dire tout de suite « devis, relances, factures » et « rien ne part
//     sans vous » (la peur du robot qui répond aux clients) ;
//   - les métiers sous le titre, des exemples de plusieurs métiers ;
//   - les appels manqués parmi les problèmes ;
//   - une page courte (environ 8 écrans de téléphone, pas 16) ;
//   - pas de promesse « plus rien à faire » ;
//   - l'honnêteté sur les prix (« ou un tarif de référence que vous
//     ajustez » : c'est ce que l'éditeur appelle « Prix de référence ») ;
//   - les idées à venir clairement séparées de ce qui existe, en votes
//     d'un appui ;
//   - pas d'adresse Gmail en vue : la page Contact.
// Les écrans de téléphone sont des exemples inventés, dessinés en HTML.
// ============================================================

const METIERS: Array<[string, string]> = [
  ["plaquiste", "Plaquiste"],
  ["plombier", "Plombier"],
  ["electricien", "Électricien"],
  ["carreleur", "Carreleur"],
  ["macon", "Maçon"],
  ["couvreur", "Couvreur"],
  ["peintre", "Peintre"],
  ["menuisier", "Menuisier"],
  ["chauffagiste", "Chauffagiste"],
];

// Les idées soumises au vote : lib/ideesVotees.ts (partagées avec la route
// des résultats).

const INSCRIPTION = "/demander-acces";

// Les vraies captures de l'application (public/guide/, version téléphone
// claire). À garder en phase avec le Guide : ce sont les mêmes fichiers.
const CAPTURES = [
  {
    src: "/guide/journee-maintenant-telephone-clair.webp",
    alt: "Capture de Compyo, écran Aujourd’hui : le rendez-vous en cours, l’argent à encaisser et les tâches du jour.",
    titre: "Aujourd’hui",
    texte: "Le rendez-vous en cours, ce qui reste à encaisser, la journée.",
  },
  {
    src: "/guide/nouveau-choix-telephone-clair.webp",
    alt: "Capture de Compyo, nouveau projet : coller un message, envoyer une photo ou une capture, ou écrire soi-même.",
    titre: "Nouveau projet",
    texte: "Un message collé, une capture d’écran, ou quelques mots.",
  },
  {
    src: "/guide/planning-semaine-telephone-clair.webp",
    alt: "Capture de Compyo, planning de la semaine : les chantiers jour par jour, une alerte météo et le bouton Prévenir le client.",
    titre: "Planning",
    texte: "La semaine, la météo des chantiers dehors, « Prévenir le client ».",
  },
];

function Horloge({ h, m }: { h: number; m: number }) {
  // Les angles des aiguilles pour l'heure écrite à côté.
  const angleH = (h % 12) * 30 + m * 0.5;
  const angleM = m * 6;
  return (
    <svg
      className="horloge"
      viewBox="0 0 42 42"
      style={{ ["--h" as string]: `${angleH}deg`, ["--m" as string]: `${angleM}deg` }}
      aria-hidden="true"
    >
      <circle cx="21" cy="21" r="19" />
      <line className="aiguille h" x1="21" y1="21" x2="21" y2="11" />
      <line className="aiguille min" x1="21" y1="21" x2="21" y2="6" />
    </svg>
  );
}

function Coche() {
  return (
    <svg className="coche" viewBox="0 0 34 34" aria-hidden="true">
      <path d="M5 18l8 8L29 8" />
    </svg>
  );
}

export function AccueilCarnet() {
  return (
    <>
      {/* 02/11/2026 — l'en-tête et le pied de page de tout le site (Cadre.tsx) :
          la navigation vers les autres pages, le thème, « Mon espace ». */}
      <Header />
      <div id="accueil-carnet" className="carnet">
        <AnimationsCarnet racine="accueil-carnet" />

      <main id="contenu">
        {/* 12/11/2026 — L'ouverture refaite pour le premier coup d'œil : un
            vrai artisan (photo libre Pexels, déjà utilisée dans la pub, licence
            commerciale sans attribution : pexels.com/fr-fr/license), et par-dessus
            ce que Compyo lui prépare. Sur téléphone, la photo remplit l'écran et
            le texte se pose dessus ; sur ordinateur, texte à gauche, photo à
            droite. Le message, le devis de 387,20 € et Mme Garnier sont les mêmes
            exemples inventés que le film et la journée. La photo n'est qu'une
            illustration : la personne ne recommande pas Compyo (condition de la
            licence), d'où la mention sous la photo. */}
        <section className="hero2" aria-labelledby="titre-accueil">
          <figure className="hero2-photo">
            <picture>
              <source media="(max-width: 899px)" srcSet="/accueil/artisan-camion.webp" />
              <img
                src="/accueil/artisan-camion.webp"
                alt="Un artisan remplit un papier dans son utilitaire, entre deux chantiers."
                width={830}
                height={1107}
                fetchPriority="high"
              />
            </picture>
            <div className="hero2-cartes" aria-hidden="true">
              <div className="carte-flottante carte-client">
                <span className="cf-tete">
                  <i className="cf-rond">G</i>
                  Mme Garnier · WhatsApp
                </span>
                <span className="cf-texte">Fuite sous l’évier depuis hier soir. Vous pouvez passer&nbsp;?</span>
              </div>
              <div className="carte-flottante carte-compyo">
                <span className="cf-tete">
                  <i className="cf-rond cf-compyo">C</i>
                  Compyo · prêt à relire
                </span>
                <span className="cf-ligne">
                  <Coche /> Réponse à Mme Garnier
                </span>
                <span className="cf-ligne">
                  <Coche /> Devis fuite évier · 387,20&nbsp;€
                </span>
                <span className="cf-bouton">Relire et envoyer</span>
              </div>
            </div>
            <figcaption className="hero2-credit">Photo d’illustration · exemples inventés</figcaption>
          </figure>
          <div className="cadre hero2-texte">
            <p className="etiquette">Pour les artisans du bâtiment</p>
            <h1 id="titre-accueil">
              Sur le chantier, vos clients n’attendent <span className="trait">plus</span>.
            </h1>
            <p className="chapeau">
              Compyo prépare la réponse, le devis et la facture. Vous relisez, vous envoyez&nbsp;: rien ne part sans
              vous.
            </p>
            <div className="actions">
              <Link className="btn btn-cordeau btn-hero" href={INSCRIPTION}>
                Essayer gratuitement
              </Link>
              <a className="btn btn-ligne btn-voir" href="#comment">
                Voir comment
              </a>
            </div>
            <ul className="garanties">
              <li>
                <Coche />
                Gratuit pendant la bêta
              </li>
              <li>
                <Coche />
                Sans carte bancaire
              </li>
              <li>
                <Coche />
                Sur Android et iPhone
              </li>
            </ul>
          </div>
        </section>

        {/* Les métiers, tout de suite : « c'est pour moi ». */}
        <section className="bande-metiers" aria-label="Les métiers">
          <div className="cadre">
            <p>Pour les artisans du bâtiment, seuls ou en petite équipe&nbsp;:</p>
            <div className="puces-metiers">
              {METIERS.map(([slug, nom]) => (
                <Link key={slug} href={`/metiers/${slug}`} className="puce-metier">
                  {nom}
                </Link>
              ))}
              <Link href="/metiers" className="puce-metier tous">
                Tous les métiers
              </Link>
            </div>
          </div>
        </section>

        {/* Le problème. */}
        <section className="section section-papier" aria-labelledby="titre-probleme">
          <div className="cadre">
            <p className="etiquette">Le problème</p>
            <h2 id="titre-probleme" className="titre-section">
              Un client sans réponse, c’est un chantier qui part ailleurs.
            </h2>
            {/* 12/11 — la même pub (Pexels, licence commerciale) : le soir, le
                carnet et le téléphone. Illustration seulement. */}
            <figure className="photo-soir">
              <img
                src="/accueil/soir-carnet.webp"
                alt="Le soir, sur une table : un carnet de chantier, un stylo et un téléphone."
                width={810}
                height={960}
                loading="lazy"
                decoding="async"
              />
              <figcaption>
                <span className="photo-soir-heure">18 h 45.</span> Il reste un devis à faire.
              </figcaption>
            </figure>
            <ul className="problemes">
              <li className="probleme">
                <span className="num-main" aria-hidden="true">1</span>
                <p>
                  <b>Les demandes sont partout.</b>
                  <span>WhatsApp, SMS, appels manqués, photos sans un mot. Une adresse se perd, un client attend.</span>
                </p>
              </li>
              <li className="probleme">
                <span className="num-main" aria-hidden="true">2</span>
                <p>
                  <b>Vous répondez trop tard.</b>
                  <span>Sur un toit ou sous un évier, on ne répond pas. Le soir, on a oublié qui rappeler.</span>
                </p>
              </li>
              <li className="probleme">
                <span className="num-main" aria-hidden="true">3</span>
                <p>
                  <b>Et tout finit le soir.</b>
                  <span>Les devis à taper, les relances qu’on n’ose pas envoyer, les factures en retard.</span>
                </p>
              </li>
            </ul>
            <p className="chiffre">
              <strong>77&nbsp;%</strong> des chefs d’entreprise artisanale disent que leur activité empiète sur leur vie privée
              (baromètre ARTISANTÉ, CAPEB 2024-2025).
            </p>
          </div>
        </section>

        {/* Comment Compyo le règle : une journée, l'heure dans la marge. */}
        <section className="section" id="comment" aria-labelledby="titre-comment">
          <div className="cadre">
            <p className="etiquette">Comment Compyo le règle</p>
            <h2 id="titre-comment" className="titre-section">
              Vous partagez. Compyo prépare. Vous envoyez.
            </h2>
            <p className="chapeau" style={{ marginBottom: "clamp(28px,5vw,48px)" }}>
              Trois moments d’une journée. Les exemples sont inventés.
            </p>
          </div>
          <ol className="moments">

            <li className="moment">
              <div className="cadre moment-grille">
                <p className="moment-heure">
                  <Horloge h={10} m={40} />
                  <span>10 h 40</span>
                </p>
                <div className="moment-corps">
                  <div className="moment-texte">
                    <h3>Un message arrive. La réponse est prête.</h3>
                    <p>
                      Vous partagez le message du client à Compyo. Il range la demande et prépare la réponse. Vous la
                      relisez, vous l’envoyez par SMS ou WhatsApp, depuis votre téléphone.
                    </p>
                  </div>
                  <div
                    className="tel"
                    data-anim="envoi"
                    role="img"
                    aria-label="Exemple inventé : une réponse prête pour le client, que l’artisan envoie lui-même en appuyant sur Envoyer."
                  >
                    <div className="tel-ecran" aria-hidden="true">
                      <div className="tel-barre">
                        <span>10:42</span>
                        <span />
                      </div>
                      <div className="tel-app">
                        <div className="tel-tete">
                          <span className="tel-titre">M. Le Goff</span>
                          <span className="tel-sous">SMS</span>
                        </div>
                        <div className="fil">
                          <div className="bulle">Bonjour, une tuile s’est envolée cette nuit, il pleut dans le grenier. Vous pouvez passer&nbsp;?</div>
                          <div className="bulle moi message-pret envoye">
                            Bonjour, bien reçu votre message. Je suis sur un chantier, je vous rappelle ce soir.
                            <small className="etat-message">Envoyé de votre téléphone · 10:42</small>
                          </div>
                        </div>
                        <div className="tel-boutons">
                          <span className="tel-bouton">Modifier</span>
                          <span className="tel-bouton fort">Envoyer par SMS</span>
                        </div>
                        <div className="toast masque">Parti depuis vos SMS</div>
                        <span className="doigt masque" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>

            <li className="moment">
              <div className="cadre moment-grille">
                <p className="moment-heure">
                  <Horloge h={12} m={30} />
                  <span>12 h 30</span>
                </p>
                <div className="moment-corps">
                  <div className="moment-texte">
                    <h3>Le devis se prépare. Les prix, c’est vous.</h3>
                    <p>
                      Compyo propose les lignes et les quantités&nbsp;: vous les vérifiez. Les prix viennent de vos tarifs,
                      ou d’un tarif de référence que vous ajustez. Les totaux suivent un calcul fixe.
                    </p>
                  </div>
                  <div
                    className="tel"
                    data-anim="devis"
                    role="img"
                    aria-label="Exemple inventé : un devis de salle de bain dont les prix sont saisis, puis validé par l’artisan."
                  >
                    <div className="tel-ecran" aria-hidden="true">
                      <div className="tel-barre">
                        <span>12:31</span>
                        <span />
                      </div>
                      <div className="tel-app">
                        <div className="tel-tete">
                          <span className="tel-titre">Devis · salle de bain</span>
                          <span className="pastille">Préparé par Compyo</span>
                        </div>
                        <p className="tel-sous">Mme Roux · 4 rue des Tilleuls</p>
                        <div className="devis" data-taux="0.10">
                          <div className="devis-ligne">
                            <span>Dépose de la faïence</span>
                            <span className="qte">1</span>
                            <span className="prix" data-v="240">240,00&nbsp;€</span>
                          </div>
                          <div className="devis-ligne">
                            <span>Faïence 30×60 posée</span>
                            <span className="qte">9&nbsp;m²</span>
                            <span className="prix" data-v="558">558,00&nbsp;€</span>
                          </div>
                          <div className="devis-ligne">
                            <span>Joints et finitions</span>
                            <span className="qte">1</span>
                            <span className="prix" data-v="95">95,00&nbsp;€</span>
                          </div>
                          <div className="devis-total">
                            <div>
                              <span>Total HT</span>
                              <span data-total="ht">893,00&nbsp;€</span>
                            </div>
                            <div>
                              <span>TVA 10&nbsp;% (choisie par vous)</span>
                              <span data-total="tva">89,30&nbsp;€</span>
                            </div>
                            <div className="ttc">
                              <span>Total TTC</span>
                              <span data-total="ttc">982,30&nbsp;€</span>
                            </div>
                          </div>
                        </div>
                        <p className="devis-note">Totaux&nbsp;: calcul fixe. Prix&nbsp;: les vôtres.</p>
                        <span className="tampon">Validé par vous</span>
                        <div className="tel-boutons">
                          <span className="tel-bouton">Modifier</span>
                          <span className="tel-bouton fort">Valider</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>

            <li className="moment">
              <div className="cadre moment-grille">
                <p className="moment-heure">
                  <Horloge h={18} m={30} />
                  <span>18 h 30</span>
                </p>
                <div className="moment-corps">
                  <div className="moment-texte">
                    <h3>Le soir, tout est prêt à relire.</h3>
                    <p>
                      La relance du devis sans réponse, la facture d’acompte, le rendez-vous de demain&nbsp;: préparés. Vous
                      relisez, vous appuyez. Rien ne part tout seul.
                    </p>
                  </div>
                  <div
                    className="tel"
                    data-anim="soir"
                    role="img"
                    aria-label="Exemple inventé : trois choses prêtes à relire le soir, une relance, une facture d’acompte et le rendez-vous du lendemain."
                  >
                    <div className="tel-ecran" aria-hidden="true">
                      <div className="tel-barre">
                        <span>18:34</span>
                        <span />
                      </div>
                      <div className="tel-app">
                        <div className="tel-tete">
                          <span className="tel-titre">À relire</span>
                          <span className="pastille">3 prêts</span>
                        </div>
                        <div className="a-relire">
                          <span className="rond">R</span>
                          <p>
                            Relance prête · devis de M. Petit
                            <small>Sans réponse depuis 5 jours</small>
                          </p>
                        </div>
                        <div className="a-relire">
                          <span className="rond">F</span>
                          <p>
                            Facture d’acompte · Mme Roux
                            <small>30&nbsp;% à la signature, prête à envoyer</small>
                          </p>
                        </div>
                        <div className="a-relire">
                          <span className="rond">8</span>
                          <p>
                            Demain, 8 h · M. Le Goff
                            <small>Tuiles à remplacer · le client est prévenu</small>
                          </p>
                        </div>
                        <div className="tel-boutons">
                          <span className="tel-bouton">Plus tard</span>
                          <span className="tel-bouton fort">Relire</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          </ol>
        </section>

        {/* 14/11/2026 — La preuve : de vraies captures de l'application
            d'aujourd'hui (celles du Guide, public/guide/, refaites à chaque
            changement de design), pas des écrans dessinés. Données de
            démonstration. Sur téléphone, la rangée défile au doigt et la
            capture suivante dépasse pour le montrer. */}
        <section className="section section-papier" aria-labelledby="titre-vrai">
          <div className="cadre">
            <p className="etiquette">En vrai</p>
            <h2 id="titre-vrai" className="titre-section">
              Ce n’est pas une maquette. C’est l’application.
            </h2>
            <p className="chapeau" style={{ marginBottom: "clamp(24px,4vw,40px)" }}>
              Trois écrans tels qu’ils sont aujourd’hui, avec des données de démonstration.
            </p>
          </div>
          <ul className="captures" aria-label="Captures de l’application">
            {CAPTURES.map((c) => (
              <li key={c.src} className="capture">
                <figure>
                  <div className="capture-cadre">
                    <img src={c.src} alt={c.alt} width={780} height={1688} loading="lazy" decoding="async" />
                  </div>
                  <figcaption>
                    <b>{c.titre}</b>
                    <span>{c.texte}</span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </section>

        {/* Ce qui ne bouge pas, et les questions qu'on nous pose. */}
        <section className="section" aria-labelledby="titre-regles">
          <div className="cadre">
            <h2 id="titre-regles" className="titre-section">
              Compyo prépare. Vous décidez. Toujours.
            </h2>
            {/* 14/11/2026 — les deux promesses restent écrites en grand ; les
                questions s'ouvrent au doigt (une page plus courte, et chacun
                lit ce qui l'inquiète). <details> : fonctionne sans script. */}
            <dl className="regles">
              <div>
                <dt>Aucun prix inventé.</dt>
                <dd>
                  L’IA ne fixe aucun prix. Les montants viennent de vos tarifs, ou d’un tarif de référence que vous ajustez
                  avant d’envoyer.
                </dd>
              </div>
              <div>
                <dt>Rien ne part sans votre geste.</dt>
                <dd>Compyo prépare le message. Vous l’envoyez vous-même, depuis votre téléphone.</dd>
              </div>
            </dl>
            <div className="questions">
              <details>
                <summary>Et le prix&nbsp;?</summary>
                <p>
                  Gratuit pendant la bêta (20 places), sans carte bancaire. Le prix sera annoncé avant la fin de la
                  bêta&nbsp;: vous déciderez à ce moment-là.
                </p>
              </details>
              <details>
                <summary>Et sur iPhone&nbsp;?</summary>
                <p>
                  Compyo marche sur Android, sur iPhone et sur ordinateur. Sur Android, vous partagez un message
                  directement à Compyo. Sur iPhone, pour l’instant&nbsp;: une capture d’écran ou un copier-coller.
                </p>
              </details>
              <details>
                <summary>Où vont mes données&nbsp;?</summary>
                <p>
                  La base de données est hébergée dans l’Union européenne (Suède). L’analyse par l’IA passe par Anthropic,
                  aux États-Unis. <Link href="/confiance">Le détail</Link>
                </p>
              </details>
              <details>
                <summary>Qui est derrière&nbsp;?</summary>
                <p>
                  Un développeur indépendant, en France, qui construit Compyo pour les artisans et cherche ses premiers
                  testeurs. <Link href="/a-propos">En savoir plus</Link>
                </p>
              </details>
              {/* 02/11/2026 (Axel) — dit au conditionnel : ce n'est pas une promesse. */}
              <details>
                <summary>Une vraie application dans les magasins&nbsp;?</summary>
                <p>
                  Aujourd’hui, Compyo s’installe depuis le navigateur, sur Android comme sur iPhone. Si la bêta prend,
                  une application arrivera dans les magasins, avec le partage direct sur iPhone aussi.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* Les idées à venir, séparées de ce qui existe. */}
        <section className="section section-papier" aria-labelledby="titre-idees">
          <div className="cadre">
            <p className="etiquette">Pas encore dans Compyo</p>
            <h2 id="titre-idees" className="titre-section">
              Ces idées-là, c’est votre avis qui décide.
            </h2>
            <p className="chapeau" style={{ marginBottom: 28 }}>
              Ces trois idées n’existent pas encore. Tout le reste de cette page, si. Dites-nous si elles vous serviraient&nbsp;:
              un appui, sans nom ni e-mail.
            </p>
            <VotesIdees idees={IDEES_VOTEES} />
          </div>
        </section>

        {/* Le soir : la nuit tombe. */}
        <section className="finale" aria-labelledby="titre-finale">
          <div className="finale-ciel" aria-hidden="true" />
          <div className="lune" aria-hidden="true" />
          <div className="cadre finale-in">
            <p className="moment-heure">
              <Horloge h={20} m={30} />
              <span>20 h 30</span>
            </p>
            <h2 id="titre-finale">
              Le soir,
              <br />
              <span className="trait trait-nuit">tout est prêt.</span>
            </h2>
            <ul className="coches">
              <li style={{ ["--i" as string]: 0 }}>
                <Coche />
                <span>Les demandes partagées sont rangées.</span>
              </li>
              <li style={{ ["--i" as string]: 1 }}>
                <Coche />
                <span>Les clients ont eu une réponse, envoyée par vous.</span>
              </li>
              <li style={{ ["--i" as string]: 2 }}>
                <Coche />
                <span>Devis, relances et factures attendent votre feu vert.</span>
              </li>
            </ul>
            <div className="actions">
              <Link className="btn btn-lune" href={INSCRIPTION}>
                Essayer gratuitement
              </Link>
            </div>
            <p className="hero-mention">Gratuit pendant la bêta, sans carte bancaire. Votre espace s’ouvre tout de suite.</p>
          </div>
        </section>
      </main>

      </div>
      <Footer />
    </>
  );
}
