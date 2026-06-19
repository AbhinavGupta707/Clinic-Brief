export type RuntimeServiceState = "configured" | "fallback" | "misconfigured" | "unconfigured";

export type RuntimeServiceReadiness = {
  state: RuntimeServiceState;
  backend?: string;
  summary: string;
  configuredEnv: string[];
  missingEnv: string[];
  fallback?: string;
};

export type RuntimeReadiness = {
  ok: boolean;
  generatedAt: string;
  app: RuntimeServiceReadiness;
  ai: RuntimeServiceReadiness;
  database: RuntimeServiceReadiness;
  storage: RuntimeServiceReadiness;
  novus: RuntimeServiceReadiness;
};
