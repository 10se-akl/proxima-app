// Appelle l'API Claude. À importer UNIQUEMENT depuis app/api/* (Route Handlers),
// jamais depuis un composant "use client" — la clé API ne doit jamais
// atteindre le navigateur.
export async function appelerClaude(systemPrompt: string, userMessage: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Erreur API Claude (${response.status}) : ${detail}`);
  }

  const data = await response.json();
  const bloc = data.content?.find((b: { type: string }) => b.type === "text");
  return bloc?.text ?? "";
}

// Variante avec image (capture d'écran d'un message reçu par l'artisan).
// Claude sait lire une image directement dans le même appel — pas besoin
// d'un service d'OCR séparé. Le modèle et la limite de sortie restent les
// mêmes que appelerClaude ; seul le contenu du message change de forme
// (texte + image au lieu de texte seul).
export async function appelerClaudeAvecImage(
  systemPrompt: string,
  userMessage: string,
  image: { base64: string; mediaType: string }
) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: image.mediaType, data: image.base64 },
            },
            { type: "text", text: userMessage },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Erreur API Claude (${response.status}) : ${detail}`);
  }

  const data = await response.json();
  const bloc = data.content?.find((b: { type: string }) => b.type === "text");
  return bloc?.text ?? "";
}

// L'IA est instruite de répondre en JSON strict. On isole ici le parsing
// et la gestion d'erreur pour ne pas dupliquer cette logique dans chaque route.
export function parserReponseJSON<T>(texte: string): T {
  const nettoye = texte.replace(/```json|```/g, "").trim();
  return JSON.parse(nettoye) as T;
}
