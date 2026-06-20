"use client";

import { useEffect } from "react";
import { Events, trackEvent } from "@clinicbrief/events";
import type { BriefType, CaseMode } from "@clinicbrief/types";

export function BriefEventTracker({
  briefType,
  factCount,
  mode,
  sourceCount
}: {
  briefType: BriefType;
  factCount: number;
  mode: CaseMode;
  sourceCount: number;
}) {
  useEffect(() => {
    trackEvent(Events.BriefGenerated, { mode, briefType, factCount, sourceCount });
  }, [briefType, factCount, mode, sourceCount]);

  return null;
}
