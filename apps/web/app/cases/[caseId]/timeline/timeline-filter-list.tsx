"use client";

import type { TimelineEvent } from "@clinicbrief/types";
import { useMemo, useState } from "react";

import { TimelineRow } from "../../../../components/demo/demo-case-components";

type TimelineFilter = "All" | "Appointment" | "Medication" | "Symptom" | "Note";

const filters: TimelineFilter[] = ["All", "Appointment", "Medication", "Symptom", "Note"];

const filterMatches: Record<Exclude<TimelineFilter, "All">, TimelineEvent["type"][]> = {
  Appointment: ["APPOINTMENT"],
  Medication: ["MEDICATION_CHANGE"],
  Symptom: ["SYMPTOM_CHANGE"],
  Note: ["NOTE", "PROCEDURE", "TEST"]
};

export function TimelineFilterList({ timeline }: { timeline: TimelineEvent[] }) {
  const [activeFilter, setActiveFilter] = useState<TimelineFilter>("All");
  const filteredTimeline = useMemo(() => {
    if (activeFilter === "All") {
      return timeline;
    }

    const allowedTypes = filterMatches[activeFilter];
    return timeline.filter((event) => allowedTypes.includes(event.type));
  }, [activeFilter, timeline]);

  return (
    <>
      <div className="flex flex-wrap gap-2 rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-3 shadow-[0_10px_28px_rgba(61,47,38,0.08)]" aria-label="Timeline filters">
        {filters.map((label) => {
          const active = label === activeFilter;

          return (
            <button
              key={label}
              type="button"
              aria-pressed={active}
              className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-extrabold transition ${
                active ? "bg-[#C8553D] text-white" : "border border-[#E4D8C8] bg-[#FFFDF8] text-[#5C4A3E] hover:bg-[#F2ECE0]"
              }`}
              onClick={() => setActiveFilter(label)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <ol className="grid gap-3">
        {filteredTimeline.map((event) => (
          <TimelineRow key={event.id} event={event} />
        ))}
        {timeline.length === 0 ? <li className="rounded-[1.25rem] border border-dashed border-[#E4D8C8] bg-[#FFFDF8] p-5 text-sm font-medium text-[#8A7A6E]">Confirm or edit extracted facts to build a timeline.</li> : null}
        {timeline.length > 0 && filteredTimeline.length === 0 ? (
          <li className="rounded-[1.25rem] border border-dashed border-[#E4D8C8] bg-[#FFFDF8] p-5 text-sm font-medium text-[#8A7A6E]">No {activeFilter.toLowerCase()} events in this timeline yet.</li>
        ) : null}
      </ol>
    </>
  );
}
