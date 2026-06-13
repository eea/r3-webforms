import { rn3Api } from '../../services/rn3Api';
import type { ValidationRow } from './types';

const LEVEL_ERROR_PARAM = 'CORRECT,INFO,WARNING,ERROR,BLOCKER';
const VALIDATION_PAGE_SIZE = 100;

/**
 * Extract the PAM ID from a record's fields array.
 * For "PaMs" table: the "Id" field IS the PAM ID.
 * For related tables: the "Fk_PaMs" field links to the PAM ID.
 */
function extractPamIdFromFields(
  tableName: string,
  fields: any[],
  fieldNames: string[],
  fieldIdMap: Record<string, string>,
): number | undefined {
  const targetFieldName = tableName === 'PaMs' ? 'Id' : 'Fk_PaMs';

  for (let fi = 0; fi < fields.length; fi++) {
    const field = fields[fi];
    const fieldId = String(field.idFieldSchema ?? field.fieldSchemaId ?? field.id ?? '');
    const name =
      field.fieldName ||
      field.name ||
      field.headerName ||
      fieldIdMap[fieldId] ||
      fieldNames[fi] ||
      '';
    const cleanName = name.replace(/\uFEFF/g, '');

    if (cleanName === targetFieldName || cleanName === 'fk_pams') {
      const val = Number(field.value);
      if (val > 0) return val;
    }
  }
  return undefined;
}

/**
 * Parse the response from /dataset/TableValueDataset into flat validation rows.
 *   - TABLE validations:  typeEntity=TABLE  → scope is the table
 *   - RECORD validations: typeEntity=RECORD → scope is the record (row)
 *   - FIELD validations:  typeEntity=FIELD  → scope is a specific field (column)
 */
function parseValidationResponse(
  tableName: string,
  data: any,
  fieldNames: string[],
  fieldIdMap: Record<string, string>,
): ValidationRow[] {
  const rows: ValidationRow[] = [];
  const records = data?.records ?? data?.listValues ?? [];

  if (records.length > 0) {
    console.log(`[Validation] ${tableName} — first record keys:`, Object.keys(records[0]));
    const firstFields = records[0].fields ?? [];
    if (firstFields.length > 0) {
      console.log(`[Validation] ${tableName} — first field keys:`, Object.keys(firstFields[0]));
      console.log(`[Validation] ${tableName} — first field sample:`, firstFields.slice(0, 3).map((f: any) => ({
        name: f.fieldName ?? f.name ?? f.headerName ?? '',
        idFieldSchema: f.idFieldSchema ?? '',
        value: f.value,
      })));
    }
  }

  // Table-level validations
  const tableValidations = data?.tableValidations ?? [];
  if (Array.isArray(tableValidations)) {
    for (const tv of tableValidations) {
      const v = tv.validation ?? tv;
      rows.push({
        table: tableName,
        recordId: '',
        column: '',
        fieldValue: '',
        level: v.levelError ?? v.level ?? '',
        message: v.message ?? '',
        typeEntity: 'TABLE',
        validationId: String(v.idValidation ?? v.id ?? ''),
      });
    }
  }

  for (const record of records) {
    const recordId = String(record.id ?? record.id_record ?? record.idRecordSchema ?? '');
    const recordFields = record.fields ?? [];
    const pamId = extractPamIdFromFields(tableName, recordFields, fieldNames, fieldIdMap);

    // Record-level validations
    if (Array.isArray(record.recordValidations)) {
      for (const rv of record.recordValidations) {
        const v = rv.validation ?? rv;
        rows.push({
          table: tableName,
          recordId,
          column: '',
          fieldValue: '',
          level: v.levelError ?? v.level ?? '',
          message: v.message ?? '',
          typeEntity: v.typeEntity ?? 'RECORD',
          validationId: String(v.idValidation ?? v.id ?? ''),
          pamId,
        });
      }
    }

    // Field-level validations
    for (let fi = 0; fi < recordFields.length; fi++) {
      const field = recordFields[fi];
      if (!Array.isArray(field.fieldValidations) || field.fieldValidations.length === 0) continue;

      const fieldId = String(field.idFieldSchema ?? field.fieldSchemaId ?? field.id ?? '');
      const resolvedName =
        field.fieldName ||
        field.name ||
        field.headerName ||
        fieldIdMap[fieldId] ||
        fieldNames[fi] ||
        fieldId ||
        `field_${fi}`;

      for (const fv of field.fieldValidations) {
        const v = fv.validation ?? fv;
        rows.push({
          table: tableName,
          recordId,
          column: resolvedName,
          fieldValue: field.value != null ? String(field.value) : '',
          level: v.levelError ?? v.level ?? '',
          message: v.message ?? '',
          typeEntity: v.typeEntity ?? 'FIELD',
          validationId: String(v.idValidation ?? v.id ?? ''),
          pamId,
        });
      }
    }
  }

  return rows;
}

export function computeSummary(rows: ValidationRow[]) {
  const summary = { total: rows.length, blocker: 0, error: 0, warning: 0, info: 0, correct: 0 };
  for (const r of rows) {
    switch (r.level.toUpperCase()) {
      case 'BLOCKER': summary.blocker++; break;
      case 'ERROR': summary.error++; break;
      case 'WARNING': summary.warning++; break;
      case 'INFO': summary.info++; break;
      case 'CORRECT': summary.correct++; break;
    }
  }
  return summary;
}

export const VALIDATION_CLEARED_EVENT = 'validationDataCleared';
export const VALIDATION_UPDATED_EVENT = 'validationDataUpdated';

/**
 * Clear all persisted validation data and notify listeners.
 */
export function clearValidationData() {
  localStorage.removeItem('rn3_validation_results');
  window.dispatchEvent(new Event(VALIDATION_CLEARED_EVENT));
}

/**
 * Pull validation data from ReportNet for a given dataset/dataflow.
 * Reports progress via onProgress callback.
 * Returns the validation rows on success.
 */
export async function pullValidationData(
  datasetId: number,
  dataflowId: number,
  onProgress: (message: string) => void,
  onProgressPercent?: (percent: number) => void,
): Promise<ValidationRow[]> {
  // Step 1: Generate Bearer token
  onProgressPercent?.(0);
  onProgress('Generating authentication token...');
  const username = import.meta.env.VITE_RN3_CUSTODIAN_USERNAME;
  const password = import.meta.env.VITE_RN3_CUSTODIAN_PASSWORD;
  if (!username || !password) {
    throw new Error('VITE_RN3_CUSTODIAN_USERNAME or VITE_RN3_CUSTODIAN_PASSWORD is not set in .env.local');
  }
  const tokenData = await rn3Api.post<any>(
    '/user/generateToken',
    new URLSearchParams({ username, password }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  const accessToken: string =
    typeof tokenData === 'string'
      ? tokenData
      : tokenData?.accessToken ?? tokenData?.token ?? '';
  if (!accessToken) {
    throw new Error(`Could not extract access token. Response: ${JSON.stringify(tokenData)}`);
  }

  // Step 2: Get dataset schema to discover idTableSchema values
  onProgressPercent?.(10);
  onProgress('Fetching dataset schema...');
  const schema = await rn3Api.get<any>(`/dataschema/v1/datasetId/${datasetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const fullSchemaTables = schema?.tableSchemas ?? schema?.tables ?? [];
  const tableSchemas: { id: string; name: string }[] = [];
  const fieldIdMap: Record<string, string> = {};

  for (const t of fullSchemaTables) {
    const tableId = String(t.idTableSchema ?? t.id ?? '');
    const tableName = t.nameTableSchema ?? t.tableName ?? t.name ?? '';
    if (tableId) tableSchemas.push({ id: tableId, name: tableName });

    const fieldSchemas = t.recordSchema?.fieldSchema ?? t.fieldSchemas ?? t.fields ?? [];
    for (const f of fieldSchemas) {
      const fId = String(f.idFieldSchema ?? f.id ?? '');
      const fName = f.headerName ?? f.name ?? f.fieldName ?? '';
      if (fId && fName) fieldIdMap[fId] = fName;
    }
  }

  if (tableSchemas.length === 0) {
    throw new Error('No tables found in dataset schema.');
  }

  // Step 2b: Get simple schema for ordered field names
  onProgressPercent?.(20);
  onProgress('Fetching simple schema for field names...');
  const simpleSchema = await rn3Api.getSimpleSchema(datasetId, dataflowId);
  const simpleFieldsByTable: Record<string, string[]> = {};
  if (simpleSchema?.tables) {
    for (const t of simpleSchema.tables) {
      const name = t.tableName ?? t.name ?? '';
      const fields = (t.fields ?? []).map((f: any) => (f.fieldName ?? f.name ?? '').replace(/\uFEFF/g, ''));
      if (name) simpleFieldsByTable[name] = fields;
    }
  }

  console.log(`[Validation] Full schema: ${tableSchemas.length} tables, ${Object.keys(fieldIdMap).length} field ID mappings`);
  console.log(`[Validation] Simple schema: ${Object.keys(simpleFieldsByTable).length} tables with field names`);

  // Step 3: For each table, call TableValueDataset with validation filters
  const allRows: ValidationRow[] = [];
  for (let i = 0; i < tableSchemas.length; i++) {
    const ts = tableSchemas[i];
    const pct = Math.round(20 + ((i + 1) / tableSchemas.length) * 80);
    onProgressPercent?.(pct);
    onProgress(`Fetching validations: ${i + 1}/${tableSchemas.length} — ${ts.name}`);

    try {
      const url =
        `/dataset/TableValueDataset/${datasetId}` +
        `?fieldValue=` +
        `&idTableSchema=${ts.id}` +
        `&pageNum=0` +
        `&pageSize=${VALIDATION_PAGE_SIZE}` +
        `&levelError=${LEVEL_ERROR_PARAM}`;

      const data = await rn3Api.get<any>(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const fieldNames = simpleFieldsByTable[ts.name] ?? [];
      const parsed = parseValidationResponse(ts.name, data, fieldNames, fieldIdMap);
      allRows.push(...parsed);
    } catch (err: any) {
      console.warn(`Validation fetch failed for table "${ts.name}" (${ts.id}):`, err?.message);
    }
  }

  const withPamId = allRows.filter(r => r.pamId).length;
  console.log(`[Validation] ${allRows.length} total rows, ${withPamId} with pamId resolved`);

  // Persist to localStorage for other pages
  const timestamp = new Date().toISOString();
  try {
    localStorage.setItem('rn3_validation_results', JSON.stringify({ rows: allRows, timestamp }));
    window.dispatchEvent(new Event(VALIDATION_UPDATED_EVENT));
  } catch (e) {
    console.warn('Failed to persist validation results to localStorage:', e);
  }

  return allRows;
}
