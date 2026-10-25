// Design v3 (24/10) — ouvrir un projet donne une sensation d'appli : la
// fiche apparaît en 180 ms (app/globals.css, .entree-ecran), sans
// bibliothèque d'animation, et rien du tout si le téléphone demande moins
// d'animations. Un template (et pas un layout) se remonte à chaque fiche.
export default function GabaritFiche({ children }: { children: React.ReactNode }) {
  return <div className="entree-ecran">{children}</div>;
}
