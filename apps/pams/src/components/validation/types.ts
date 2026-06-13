export type ValidationRow = {
  table: string;
  recordId: string;
  column: string;
  fieldValue: string;
  level: string;
  message: string;
  typeEntity: string;
  validationId: string;
  pamId?: number;
};

export type ValidationSummary = {
  total: number;
  blocker: number;
  error: number;
  warning: number;
  info: number;
  correct: number;
};

export type ValidationState = {
  loading: boolean;
  progress: string;
  error: string | null;
  rows: ValidationRow[];
  summary: ValidationSummary | null;
  timestamp: string | null;
};
