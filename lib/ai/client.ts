// Appelle l'API Claude. À importer UNIQUEMENT depuis app/api/* (Route Handlers),
// jamais depuis un composant "use client" — la clé API ne doit jamais
// atteindre le navigateur.
//
// ============================================================
// Cycle "Release Candidate" 1 (26/08) : robustesse IA avant l'activation de
// la clé API payante. Avant cette réécriture, un simple ralentissement ou
// incident ponctuel côté Anthropic (429/5xx, latence anormale, coupure
// réseau) remontait tel quel jusqu'à la route Next.js, qui pouvait rester
// bloquée jusqu'au timeout de la plateforme d'hébergement (page blanche/504
// brute) au lieu du message soigné déjà prévu par chaque route. Ce fichier
// centralise maintenant : un timeout par appel, un retry automatique sur les
// erreurs transitoires, une classification des erreurs (ErreurIA.code) que
// chaque route peut traduire en message français adapté, et le support d'un
// AbortSignal externe pour annuler proprement l'appel si l'utilisateur
// quitte la page pendant que Next.js attend encore Claude.
// ============================================================

const URL_ANTHROPIC = "https://api.anthropic.com/v1/messages";
// Audit IA (12/09) — était "claude-sonnet-4-6". Sonnet 5 est la génération
// courante ET moins chère que la 4.6 ($2/$10 par million de tokens contre
// $3/$15) : à qualité au moins égale sur ces tâches d'extraction, c'est
// ~33% d'économie sur chaque appel, ce qui compte avec un budget serré.
const MODELE = "claude-sonnet-5";

// Audit IA (12/09) — DEUX budgets distincts, c'était la cause d'un vrai bug :
// avec 25s par tentative × 3 tentatives + les pauses (0,5s + 1,5s), le pire
// cas atteignait 77s alors que toutes les routes IA déclarent
// `maxDuration = 60`. L'hébergeur tuait donc la fonction en plein retry, et
// l'artisan recevait un 504 brut — exactement l'écran d'erreur illisible que
// tout le reste de ce fichier cherche à éviter. Le budget GLOBAL ci-dessous
// est la vraie garantie : on ne démarre jamais une tentative qui ne peut pas
// finir avant la fin du budget, et chaque tentative est plafonnée au temps
// qu'il reste.
const BUDGET_TOTAL_MS = 50_000; // < maxDuration (60s) avec de la marge
const DELAI_MAX_MS = 25_000; // plafond par tentative
const MARGE_MINIMALE_MS = 4_000; // en dessous, inutile de retenter
const TENTATIVES_MAX = 3; // 1 essai + 2 retries
const DELAIS_ATTENTE_MS = [500, 1500];
// 429 = quota/rate limit, 500/502/503/529 = indisponibilité ponctuelle
// Anthropic — tous transitoires, ça vaut le coup de retenter. 401/403 (clé
// invalide) et 400 (requête malformée, ex : prompt trop long) ne le sont
// jamais : retenter donnerait exactement la même erreur.
const STATUTS_RETRYABLES = new Set([429, 500, 502, 503, 529]);

export type CodeErreurIA =
  | "config_invalide" // clé API absente/invalide (401/403) — ne se résout jamais en réessayant
  | "quota_depasse" // 429, limite Anthropic atteinte
  | "indisponible" // 5xx ou erreur réseau, transitoire
  | "timeout" // Claude n'a pas répondu dans le délai imparti
  | "annule" // l'appelant (ou l'utilisateur, via navigation) a annulé la requête
  // Audit IA (12/09) — 400 : requête refusée par Anthropic (le plus probable
  // ici : contenu trop volumineux, typiquement un lot de captures d'écran).
  // Distinguée de "indisponible" parce qu'elle n'est PAS transitoire :
  // réessayer à l'identique redonnera exactement la même erreur, et le
  // message à l'artisan doit lui dire quoi faire, pas "réessayez".
  | "requete_invalide"
  | "reponse_invalide"; // Claude a répondu, mais le JSON attendu est illisible

export class ErreurIA extends Error {
  code: CodeErreurIA;
  constructor(message: string, code: CodeErreurIA) {
    super(message);
    this.name = "ErreurIA";
    this.code = code;
  }
}

// Message + statut HTTP prêts à renvoyer au client pour n'importe quelle
// erreur d'appel IA — évite de dupliquer ce mapping dans chaque route.
// Les erreurs qui NE SONT PAS des ErreurIA (ex : JSON de réponse mal
// formé après un parserReponseJSON raté, erreur de validation métier)
// gardent leur propre message spécifique à chaque route, plus précis.
export function reponseErreurIA(erreur: unknown): { message: string; statut: number } {
  if (erreur instanceof ErreurIA) {
    switch (erreur.code) {
      case "quota_depasse":
        return { message: "Le service IA est momentanément très sollicité. Réessayez dans quelques minutes.", statut: 429 };
      case "timeout":
        return { message: "Le service IA met trop de temps à répondre. Réessayez.", statut: 504 };
      case "indisponible":
        return { message: "Le service IA est temporairement indisponible. Réessayez dans un instant.", statut: 503 };
      case "config_invalide":
        return { message: "Le service IA est mal configuré côté serveur. Contactez le support.", statut: 500 };
      case "annule":
        return { message: "Requête annulée.", statut: 499 };
      case "requete_invalide":
        return {
          message:
            "Le contenu envoyé à l'IA n'a pas été accepté (il est probablement trop volumineux). Réessayez avec moins de photos ou un texte plus court.",
          statut: 400,
        };
      case "reponse_invalide":
        return { message: "La réponse de l'IA n'a pas pu être interprétée. Réessayez.", statut: 502 };
    }
  }
  return { message: "Une erreur inattendue est survenue. Réessayez.", statut: 500 };
}

function attendre(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Audit IA (12/09) — cette fonction se contentait de renvoyer "" quand elle
// ne trouvait pas de bloc texte. Trois situations réelles tombaient dans ce
// trou et produisaient toutes le même message trompeur en bout de chaîne
// ("La réponse de l'IA n'a pas pu être interprétée"), en poussant l'artisan
// à réessayer une opération qui échouerait exactement pareil :
//
// - `stop_reason: "max_tokens"` : la réponse est COUPÉE en plein milieu. Le
//   JSON tronqué est illisible, mais la cause n'est pas "l'IA a mal répondu",
//   c'est notre plafond de tokens. Désormais explicite (et le plafond a été
//   relevé, voir max_tokens plus bas).
// - `stop_reason: "refusal"` : le modèle a décliné la demande. Rare ici
//   (devis de plomberie...), mais un texte client recopié dans une note peut
//   contenir n'importe quoi.
// - aucun bloc texte du tout (réponse vide).
//
// `find` sur le type "text" reste correct même si le modèle renvoie des blocs
// de raisonnement : ils portent le type "thinking", jamais "text".
function texteDepuisReponse(data: {
  content?: { type: string; text?: string }[];
  stop_reason?: string | null;
}): string {
  const texte = data.content?.find((b) => b.type === "text")?.text?.trim() ?? "";

  if (data.stop_reason === "refusal") {
    throw new ErreurIA("L'IA a refusé de traiter cette demande.", "reponse_invalide");
  }
  if (data.stop_reason === "max_tokens") {
    throw new ErreurIA("Réponse de l'IA coupée (limite de longueur atteinte).", "reponse_invalide");
  }
  if (!texte) {
    throw new ErreurIA("L'IA a renvoyé une réponse vide.", "reponse_invalide");
  }
  return texte;
}

// Cœur commun à appelerClaude/appelerClaudeAvecImage(s) : construit le corps
// de la requête, gère timeout + retry + classification d'erreur. `signal`
// est optionnel — dans les routes Next.js, on y passe `request.signal` pour
// que l'annulation navigateur (l'artisan quitte la page) remonte jusqu'ici
// et coupe l'appel Anthropic en cours, plutôt que de le laisser tourner
// (et être payé) pour un résultat que personne ne lira jamais.
async function appelerAnthropic(
  body: Record<string, unknown>,
  signalExterne?: AbortSignal
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    // Ne devrait jamais se produire en production correctement configurée,
    // mais évite un fetch voué à l'échec (401 brut d'Anthropic) si la
    // variable d'environnement a été oubliée sur Vercel — message clair
    // dans les logs plutôt qu'une erreur réseau énigmatique.
    throw new ErreurIA("ANTHROPIC_API_KEY absente côté serveur.", "config_invalide");
  }

  let derniereErreur: ErreurIA | null = null;
  const finDuBudget = Date.now() + BUDGET_TOTAL_MS;

  for (let tentative = 1; tentative <= TENTATIVES_MAX; tentative++) {
    if (signalExterne?.aborted) {
      throw new ErreurIA("Requête annulée avant l'appel.", "annule");
    }

    // Budget global (voir BUDGET_TOTAL_MS) : on ne lance jamais une tentative
    // qui dépasserait le temps d'exécution autorisé à la route, et chaque
    // tentative est plafonnée à ce qu'il reste réellement.
    const tempsRestant = finDuBudget - Date.now();
    if (tempsRestant < MARGE_MINIMALE_MS) {
      throw derniereErreur ?? new ErreurIA("Délai dépassé en attendant Claude.", "timeout");
    }

    const controleur = new AbortController();
    let futTimeout = false;
    const minuteur = setTimeout(() => {
      futTimeout = true;
      controleur.abort();
    }, Math.min(DELAI_MAX_MS, tempsRestant));
    const surAnnulationExterne = () => controleur.abort();
    signalExterne?.addEventListener("abort", surAnnulationExterne);

    try {
      const response = await fetch(URL_ANTHROPIC, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
        signal: controleur.signal,
      });

      if (response.ok) {
        const data = await response.json();
        return texteDepuisReponse(data);
      }

      if (response.status === 401 || response.status === 403) {
        throw new ErreurIA(`Clé API Claude invalide ou non autorisée (${response.status}).`, "config_invalide");
      }

      // Audit IA (12/09) — un 400 n'est jamais transitoire : il tombait
      // jusqu'ici dans la branche générique "indisponible", donc l'artisan
      // lisait "réessayez dans un instant" pour un import de captures trop
      // lourd qui échouerait identiquement à chaque tentative. Le détail
      // d'Anthropic est tracé côté serveur pour le diagnostic, jamais montré
      // tel quel à l'artisan.
      if (response.status === 400) {
        const detail400 = await response.text().catch(() => "");
        console.error("Anthropic 400 (requête refusée) :", detail400.slice(0, 500));
        throw new ErreurIA(`Requête refusée par Anthropic (400).`, "requete_invalide");
      }

      if (STATUTS_RETRYABLES.has(response.status) && tentative < TENTATIVES_MAX) {
        derniereErreur = new ErreurIA(
          response.status === 429 ? "Limite de requêtes Anthropic atteinte." : `Anthropic temporairement indisponible (${response.status}).`,
          response.status === 429 ? "quota_depasse" : "indisponible"
        );
        await attendre(DELAIS_ATTENTE_MS[tentative - 1] ?? 1500);
        continue;
      }

      const detail = await response.text().catch(() => "");
      throw new ErreurIA(
        response.status === 429
          ? "Limite de requêtes Anthropic atteinte."
          : `Anthropic a renvoyé une erreur (${response.status}) : ${detail.slice(0, 200)}`,
        response.status === 429 ? "quota_depasse" : "indisponible"
      );
    } catch (err) {
      if (err instanceof ErreurIA) throw err;

      // Le signal externe (request.signal côté route Next.js) a déclenché
      // l'abort — l'utilisateur a quitté la page, ce n'est pas un vrai
      // échec IA, pas la peine de retenter ni de le compter comme une
      // erreur dans les logs.
      if (signalExterne?.aborted && !futTimeout) {
        throw new ErreurIA("Requête annulée par le client.", "annule");
      }

      if (futTimeout) {
        derniereErreur = new ErreurIA("Délai dépassé en attendant Claude.", "timeout");
      } else {
        // Erreur réseau brute (fetch failed, DNS, connexion refusée...).
        derniereErreur = new ErreurIA("Impossible de contacter Claude (réseau).", "indisponible");
      }

      if (tentative < TENTATIVES_MAX) {
        await attendre(DELAIS_ATTENTE_MS[tentative - 1] ?? 1500);
        continue;
      }
      throw derniereErreur;
    } finally {
      clearTimeout(minuteur);
      signalExterne?.removeEventListener("abort", surAnnulationExterne);
    }
  }

  throw derniereErreur ?? new ErreurIA("Échec de l'appel à Claude.", "indisponible");
}

// Audit IA (12/09) — `max_tokens` est un PLAFOND, pas une réservation : on ne
// paie que les tokens réellement produits. Le passer de 1024 à 4096 ne coûte
// donc rien en pratique, mais supprime un vrai risque de réponse coupée en
// plein JSON (un projet bien documenté — description longue, plusieurs notes
// vocales — peut produire un résumé + des questions qui frôlaient les 1024).
// Une réponse coupée = JSON illisible = échec total de l'opération, alors que
// tout le reste était bon.
const MAX_TOKENS_TEXTE = 4096;
const MAX_TOKENS_IMAGES = 8192;

// Ces appels sont des extractions structurées simples (lire un texte, remplir
// un JSON) : le raisonnement étendu n'apporte rien ici et serait facturé en
// tokens de sortie à chaque appel. Désactivé explicitement plutôt que laissé
// au défaut du modèle, qui varie d'une génération à l'autre — sans ça, une
// mise à jour de modèle pourrait faire grimper la facture en silence.
const SANS_RAISONNEMENT = { type: "disabled" } as const;

export async function appelerClaude(systemPrompt: string, userMessage: string, signal?: AbortSignal) {
  return appelerAnthropic(
    {
      model: MODELE,
      max_tokens: MAX_TOKENS_TEXTE,
      thinking: SANS_RAISONNEMENT,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    },
    signal
  );
}

// Variante avec image (capture d'écran d'un message reçu par l'artisan).
// Claude sait lire une image directement dans le même appel — pas besoin
// d'un service d'OCR séparé.
export async function appelerClaudeAvecImage(
  systemPrompt: string,
  userMessage: string,
  image: { base64: string; mediaType: string },
  signal?: AbortSignal
) {
  return appelerAnthropic(
    {
      model: MODELE,
      max_tokens: MAX_TOKENS_TEXTE,
      thinking: SANS_RAISONNEMENT,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
            { type: "text", text: userMessage },
          ],
        },
      ],
    },
    signal
  );
}

// Variante multi-images : plusieurs captures d'écran analysées en UN SEUL
// appel plutôt qu'un appel par image (voir app/api/ai/analyser-captures/
// route.ts) — évite de répéter le prompt système jusqu'à 20x pour un import
// de 20 captures.
export async function appelerClaudeAvecImages(
  systemPrompt: string,
  userMessage: string,
  images: { base64: string; mediaType: string }[],
  signal?: AbortSignal
) {
  return appelerAnthropic(
    {
      model: MODELE,
      // Jusqu'à 20 images × ~150-200 tokens de réponse JSON chacune. 4096
      // était déjà correct en théorie, mais ne laissait aucune marge si
      // plusieurs captures contiennent de longs messages recopiés en
      // "texteBrut" — et une réponse coupée fait échouer TOUT l'import, pas
      // seulement la capture concernée. Un plafond ne coûte rien tant qu'il
      // n'est pas atteint : autant le mettre hors de portée.
      max_tokens: MAX_TOKENS_IMAGES,
      thinking: SANS_RAISONNEMENT,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            ...images.map((image) => ({
              type: "image",
              source: { type: "base64", media_type: image.mediaType, data: image.base64 },
            })),
            { type: "text", text: userMessage },
          ],
        },
      ],
    },
    signal
  );
}

// L'IA est instruite de répondre en JSON strict. On isole ici le parsing et
// la gestion d'erreur pour ne pas dupliquer cette logique dans chaque route.
// Tolérance ajoutée (Cycle 1, robustesse IA) : si le texte contient autre
// chose que le JSON pur (un ```json``` déjà géré, mais aussi une phrase de
// politesse avant/après que Claude ajoute parfois malgré la consigne), on
// tente d'extraire le premier bloc {...} ou [...] équilibré avant
// d'abandonner — mieux vaut une extraction tolérante qu'un échec sur une
// réponse par ailleurs exploitable.
export function parserReponseJSON<T>(texte: string): T {
  const nettoye = texte.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(nettoye) as T;
  } catch {
    const bloc = extraireBlocJSON(nettoye);
    if (bloc) {
      try {
        return JSON.parse(bloc) as T;
      } catch {
        // tombe dans l'erreur ci-dessous
      }
    }
    throw new ErreurIA("Réponse IA illisible (JSON invalide).", "reponse_invalide");
  }
}

// Cherche le premier { ou [ et son crochet/accolade fermante correspondante
// en comptant la profondeur — plus robuste qu'une regex non-greedy face à
// du JSON imbriqué (objets/tableaux dans la réponse).
function extraireBlocJSON(texte: string): string | null {
  const debut = texte.search(/[[{]/);
  if (debut === -1) return null;
  const ouvrant = texte[debut];
  const fermant = ouvrant === "{" ? "}" : "]";
  let profondeur = 0;
  for (let i = debut; i < texte.length; i++) {
    if (texte[i] === ouvrant) profondeur++;
    else if (texte[i] === fermant) {
      profondeur--;
      if (profondeur === 0) return texte.slice(debut, i + 1);
    }
  }
  return null;
}
