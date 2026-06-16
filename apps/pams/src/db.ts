import Dexie, { type Table } from 'dexie';

export type PulledDataset = {
  datasetKey: string;   // "{dataflowId}:{datasetId}"
  data: unknown;        // parsed ETL export JSON
  pulledAt: string;     // ISO timestamp
};

export type ValidationResult = {
  datasetKey: string;
  results: Record<string, unknown>; // tableName → TableValueDataset response
  fetchedAt: string;
};

export type UserSetting = {
  key: string;
  value: string;
};

class PamsDb extends Dexie {
  pulledData!: Table<PulledDataset, string>;
  validationResults!: Table<ValidationResult, string>;
  userSettings!: Table<UserSetting, string>;

  constructor() {
    super('pams-db');
    this.version(1).stores({
      pulledData: 'datasetKey',
      validationResults: 'datasetKey',
      userSettings: 'key',
    });
  }
}

export const db = new PamsDb();

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function saveDataset(datasetKey: string, data: unknown) {
  await db.pulledData.put({ datasetKey, data, pulledAt: new Date().toISOString() });
}

export async function loadDataset(datasetKey: string): Promise<PulledDataset | undefined> {
  return db.pulledData.get(datasetKey);
}

export async function clearDataset(datasetKey: string) {
  await db.pulledData.delete(datasetKey);
}

export async function saveValidationResults(datasetKey: string, results: Record<string, unknown>) {
  await db.validationResults.put({ datasetKey, results, fetchedAt: new Date().toISOString() });
}

export async function loadValidationResults(datasetKey: string): Promise<ValidationResult | undefined> {
  return db.validationResults.get(datasetKey);
}

export async function clearValidationResults(datasetKey: string) {
  await db.validationResults.delete(datasetKey);
}
