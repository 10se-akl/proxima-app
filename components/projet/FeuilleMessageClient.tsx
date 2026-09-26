"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { enregistrerEvenement } from "@/lib/timeline";
import {
  LIBELLES,
  ouvrirMessage,
  premierePhrase,
  suggererMessages,
  type Canal,
  type CleMessage,
  type ContexteMessage,
  type Suggestion,
} from "@/lib/messagesClient";
import { Feuille } from "./Feuille";

// ============================================================
// « Message au client » (26/09 — « moins mais mieux », lot D).
//
// Une feuille, deux ou trois messages déjà écrits, le plus probable en
// premier, chacun avec « SMS » et « WhatsApp ». Un appui ouvre
// l'application de messagerie de l'artisan, texte prêt : c'est lui qui
// envoie, depuis son numéro, et il peut modifier le texte avant. Aucun
// écran d'édition ici, aucun envoi par Compyo.
//
// Le carnet du projet garde une trace « Message préparé : … » — jamais
// « envoyé » : Compyo ne peut pas savoir si l'artisan a appuyé sur
// envoyer. Pour une relance de paiement, la facture est aussi marquée
// comme relancée (notifie_relance_le, le champ que la relance
// automatique utilise déjà pour ne pas reproposer une facture) : inutile
// de notifier l'artisan d'une facture qu'il vient de relancer lui-même.
// ============================================================

export type DemandeMessage = { cle: CleMessage; factureId?: string | null; devisId?: string | null };

type Charge = { nomClient: string; ctx: ContexteMessage };

async function chargerContexte(
  supabase: ReturnType<typeof createClient>,
  demandeId: string,
  meteo: ContexteMessage["meteo"]
): Promise<Charge | null> {
  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: demande }, { data: profil }, { data: devis }, { data: factures }, { data: rdvs }, { count: nbMessages }] =
    await Promise.all([
      supabase.from("demandes").select("nom_client, telephone_client, adresse_client, created_at").eq("id", demandeId).single(),
      user ? supabase.from("profils").select("nom, entreprise").eq("id", user.id).single() : Promise.resolve({ data: null }),
      supabase.from("devis").select("id, numero, envoye_le").eq("demande_id", demandeId).eq("statut", "envoye"),
      supabase
        .from("factures")
        .select("id, numero, date_emission, date_echeance, total_ttc")
        .eq("demande_id", demandeId)
        .eq("statut", "emise")
        .neq("type", "avoir"),
      supabase
        .from("evenements_planning")
        .select("id, date_heure")
        .eq("demande_id", demandeId)
        .eq("statut", "a_faire")
        .gte("date_heure", debutJour.toISOString())
        .order("date_heure", { ascending: true }),
      supabase
        .from("evenements_projet")
        .select("id", { count: "exact", head: true })
        .eq("demande_id", demandeId)
        .eq("type", "message_prepare"),
    ]);
  if (!demande) return null;
  return {
    nomClient: demande.nom_client,
    ctx: {
      telephone: demande.telephone_client,
      adresse: demande.adresse_client,
      creeLe: demande.created_at,
      dejaContacte: (nbMessages ?? 0) > 0,
      signature: { nom: profil?.nom, entreprise: profil?.entreprise },
      facturesDues: factures ?? [],
      devisEnvoyes: devis ?? [],
      rdvs: rdvs ?? [],
      meteo,
    },
  };
}

/** La trace dans le carnet, et la facture marquée comme relancée. Jamais
 *  bloquant : l'artisan a déjà sa messagerie ouverte. */
export async function tracerMessagePrepare(
  supabase: ReturnType<typeof createClient>,
  params: { demandeId: string; cle: CleMessage; canal: Canal; factureId?: string }
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const organisationId = await getOrganisationId(supabase, user.id);
    if (!organisationId) return;
    await enregistrerEvenement(supabase, {
      demandeId: params.demandeId,
      artisanId: user.id,
      organisationId,
      type: "message_prepare",
      titre: `Message préparé : ${LIBELLES[params.cle].toLowerCase()}`,
      detail: params.canal === "sms" ? "Par SMS" : "Par WhatsApp",
      metadata: { cle: params.cle, canal: params.canal, facture_id: params.factureId ?? null },
    });
    if (params.cle === "relancePaiement" && params.factureId) {
      await supabase
        .from("factures")
        .update({ notifie_relance_le: new Date().toISOString() })
        .eq("id", params.factureId)
        .is("notifie_relance_le", null);
    }
  } catch {
    // La messagerie est déjà ouverte : une trace manquée ne doit rien bloquer.
  }
}

export function FeuilleMessageClient({
  ouverte,
  surFermer,
  demandeId,
  demande,
  meteo = null,
}: {
  ouverte: boolean;
  surFermer: () => void;
  demandeId: string;
  /** Le message demandé explicitement (notification, bouton Relancer). */
  demande?: DemandeMessage | null;
  meteo?: ContexteMessage["meteo"];
}) {
  const supabase = createClient();
  const [charge, setCharge] = useState<Charge | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    if (!ouverte) return;
    setErreur(false);
    chargerContexte(supabase, demandeId, meteo).then((c) => (c ? setCharge(c) : setErreur(true)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouverte, demandeId]);

  async function enregistrerTelephone(numero: string) {
    const { error } = await supabase.from("demandes").update({ telephone_client: numero }).eq("id", demandeId);
    if (error) return false;
    setCharge((c) => (c ? { ...c, ctx: { ...c.ctx, telephone: numero } } : c));
    return true;
  }

  return (
    <Feuille ouverte={ouverte} titre={charge ? `Message à ${charge.nomClient}` : "Message au client"} surFermer={surFermer}>
      {erreur && <p className="text-[15px] text-ink/60">Le projet n&apos;a pas pu être chargé. Réessayez.</p>}
      {!charge && !erreur && <p className="text-[15px] text-ink/50">…</p>}
      {charge && (
        <ContenuMessageClient
          ctx={charge.ctx}
          demande={demande}
          surEnregistrerTelephone={enregistrerTelephone}
          surPrepare={(s, canal) => {
            tracerMessagePrepare(supabase, { demandeId, cle: s.cle, canal, factureId: s.factureId });
          }}
        />
      )}
    </Feuille>
  );
}

/** Le contenu de la feuille, sans aucune requête (vérifiable avec des
 *  données simulées). */
export function ContenuMessageClient({
  ctx,
  demande,
  surEnregistrerTelephone,
  surPrepare,
  maintenant = new Date(),
}: {
  ctx: ContexteMessage;
  demande?: DemandeMessage | null;
  surEnregistrerTelephone: (numero: string) => Promise<boolean>;
  surPrepare: (s: Suggestion, canal: Canal) => void;
  maintenant?: Date;
}) {
  const [saisie, setSaisie] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurNumero, setErreurNumero] = useState(false);
  const suggestions = suggererMessages(ctx, maintenant, demande);

  if (!ctx.telephone) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (saisie.replace(/\D/g, "").length < 9) {
            setErreurNumero(true);
            return;
          }
          setEnregistrement(true);
          const ok = await surEnregistrerTelephone(saisie.trim());
          setEnregistrement(false);
          setErreurNumero(!ok);
        }}
      >
        <label className="block text-[15px] font-medium text-ink" htmlFor="telephone-client">
          Numéro du client
        </label>
        <input
          id="telephone-client"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder="06 12 34 56 78"
          className="mt-2 w-full min-h-12 rounded-xl border border-ink/15 bg-paper px-4 text-[17px] text-ink focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
        />
        {erreurNumero && <p className="mt-2 text-[14px] text-signal">Numéro incomplet ou non enregistré.</p>}
        <button
          type="submit"
          disabled={enregistrement}
          className="mt-4 w-full min-h-12 rounded-xl bg-ink text-[16px] font-semibold text-paper disabled:opacity-50"
        >
          {enregistrement ? "…" : "Enregistrer"}
        </button>
      </form>
    );
  }

  if (suggestions.length === 0) {
    return <p className="text-[15px] text-ink/60">Rien à envoyer pour l&apos;instant.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {suggestions.map((s) => (
        <li key={s.cle} className="rounded-2xl bg-surface p-4 ring-1 ring-ink/10">
          <p className="text-[12.5px] font-medium uppercase tracking-wide text-steel">{LIBELLES[s.cle]}</p>
          <p className="mt-1 text-[15px] leading-snug text-ink">
            {/* À l'écran seulement : « 1 250,00 € » ne se coupe pas en fin de ligne. */}
            {premierePhrase(s.texte).replace(/(\d) (?=\d{3}\b|€)/g, "$1\u00a0")}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["sms", "whatsapp"] as const).map((canal) => (
              <button
                key={canal}
                type="button"
                onClick={() => {
                  if (ouvrirMessage(canal, ctx.telephone as string, s.texte)) surPrepare(s, canal);
                }}
                className={`min-h-12 rounded-xl text-[15px] font-semibold transition motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 ${
                  canal === "sms" ? "bg-ink text-paper" : "text-ink ring-1 ring-ink/15"
                }`}
              >
                {canal === "sms" ? "SMS" : "WhatsApp"}
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
