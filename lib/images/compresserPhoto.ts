// Sprint Beta Final (27/08) — 🔴E. Une photo de chantier prise avec un
// téléphone récent pèse souvent 3 à 8 Mo. Envoyée telle quelle sur un
// réseau de chantier (souvent faible), ça se traduit par des uploads très
// lents voire des échecs silencieux perçus comme des bugs par l'artisan.
// Même technique que app/dashboard/demandes/importer-capture/page.tsx
// (canvas, aucune bibliothèque externe) mais adaptée : ici la photo EST le
// livrable (documentation du chantier, avant/après, preuve pour le client),
// donc on garde une résolution et une qualité nettement plus hautes que
// pour une capture de conversation à simplement lire.
const LARGEUR_MAX_PX = 1920;
const QUALITE_JPEG = 0.85;

export function compresserPhoto(fichier: File): Promise<File> {
  return new Promise((resolve) => {
    // Un fichier déjà petit (photo déjà compressée, image envoyée depuis
    // un autre outil) n'a pas besoin d'être retraité — évite un aller-
    // retour canvas inutile et une éventuelle perte de qualité pour rien.
    if (fichier.size <= 400_000) {
      resolve(fichier);
      return;
    }

    const image = new Image();
    const url = URL.createObjectURL(fichier);

    // Si la compression échoue pour une raison quelconque (image
    // corrompue, format exotique), on retombe sur le fichier d'origine
    // plutôt que de bloquer l'envoi de la photo — le pire cas est un
    // upload plus lourd, jamais une photo perdue.
    const repli = () => {
      URL.revokeObjectURL(url);
      resolve(fichier);
    };

    image.onload = () => {
      try {
        const ratio = Math.min(1, LARGEUR_MAX_PX / image.width);
        const largeur = Math.round(image.width * ratio);
        const hauteur = Math.round(image.height * ratio);

        const canvas = document.createElement("canvas");
        canvas.width = largeur;
        canvas.height = hauteur;
        const contexte = canvas.getContext("2d");
        if (!contexte) {
          repli();
          return;
        }
        contexte.drawImage(image, 0, 0, largeur, hauteur);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) {
              resolve(fichier);
              return;
            }
            resolve(
              new File([blob], fichier.name.replace(/\.\w+$/, ".jpg"), {
                type: "image/jpeg",
              })
            );
          },
          "image/jpeg",
          QUALITE_JPEG
        );
      } catch {
        repli();
      }
    };
    image.onerror = repli;
    image.src = url;
  });
}
