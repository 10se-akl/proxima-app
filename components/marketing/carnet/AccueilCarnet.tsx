import Link from "next/link";
import { CompyoMark } from "@/components/marketing/CompyoMark";
import { AnimationsCarnet } from "./AnimationsCarnet";
import { EnteteActions } from "./EnteteActions";
import { VotesIdees, type Idee } from "./VotesIdees";
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
//     ajustez » : c'est ce que l'éditeur appelle « Prix Compyo ») ;
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

const IDEES: Idee[] = [
  {
    id: "assistant-telephone",
    titre: "Un assistant qui répond au téléphone pendant vos chantiers.",
    detail:
      " Avec vos mots : il dit au client quand vous rappelez et lui demande l’adresse ou une photo. Les urgences vous sonnent toujours, et vous pouvez le couper.",
  },
  {
    id: "anciens-devis",
    titre: "Vos anciens devis repris.",
    detail: " Une photo, un PDF ou un fichier Word : vos prix et vos postes habituels sont là dès le premier jour.",
  },
  {
    id: "avis-google",
    titre: "L’avis Google, demandé au bon moment.",
    detail: " En fin de chantier, seulement si vous le voulez, au client que vous choisissez.",
  },
];

const INSCRIPTION = "/demander-acces";

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
    <div id="accueil-carnet" className="carnet">
      <AnimationsCarnet racine="accueil-carnet" />

      <header className="entete">
        <div className="cadre entete-in">
          <Link href="/" className="logo" aria-label="Compyo, accueil">
            <span aria-hidden>
              <CompyoMark variante="couleur" taille={30} />
            </span>
            Compyo
          </Link>
          <EnteteActions inscription={INSCRIPTION} />
        </div>
      </header>

      <main id="contenu">
        {/* L'ouverture : comprendre Compyo en cinq secondes. */}
        <section className="hero" aria-labelledby="titre-accueil">
          <div className="cadre hero-grille">
            <div className="hero-texte">
              <p className="etiquette">Pour les artisans du bâtiment</p>
              <h1 id="titre-accueil">
                Sur le chantier, vos clients n’attendent <span className="trait">plus</span>.
              </h1>
              <p className="chapeau">
                Vous partagez le message d’un client à Compyo&nbsp;: il range la demande et vous prépare la réponse, le
                devis, la relance et la facture. Vous relisez, vous envoyez de votre téléphone&nbsp;: rien ne part sans vous.
              </p>
              <div className="actions">
                <Link className="btn btn-cordeau" href={INSCRIPTION}>
                  Rejoindre la bêta gratuite
                </Link>
                <a className="btn btn-ligne" href="#comment">
                  Voir comment
                </a>
              </div>
              <p className="hero-mention">Gratuit pendant la bêta, sans carte bancaire. On vous répond sous 48&nbsp;h.</p>
            </div>

            <figure className="hero-visuel">
              <div
                className="tel"
                data-anim="partage"
                data-boucle
                role="img"
                aria-label="Exemple inventé : depuis la conversation WhatsApp d’une cliente, l’artisan partage le message vers Compyo."
              >
                <div className="tel-ecran" aria-hidden="true">
                  <div className="tel-barre">
                    <span>8:04</span>
                    <span />
                  </div>
                  <div className="tel-app">
                    <div className="tel-tete">
                      <span className="tel-titre">Mme Garnier</span>
                      <span className="tel-sous">WhatsApp</span>
                    </div>
                    <div className="fil">
                      <div className="bulle">
                        Bonjour, fuite sous l’évier depuis hier soir. Vous pouvez passer&nbsp;? 12 rue des Lilas, Nantes.
                      </div>
                    </div>
                    <div className="voile" />
                    <div className="partage-feuille">
                      <b>Partager avec…</b>
                      <div className="partage-apps">
                        <span>
                          <i className="app-rond">✉</i>Messages
                        </span>
                        <span>
                          <i className="app-rond">@</i>E-mail
                        </span>
                        <span className="app-compyo touche">
                          <i className="app-rond">C</i>
                          <b>Compyo</b>
                        </span>
                        <span>
                          <i className="app-rond">⧉</i>Copier
                        </span>
                      </div>
                    </div>
                    <span className="doigt masque" />
                  </div>
                </div>
              </div>
              <figcaption className="legende">
                Sur Android&nbsp;: Partager → Compyo. Sur iPhone&nbsp;: une capture d’écran ou un copier-coller.
              </figcaption>
            </figure>
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
              Une journée, avec des exemples inventés.
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
                    <h3>Entre deux tâches, le client est prévenu.</h3>
                    <p>
                      Compyo prépare la réponse. Vous la relisez, puis vous l’envoyez par SMS ou WhatsApp, depuis votre
                      téléphone. Le client sait que vous avez lu son message.
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
                      Compyo propose les lignes et les quantités à partir de la demande et de vos notes&nbsp;: vous les
                      vérifiez. Les totaux suivent un calcul fixe&nbsp;; les prix viennent de vos tarifs, ou d’un tarif de
                      référence que vous ajustez. Vous validez.
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
                            <span>Dépose de l’ancienne faïence</span>
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

        {/* Ce qui ne bouge pas, et les questions qu'on nous pose. */}
        <section className="section section-papier" aria-labelledby="titre-regles">
          <div className="cadre">
            <h2 id="titre-regles" className="titre-section">
              Compyo prépare. Vous décidez. Toujours.
            </h2>
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
              <div>
                <dt>Où vont vos données&nbsp;?</dt>
                <dd>
                  La base de données est hébergée dans l’Union européenne (Suède). L’analyse par l’IA passe par Anthropic,
                  aux États-Unis. <Link href="/confiance">Le détail</Link>
                </dd>
              </div>
              <div>
                <dt>Et le prix&nbsp;?</dt>
                <dd>
                  Gratuit pendant la bêta, sans carte bancaire. Le prix sera annoncé avant la fin de la bêta&nbsp;: vous
                  déciderez à ce moment-là.
                </dd>
              </div>
              <div>
                <dt>Qui est derrière&nbsp;?</dt>
                <dd>
                  Un développeur indépendant, en France, qui construit Compyo pour les artisans et cherche ses premiers
                  testeurs.{" "}
                  <Link href="/a-propos">En savoir plus</Link>
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Les idées à venir, séparées de ce qui existe. */}
        <section className="section" aria-labelledby="titre-idees">
          <div className="cadre">
            <p className="etiquette">Pas encore dans Compyo</p>
            <h2 id="titre-idees" className="titre-section">
              Ces idées-là, c’est votre avis qui décide.
            </h2>
            <p className="chapeau" style={{ marginBottom: 28 }}>
              Ces trois idées n’existent pas encore. Tout le reste de cette page, si. Dites-nous si elles vous serviraient&nbsp;:
              un appui, sans nom ni e-mail.
            </p>
            <VotesIdees idees={IDEES} />
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
                Rejoindre la bêta gratuite
              </Link>
            </div>
            <p className="hero-mention">Gratuit pendant la bêta, sans carte bancaire. On vous répond sous 48&nbsp;h.</p>
          </div>
        </section>
      </main>

      <footer className="pied">
        <div className="cadre">
          <div className="pied-grille">
            <div className="pied-marque">
              <span className="logo" aria-hidden>
                <CompyoMark variante="couleur" taille={28} />
                Compyo
              </span>
              <p>Le secrétariat de l’artisan, dans sa poche. Bêta gratuite.</p>
            </div>
            <nav className="pied-liens" aria-label="Pages du site">
              <Link href="/comment-ca-fonctionne">Comment ça marche</Link>
              <Link href="/fonctionnalites">Fonctionnalités</Link>
              <Link href="/comparatif">Comparatif</Link>
              <Link href="/confiance">Sécurité et transparence</Link>
              <Link href="/a-propos">À propos</Link>
              <Link href="/questions-frequentes">Questions fréquentes</Link>
              <Link href="/metiers">Les métiers</Link>
              <Link href="/installer">Installer l’application</Link>
              <Link href="/contact">Contact</Link>
            </nav>
          </div>
          <div className="pied-bas">
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/politique-de-confidentialite">Confidentialité</Link>
            <Link href="/cgu">CGU</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
