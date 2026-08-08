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
  const color = CLASSIFICATION_COLOR[classification];
  const partyMeta = party && party !== "OTH" ? PARTY_BY_CODE[party] : null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium [border-color:var(--badge-color)] [color:var(--badge-color)] dark:[border-color:var(--badge-color-dark)] dark:[color:var(--badge-color-dark)]"
      style={{ "--badge-color": color.light, "--badge-color-dark": color.dark } as React.CSSProperties}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full [background-color:var(--badge-color)] dark:[background-color:var(--badge-color-dark)]"
      />
      {CLASSIFICATION_LABEL[classification]}
      {partyMeta && (
        <span className="flex items-center gap-1 text-neutral-700 dark:text-neutral-300">
          <PartyDot color={partyMeta.color} />
          {partyMeta.name}
        </span>
      )}
    </span>
  );
}
