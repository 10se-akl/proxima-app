"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  declencherInstallation,
  estDejaInstallee,
  estIOS,
  initialiserEcouteInstallation,
  installationDirectePossible,
} from "@/lib/pwa/installPrompt";
import {
  detecterPlateforme,
  detecterMoteurRestreint,
  installationBloqueeParAndroid,
  versionAndroid,
  type MoteurRestreint,
  type Plateforme,
} from "@/lib/pwa/plateforme";

// ============================================================
// Page d'installation (20/09) — une adresse fixe, /installer, qu'on peut
// envoyer par SMS à un artisan : "ouvre ce lien, appuie sur le bouton".
//
// Pourquoi une page entière alors qu'une carte existe déjà (InstallPWA) :
// cette carte ne se propose qu'au bout de 30 secondes, et UNE SEULE FOIS
// par navigateur, pour toujours. Un artisan qui l'a fermée une fois — ou
// qui n'a pas attendu — n'a plus jamais aucun moyen d'installer Compyo
// depuis le site vitrine. C'est précisément ce qui s'est passé pendant la
// bêta : "j'appuie, il n'y a rien". Ici, pas de minuteur, pas de règle
// "une seule fois" : la page dit toujours où on en est.
//
// Et quand l'installation n'est pas possible, elle ne se contente pas de
// le dire : le diagnostic en bas donne, en clair, ce que le navigateur
// répond vraiment (événement reçu ou non, service worker, manifest), avec
// un bouton pour le copier et nous l'envoyer. Sans ça, on en est réduit à
// deviner à distance ce que fait un téléphone qu'on n'a pas en main.
// ============================================================

type Etat = "chargement" | "deja-installee" | "prete" | "manuelle" | "reussie";

function nomNavigateur(moteur: MoteurRestreint, plateforme: Plateforme): string {
  if (moteur === "webview_app") return "navigateur intégré à une application";
  if (moteur === "firefox_android") return "Firefox";
  if (moteur === "samsung_internet") return "Samsung Internet";
  if (plateforme === "ios") return "Safari (iPhone/iPad)";
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "votre navigateur";
}

// Le chemin manuel, navigateur par navigateur. Toujours une manipulation
// concrète — jamais "l'installation n'est pas disponible".
function instructions(moteur: MoteurRestreint, plateforme: Plateforme): string[] {
  if (moteur === "webview_app") {
    return [
      "Cette page s'est ouverte dans l'application qui vous a envoyé le lien (WhatsApp, Instagram, Messenger…), pas dans votre navigateur.",
      "Appuyez sur ⋮ ou ••• en haut de l'écran, puis sur « Ouvrir dans le navigateur » (ou « Ouvrir dans Chrome »).",
      "Revenez ensuite sur cette page : le bouton d'installation apparaîtra.",
    ];
  }
  if (plateforme === "ios") {
    return [
      "Sur iPhone et iPad, l'installation passe obligatoirement par le menu de Safari — aucun site n'a le droit de la déclencher lui-même.",
      "Appuyez sur le bouton Partager (le carré avec une flèche vers le haut), en bas de l'écran.",
      "Faites défiler, puis appuyez sur « Sur l'écran d'accueil ».",
    ];
  }
  if (moteur === "firefox_android") {
    return [
      "Appuyez sur ⋮ en haut à droite de Firefox.",
      "Choisissez « Installer » (ou « Ajouter à l'écran d'accueil » selon la version).",
    ];
  }
  if (moteur === "samsung_internet") {
    // Android 14+ : inutile d'envoyer l'artisan dans le menu Samsung, il
    // se heurtera à « Appli non sécurisée et bloquée » (voir
    // installationBloqueeParAndroid). Le bouton « Ouvrir dans Chrome »
    // affiché au-dessus est le vrai chemin.
    if (installationBloqueeParAndroid()) {
      return [
        "Appuyez sur le bouton orange ci-dessus : cette même page s'ouvre dans Chrome.",
        "Dans Chrome, appuyez sur « Installer Compyo ». Cette fois, Android acceptera.",
        "Si le bouton ne fait rien, c'est que Chrome n'est pas installé sur ce téléphone : copiez l'adresse ci-dessous et ouvrez-la dans un autre navigateur.",
      ];
    }
    return [
      "Appuyez sur le menu de Samsung Internet : les trois traits ☰ en bas à droite (ou ⋮ en haut à droite selon la version).",
      "Choisissez « Ajouter une page à », puis « Écran d'accueil ».",
      "Si ça échoue, ouvrez plutôt cette page dans Chrome avec le bouton ci-dessus : l'installation s'y fait en un seul geste.",
    ];
  }
  if (plateforme === "desktop") {
    return [
      "Cherchez l'icône d'installation à droite de la barre d'adresse (un écran avec une flèche).",
      "Ou ouvrez le menu ⋮ du navigateur, puis « Installer Compyo ».",
    ];
  }
  return [
    "Ouvrez le menu de votre navigateur : ⋮ en haut à droite, ou ☰ en bas.",
    "Choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil ».",
    "Si cette ligne n'existe pas, c'est que ce navigateur ne sait pas installer d'application : ouvrez cette page dans Chrome.",
  ];
}

export function AssistantInstallation() {
  const [etat, setEtat] = useState<Etat>("chargement");
  const [plateforme, setPlateforme] = useState<Plateforme>("desktop");
  const [moteur, setMoteur] = useState<MoteurRestreint>(null);
  const [enCours, setEnCours] = useState(false);
  const [diagnostic, setDiagnostic] = useState<string[]>([]);
  const [copie, setCopie] = useState(false);
  const [adresseCopiee, setAdresseCopiee] = useState(false);
  const [bloqueParAndroid, setBloqueParAndroid] = useState(false);
  // Lien "intent" Android : ouvre CETTE page dans Chrome. Construit au
  // montage seulement (il dépend de location, absent côté serveur).
  const [lienChrome, setLienChrome] = useState<string | null>(null);

  const reevaluer = useCallback(() => {
    if (estDejaInstallee()) {
      setEtat("deja-installee");
      return;
    }
    // Samsung Internet sur Android 14+ : même quand l'événement existe,
    // Android refuse le paquet que ce navigateur fabrique. Proposer le
    // bouton serait envoyer l'artisan droit sur « Appli non sécurisée et
    // bloquée » — on l'envoie dans Chrome à la place.
    if (installationBloqueeParAndroid()) {
      setEtat("manuelle");
      return;
    }
    setEtat(installationDirectePossible() ? "prete" : "manuelle");
  }, []);

  useEffect(() => {
    initialiserEcouteInstallation();
    setPlateforme(detecterPlateforme());
    setMoteur(detecterMoteurRestreint());
    setBloqueParAndroid(installationBloqueeParAndroid());
    // "intent://" est la façon standard, sous Android, de demander
    // l'ouverture d'une adresse dans une application précise — ici
    // Chrome. Sans Chrome installé, le lien ne fait rien : d'où l'adresse
    // à copier, juste en dessous, qui elle marche partout.
    if (detecterPlateforme() === "android") {
      const { host, pathname, protocol } = window.location;
      setLienChrome(
        `intent://${host}${pathname}#Intent;scheme=${protocol.replace(":", "")};package=com.android.chrome;end`
      );
    }
    reevaluer();

    // L'événement d'installation peut arriver quelques instants après
    // l'affichage de la page : les instructions laissent alors la place
    // au bouton, sans rien recharger.
    window.addEventListener("compyo:install-prompt-pret", reevaluer);
    window.addEventListener("compyo:install-terminee", reevaluer);
    return () => {
      window.removeEventListener("compyo:install-prompt-pret", reevaluer);
      window.removeEventListener("compyo:install-terminee", reevaluer);
    };
  }, [reevaluer]);

  // Ce que le navigateur répond vraiment. Rassemblé une fois au montage,
  // puis rafraîchi à chaque ouverture du bloc.
  const releverDiagnostic = useCallback(async () => {
    const lignes: string[] = [];
    const ajouter = (cle: string, valeur: string) => lignes.push(`${cle} : ${valeur}`);

    ajouter("Page", window.location.href);
    ajouter("Connexion sécurisée (https)", window.isSecureContext ? "oui" : "NON — l'installation est impossible sans https");
    ajouter("Navigateur détecté", nomNavigateur(detecterMoteurRestreint(), detecterPlateforme()));
    ajouter("Plateforme", detecterPlateforme());
    ajouter("Événement d'installation reçu", installationDirectePossible() ? "OUI" : "non");
    ajouter("Déjà installée (mode application)", estDejaInstallee() ? "oui" : "non");
    const android = versionAndroid();
    if (android !== null) ajouter("Version d'Android", String(android));
    if (installationBloqueeParAndroid()) {
      ajouter("Blocage connu", "Samsung Internet + Android 14+ : Android refuse le paquet fabriqué par ce navigateur");
    }

    try {
      const reponse = await fetch("/manifest.webmanifest", { cache: "no-store" });
      const manifest = reponse.ok ? await reponse.json() : null;
      ajouter("Manifest", reponse.ok ? `trouvé (${manifest?.name ?? "sans nom"}, ${manifest?.display ?? "?"})` : `ERREUR ${reponse.status}`);
    } catch {
      ajouter("Manifest", "introuvable");
    }

    try {
      const enregistrement = await navigator.serviceWorker?.getRegistration();
      ajouter(
        "Service worker",
        enregistrement ? `actif (${enregistrement.active ? "en service" : "en cours d'installation"})` : "aucun"
      );
    } catch {
      ajouter("Service worker", "non supporté");
    }

    try {
      ajouter("Proposition auto déjà faite", window.localStorage.getItem("compyo-install-deja-propose-auto") === "1" ? "oui" : "non");
    } catch {
      ajouter("Proposition auto déjà faite", "stockage indisponible");
    }

    ajouter("Identité du navigateur", navigator.userAgent);
    setDiagnostic(lignes);
  }, []);

  useEffect(() => {
    void releverDiagnostic();
  }, [releverDiagnostic]);

  async function installer() {
    setEnCours(true);
    const resultat = await declencherInstallation();
    setEnCours(false);
    if (resultat === "accepted") {
      setEtat("reussie");
      return;
    }
    // Refusé ou indisponible : on repasse par l'évaluation normale, qui
    // affichera les instructions si l'événement a été consommé.
    reevaluer();
    void releverDiagnostic();
  }

  async function copierAdresse() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setAdresseCopiee(true);
      setTimeout(() => setAdresseCopiee(false), 2500);
    } catch {
      // Presse-papiers refusé : l'adresse reste lisible dans la barre du
      // navigateur, rien n'est perdu.
    }
  }

  async function copierDiagnostic() {
    const texte = diagnostic.join("\n");
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé, permission) : le
      // texte reste visible et sélectionnable juste au-dessus, rien n'est
      // perdu pour autant.
      setCopie(false);
    }
  }

  const etapes = instructions(moteur, plateforme);

  return (
    <div className="mx-auto max-w-xl px-5 sm:px-8">
      <div className="rounded-2xl border border-ink/10 bg-surface p-6 sm:p-8">
        {etat === "chargement" && (
          <p className="text-sm text-ink/50">Vérification de votre navigateur…</p>
        )}

        {etat === "reussie" && (
          <div>
            <p className="font-display text-xl font-semibold text-ink">C&apos;est installé.</p>
            <p className="mt-2 text-sm text-ink/60 leading-relaxed">
              Compyo est maintenant sur votre écran d&apos;accueil, avec vos autres applications.
              Ouvrez-le depuis son icône : plus de barre d&apos;adresse, plus de navigateur.
            </p>
          </div>
        )}

        {etat === "deja-installee" && (
          <div>
            <p className="font-display text-xl font-semibold text-ink">Compyo est déjà installé.</p>
            <p className="mt-2 text-sm text-ink/60 leading-relaxed">
              Vous lisez cette page depuis l&apos;application. Rien à faire de plus.
            </p>
          </div>
        )}

        {etat === "prete" && (
          <div>
            <p className="font-display text-xl font-semibold text-ink">
              {plateforme === "desktop" ? "Installer Compyo sur cet ordinateur" : "Installer Compyo sur ce téléphone"}
            </p>
            <p className="mt-2 text-sm text-ink/60 leading-relaxed">
              {plateforme === "desktop"
                ? "Compyo s'ouvrira dans sa propre fenêtre, depuis votre bureau ou votre barre des tâches."
                : "Compyo s'ajoute à votre écran d'accueil, comme une vraie application : un appui et c'est ouvert, même avec une mauvaise connexion."}
            </p>
            <Button onClick={installer} loading={enCours} className="mt-6 w-full sm:w-auto">
              {enCours ? "Installation…" : "Installer Compyo"}
            </Button>
            <p className="mt-3 text-xs text-ink/45">
              Votre navigateur vous demandera de confirmer. Rien ne s&apos;installe sans votre accord.
            </p>
          </div>
        )}

        {etat === "manuelle" && (
          <div>
            <p className="font-display text-xl font-semibold text-ink">
              {bloqueParAndroid
                ? "Samsung Internet ne peut pas installer Compyo"
                : `Installer Compyo avec ${nomNavigateur(moteur, plateforme)}`}
            </p>
            <p className="mt-2 text-sm text-ink/60 leading-relaxed">
              {bloqueParAndroid ? (
                <>
                  Si vous avez vu « Appli non sécurisée et bloquée », ce n&apos;est pas Compyo :
                  quand Samsung Internet installe une application web, il fabrique un paquet Android
                  périmé, et Android {versionAndroid() ?? 14} le refuse. Chrome, lui, en fabrique un
                  à jour — la même page s&apos;y installe sans rien bloquer.
                </>
              ) : (
                <>
                  Ce navigateur ne permet pas à un site de lancer l&apos;installation lui-même. Elle
                  se fait depuis son propre menu, en deux gestes :
                </>
              )}
            </p>

            {/* Le vrai chemin de sortie, avant les explications : un
                bouton qui rouvre cette page dans Chrome. */}
            {lienChrome && (moteur === "samsung_internet" || bloqueParAndroid) && (
              <a
                href={lienChrome}
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-signal px-5 py-3 text-sm font-medium text-white transition-all hover:scale-[1.02] hover:bg-signal-fonce active:scale-[0.98] sm:w-auto"
              >
                Ouvrir cette page dans Chrome
              </a>
            )}

            <ol className="mt-5 flex flex-col gap-3">
              {etapes.map((etape, i) => (
                <li key={i} className="flex gap-3 text-sm text-ink/75 leading-relaxed">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-signal/10 text-xs font-semibold text-signal">
                    {i + 1}
                  </span>
                  {etape}
                </li>
              ))}
            </ol>

            {/* Marche partout, même sans Chrome : l'adresse, à coller
                soi-même dans un autre navigateur. */}
            {plateforme === "android" && (
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-4">
                <Button variant="ghost" onClick={copierAdresse} className="px-4 py-2 text-xs">
                  {adresseCopiee ? "Adresse copiée" : "Copier l'adresse de la page"}
                </Button>
                {/* Certaines versions de Samsung Internet installent quand
                    même : on ne ferme pas la porte à celles-là. */}
                {bloqueParAndroid && installationDirectePossible() && (
                  <button
                    type="button"
                    onClick={installer}
                    disabled={enCours}
                    className="text-xs text-ink/45 underline underline-offset-2 hover:text-ink disabled:opacity-50"
                  >
                    {enCours ? "Installation…" : "Essayer quand même depuis ce navigateur"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Le diagnostic : visible par tous, mais replié. Ce n'est pas de la
          décoration — c'est ce qu'on demande à un bêta-testeur de copier
          quand "ça ne marche pas", plutôt que de deviner à distance. */}
      <details className="mt-4 rounded-2xl border border-ink/10 bg-surface/60 px-5 py-4">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-ink/70 hover:text-ink">
          Ça ne marche pas ? Ouvrez le diagnostic
        </summary>
        <p className="mt-3 text-xs text-ink/55 leading-relaxed">
          Voici ce que répond votre navigateur. Copiez ces lignes et envoyez-les-nous : elles disent
          exactement ce qui bloque.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-ink/5 p-3 font-mono text-[11px] leading-relaxed text-ink/70">
          {diagnostic.length ? diagnostic.join("\n") : "Relevé en cours…"}
        </pre>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={copierDiagnostic} className="px-4 py-2 text-xs">
            {copie ? "Copié" : "Copier le diagnostic"}
          </Button>
          <a
            href="mailto:proxima.saas@gmail.com?subject=Installation%20Compyo"
            className="inline-flex min-h-11 items-center text-xs text-ink/50 underline hover:text-ink"
          >
            Nous l&apos;envoyer par mail
          </a>
        </div>
      </details>
    </div>
  );
}
