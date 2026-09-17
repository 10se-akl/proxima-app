import { EspaceDevis } from "@/components/devis/EspaceDevis";

export const metadata = { title: "Devis" };

export default function PageDevis({ params }: { params: { id: string } }) {
  return <EspaceDevis devisId={params.id} />;
}
