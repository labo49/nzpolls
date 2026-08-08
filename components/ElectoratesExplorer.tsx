"use client";

import { useMemo, useState } from "react";
import ActionButton from "@/components/ActionButton";
import ClassificationBadge from "@/components/ClassificationBadge";
import PartyDot from "@/components/PartyDot";
import { PARTIES, PARTY_BY_CODE } from "@/lib/parties";
import type { CandidateEntry } from "@/lib/electorateCandidates";
import type { ElectorateClassification, ElectorateRecord } from "@/lib/electorateTypes";

const CLASSIFICATION_OPTIONS: { value: ElectorateClassification | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "safe", label: "Safe" },
  { value: "leaning", label: "Leaning" },
  { value: "tossup", label: "Toss-up" },
];

const SEAT_TYPE_OPTIONS: { value: "all" | "general" | "maori"; label: string }[] = [
  { value: "all", label: "All seats" },
  { value: "general", label: "General" },
  { value: "maori", label: "Māori" },
];

function historySummary(electorate: ElectorateRecord): string {
  return electorate.history
    .map((h) => `${h.year}${h.notional ? "*" : ""}: ${h.winnerParty} +${(h.majority ?? 0).toLocaleString()}`)
    .join("  ·  ");
}

function candidateLabel(c: CandidateEntry): string {
  return c.partyCode === "OTH" ? `${c.name} (${c.partyLabel})` : c.name;
}

export default function ElectoratesExplorer({ electorates }: { electorates: ElectorateRecord[] }) {
  const [classificationFilter, setClassificationFilter] = useState<ElectorateClassification | "all">("all");
  const [seatTypeFilter, setSeatTypeFilter] = useState<"all" | "general" | "maori">("all");
  const [partyFilter, setPartyFilter] = useState<string | "all">("all");

  const filtered = useMemo(() => {
    return electorates.filter((e) => {
      if (classificationFilter !== "all" && e.classification !== classificationFilter) return false;
      if (seatTypeFilter !== "all" && e.seatType !== seatTypeFilter) return false;
      if (partyFilter !== "all" && e.currentMp?.party !== partyFilter) return false;
      return true;
    });
  }, [electorates, classificationFilter, seatTypeFilter, partyFilter]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {CLASSIFICATION_OPTIONS.map((opt) => (
          <ActionButton
            key={opt.value}
            active={classificationFilter === opt.value}
            onClick={() => setClassificationFilter(opt.value)}
          >
            {opt.label}
          </ActionButton>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {SEAT_TYPE_OPTIONS.map((opt) => (
          <ActionButton key={opt.value} active={seatTypeFilter === opt.value} onClick={() => setSeatTypeFilter(opt.value)}>
            {opt.label}
          </ActionButton>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setPartyFilter("all")}
          className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
            partyFilter === "all"
              ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
              : "border-black/15 text-neutral-500 hover:border-black/30 dark:border-white/15 dark:text-neutral-500 dark:hover:border-white/30"
          }`}
        >
          Any current party
        </button>
        {PARTIES.map((party) => {
          const active = partyFilter === party.code;
          return (
            <button
              key={party.code}
              type="button"
              onClick={() => setPartyFilter(party.code)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                active
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                  : "border-black/15 text-neutral-500 hover:border-black/30 dark:border-white/15 dark:text-neutral-500 dark:hover:border-white/30"
              }`}
            >
              <PartyDot color={party.color} />
              {party.name}
            </button>
          );
        })}
      </div>

      <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
        Showing {filtered.length} of {electorates.length} electorates.
      </p>

      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
        <table className="w-full min-w-[1200px] text-sm">
          <thead>
            <tr className="border-b border-black/10 bg-black/[0.02] text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400">
              <th className="px-3 py-2 font-medium">Electorate</th>
              <th className="px-2 py-2 font-medium">Current MP</th>
              <th className="px-2 py-2 font-medium">Classification</th>
              <th className="px-2 py-2 font-medium">Declared candidates</th>
              <th className="px-3 py-2 font-medium">Last 3 elections</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const mpParty = e.currentMp && e.currentMp.party !== "OTH" ? PARTY_BY_CODE[e.currentMp.party] : null;
              return (
                <tr key={e.name} className="border-b border-black/5 align-top last:border-0 dark:border-white/5">
                  <td className="px-3 py-2">
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">{e.name}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-500">
                      {e.seatType === "maori" ? "Māori electorate" : "General electorate"}
                      {e.isNewFor2026 && " · new/redrawn 2026"}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    {e.currentMp ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          {mpParty ? <PartyDot color={mpParty.color} /> : <span className="h-2 w-2" />}
                          <span>{e.currentMp.name}</span>
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-500">
                          {mpParty ? mpParty.name : "Independent / other"}
                          {e.currentMp.retiring && (
                            <span className="font-medium text-amber-700 dark:text-amber-500">
                              {" "}
                              &middot; not seeking re-election here
                            </span>
                          )}
                        </div>
                        {e.currentMp.note && (
                          <div className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-600">{e.currentMp.note}</div>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-neutral-400 dark:text-neutral-600">Not yet confirmed</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <ClassificationBadge classification={e.classification} party={e.classificationParty} />
                    <div className="mt-1 max-w-xs text-xs text-neutral-500 dark:text-neutral-500">{e.trendNote}</div>
                  </td>
                  <td className="px-2 py-2">
                    {e.candidates.length > 0 ? (
                      <div className="flex max-w-xs flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-neutral-700 dark:text-neutral-300">
                        {e.candidates.map((c, i) => (
                          <span key={`${c.partyLabel}-${c.name}`} className="inline-flex items-center gap-1">
                            <PartyDot color={PARTY_BY_CODE[c.partyCode].color} />
                            {candidateLabel(c)}
                            {i < e.candidates.length - 1 ? "," : ""}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400 dark:text-neutral-600">None declared yet</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
                    {historySummary(e) || (
                      <span className="text-neutral-400 dark:text-neutral-600">No comparable results yet</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
        * = notional result, recalculated under today&apos;s boundaries rather than the real contest that year.
        Declared candidates reflect selections announced to date, not a final list -- nominations for the 2026
        election don&apos;t close until 8 October 2026.
      </p>
    </div>
  );
}
