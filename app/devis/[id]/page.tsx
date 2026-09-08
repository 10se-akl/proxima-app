import type { Metadata } from "next";
import { DevisPublicClient } from "@/components/devis-public/DevisPublicClient";

// Page publique (08/09) — voir Module 31. Jamais indexée : contient le nom
// et les montants d'un client précis, même logique que /dashboard et
// /admin déjà exclus dans app/robots.ts (ce chemin y est ajouté aussi).
export const metadata: Metadata = {
  title: "Votre devis",
  robots: { index: false, follow: false },
};

export default function DevisPublicPage({ params }: { params: { id: string } }) {
  return <DevisPublicClient devisId={params.id} />;
}
