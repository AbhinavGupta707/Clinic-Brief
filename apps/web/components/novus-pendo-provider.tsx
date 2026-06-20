"use client";

import { useEffect } from "react";

const anonymousVisitorKey = "clinicbrief_anonymous_visitor_id";
const pendoScriptId = "clinicbrief-pendo-agent";

type PendoWindow = Window & {
  __clinicbriefPendoInitialized?: boolean;
  pendo?: {
    initialize?: (config: { visitor: { id: string }; account: { id: string } }) => void;
  };
};

export function NovusPendoProvider() {
  const pendoKey = process.env.NEXT_PUBLIC_PENDO_API_KEY || process.env.NEXT_PUBLIC_NOVUS_CLIENT_KEY;

  useEffect(() => {
    if (!pendoKey || typeof window === "undefined") {
      return;
    }

    const pendoWindow = window as PendoWindow;

    if (pendoWindow.__clinicbriefPendoInitialized) {
      return;
    }

    const initialize = () => {
      if (pendoWindow.__clinicbriefPendoInitialized || !pendoWindow.pendo?.initialize) {
        return;
      }

      pendoWindow.pendo.initialize({
        visitor: { id: getAnonymousVisitorId() },
        account: { id: "clinicbrief-public-demo" }
      });
      pendoWindow.__clinicbriefPendoInitialized = true;
    };

    if (pendoWindow.pendo?.initialize) {
      initialize();
      return;
    }

    if (document.getElementById(pendoScriptId)) {
      document.getElementById(pendoScriptId)?.addEventListener("load", initialize, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = pendoScriptId;
    script.async = true;
    script.src = `https://cdn.pendo.io/agent/static/${encodeURIComponent(pendoKey)}/pendo.js`;
    script.addEventListener("load", initialize, { once: true });
    document.head.appendChild(script);
  }, [pendoKey]);

  return null;
}

function getAnonymousVisitorId() {
  try {
    const existing = window.localStorage.getItem(anonymousVisitorKey);

    if (existing) {
      return existing;
    }

    const generated = `anonymous-${crypto.randomUUID()}`;
    window.localStorage.setItem(anonymousVisitorKey, generated);
    return generated;
  } catch {
    return "anonymous-ephemeral";
  }
}
