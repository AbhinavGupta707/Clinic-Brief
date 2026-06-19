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
      <div className="flex flex-wrap gap-2 rounded-md border border-clinic-line bg-white p-3 shadow-soft" aria-label="Timeline filters">
        {filters.map((label) => {
          const active = label === activeFilter;

          return (
            <button
              key={label}
              type="button"
              aria-pressed={active}
              className={`inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition ${
                active ? "bg-clinic-primary text-white" : "border border-clinic-line bg-white text-clinic-muted hover:bg-clinic-surface"
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
        {timeline.length === 0 ? <li className="rounded-md border border-dashed border-clinic-line bg-white p-5 text-sm text-clinic-muted">Confirm or edit extracted facts to build a timeline.</li> : null}
        {timeline.length > 0 && filteredTimeline.length === 0 ? (
          <li className="rounded-md border border-dashed border-clinic-line bg-white p-5 text-sm text-clinic-muted">No {activeFilter.toLowerCase()} events in this timeline yet.</li>
        ) : null}
      </ol>
    </>
  );
}
