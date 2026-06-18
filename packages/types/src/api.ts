export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: ApiError;
};

export type CreateCaseRequest = {
  title: string;
  mode: CaseMode;
  consent: true;
};

export type CreateCaseResponse = {
  caseId: string;
};

import type { CaseMode } from "./clinic";
