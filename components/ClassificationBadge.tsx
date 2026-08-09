import ColorBadge from "@/components/ColorBadge";
import PartyDot from "@/components/PartyDot";
import { CLASSIFICATION_COLOR, CLASSIFICATION_LABEL } from "@/lib/electorateClassification";
import { PARTY_BY_CODE } from "@/lib/parties";
import type { ElectorateClassification } from "@/lib/electorateTypes";
import type { ElectorateParty } from "@/lib/electorateResults";

export default function ClassificationBadge({
  classification,
  party,
}: {
  classification: ElectorateClassification;
  party: ElectorateParty | null;
}) {
  const partyMeta = party && party !== "OTH" ? PARTY_BY_CODE[party] : null;

  return (
    <ColorBadge color={CLASSIFICATION_COLOR[classification]}>
      {CLASSIFICATION_LABEL[classification]}
      {partyMeta && (
        <span className="flex items-center gap-1 text-neutral-700 dark:text-neutral-300">
          <PartyDot color={partyMeta.color} />
          {partyMeta.name}
        </span>
      )}
    </ColorBadge>
  );
}
