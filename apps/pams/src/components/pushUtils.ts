/**
 * Shared push utilities used by PushPage and ValidationWorkflow.
 * Extracted to avoid code duplication.
 */
import JSZip from 'jszip';
import { rn3Api } from '../services/rn3Api';

export type TableEntry = { name: string; records: any[]; index: number; fieldNames?: string[] };

export type BuildProgress = {
  tableIndex: number;
  totalTables: number;
  tableName: string;
  recordCount: number;
  columnCount: number;
};

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60;
const TERMINAL_STATUSES = ['FINISHED', 'FAILED', 'CANCELED', 'CANCELED_BY_ADMIN', 'REFUSED'];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Strip BOM character that RN3 API may include */
export const stripBom = (s: string) => s.replace(/\uFEFF/g, '');

/** Escape a value for CSV (RFC 4180) */
export const escapeCsv = (v: any): string => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return s.includes('|') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
};

const SYSTEM_COLUMNS = ['id_table_schema', 'id_record', 'countryCode'];

export function flattenRecord(record: any): Record<string, any> {
  if (record.fields && Array.isArray(record.fields)) {
    const flat: Record<string, any> = {};
    record.fields.forEach((f: any) => {
      if (f.fieldName) flat[stripBom(f.fieldName)] = f.value ?? '';
    });
    return flat;
  }
  const flat: Record<string, any> = {};
  for (const [k, v] of Object.entries(record)) {
    const key = stripBom(k);
    if (!SYSTEM_COLUMNS.includes(key)) flat[key] = v;
  }
  return flat;
}

export function recordsToCsv(records: Record<string, any>[], headerKeys?: string[]): string {
  const keys = headerKeys ?? (records.length > 0 ? Object.keys(records[0]) : []);
  if (!keys.length) return '';
  const rows = records.map(r => keys.map(k => escapeCsv(r[k])).join('|'));
  return '\uFEFF' + [keys.join('|'), ...rows].join('\r\n');
}

const PAMS_DRAFT_STORAGE_KEY = 'pams_details_draft_v1';

export function getPamDraftOverrides(): Record<string, any[]> {
  try {
    const raw = localStorage.getItem(PAMS_DRAFT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const overrides: Record<string, any[]> = {};
    if (parsed.modifiedPams && Array.isArray(parsed.modifiedPams)) {
      overrides['PaMs'] = parsed.modifiedPams;
    }
    if (parsed.modifiedTableData && typeof parsed.modifiedTableData === 'object') {
      for (const [tableName, records] of Object.entries(parsed.modifiedTableData)) {
        if (Array.isArray(records) && records.length > 0) {
          overrides[tableName] = records;
        }
      }
    }
    return overrides;
  } catch {
    return {};
  }
}

// ── Build ZIP ──────────────────────────────────────────────────────────────

export async function buildZip(
  tables: TableEntry[],
  onProgress?: (p: BuildProgress) => void
): Promise<Blob> {
  const datasetId = Number(localStorage.getItem('rn3_datasetid')) || 40468;
  const dataflowId = Number(localStorage.getItem('rn3_dataflowid')) || 12313;

  const schema = await rn3Api.getSimpleSchema(datasetId, dataflowId);
  const schemaTables: { tableName: string; fields: string[] }[] = (schema?.tables || []).map(
    (t: any) => ({
      tableName: t.tableName,
      fields: t.fields.map((f: any) => stripBom(f.fieldName)),
    })
  );

  const dataByName: Record<string, any[]> = {};
  for (const table of tables) {
    if (table.records.length > 0) {
      dataByName[table.name] = table.records.map(flattenRecord);
    }
  }

  const pamOverrides = getPamDraftOverrides();
  for (const [tableName, records] of Object.entries(pamOverrides)) {
    dataByName[tableName] = records.map(flattenRecord);
  }
  if (Object.keys(pamOverrides).length > 0) {
    console.log('[buildZip] Applied PAM draft overrides for tables:', Object.keys(pamOverrides).join(', '));
  }

  const zip = new JSZip();
  for (let i = 0; i < schemaTables.length; i++) {
    const st = schemaTables[i];
    const records = dataByName[st.tableName] || [];
    if (records.length === 0) continue;
    const csv = recordsToCsv(records, st.fields);
    zip.file(`${st.tableName}.csv`, csv);

    if (onProgress) {
      onProgress({
        tableIndex: i + 1,
        totalTables: schemaTables.length,
        tableName: st.tableName,
        recordCount: records.length,
        columnCount: st.fields.length,
      });
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

// ── Upload & Poll ──────────────────────────────────────────────────────────

export async function uploadAndPoll(
  file: File,
  datasetId: number,
  dataflowId: number,
  apiKey: string,
  onStatus: (msg: string) => void
): Promise<{ jobId?: number | string; jobStatus: string }> {
  onStatus('Uploading file…');
  const formData = new FormData();
  formData.append('file', file, file.name);
  const importUrl = `/dataset/v2/importFileData/${datasetId}?dataflowId=${dataflowId}&replace=true&providerId=86`;
  console.log('[Import] POST', importUrl);

  let result: any;
  try {
    result = await rn3Api.post<any>(importUrl, formData, { headers: { 'Content-Type': undefined, 'Authorization': `ApiKey ${apiKey}` } });
  } catch (err: any) {
    const status = err?.response?.status;
    const body = err?.response?.data;
    const detail = body?.message || body?.error || (typeof body === 'string' ? body : JSON.stringify(body));

    if (status === 403) {
      throw new Error('Access denied (HTTP 403). Check that your API Key is correct and has permission to import data for this dataset.');
    }
    if (status === 409) {
      throw new Error('Another import job is already running for this dataset (HTTP 409). Wait for it to complete, then try again.');
    }
    if (status === 500) {
      throw new Error(`Server error (HTTP 500)${detail ? ': ' + detail : '. The CSV format or column names may not match the dataset schema.'}`);
    }
    throw new Error(`HTTP ${status ?? 'error'}${detail ? ': ' + detail : ': ' + (err?.message ?? 'Unknown error')}`);
  }

  console.log('[Import] raw server response:', result);
  const jobId = result?.jobId;
  console.log('[Import] jobId:', jobId);
  if (!jobId) return { jobStatus: 'ACCEPTED' };

  // Generate Bearer token for job polling
  onStatus('Generating authentication token for job polling…');
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
  const accessToken: string | undefined =
    typeof tokenData === 'string'
      ? tokenData
      : tokenData?.accessToken ?? tokenData?.token ?? undefined;
  if (!accessToken) {
    throw new Error(`Could not extract access token. Response: ${JSON.stringify(tokenData)}`);
  }
  rn3Api.setAccessToken(accessToken);

  let attempts = 0;
  let finalStatus = '';
  try {
    while (attempts < MAX_POLL_ATTEMPTS) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      attempts++;
      onStatus(`Waiting for job ${jobId}… (${attempts}/${MAX_POLL_ATTEMPTS})`);

      const sr = await rn3Api.get<{ jobsList?: { id: number | string; jobStatus: string }[] }>(
        `/orchestrator/jobs/?pageNum=0&pageSize=50&asc=0&sortedColumn=dateAdded`
      );
      const job = sr?.jobsList?.find(j => String(j.id) === String(jobId));
      const status = job?.jobStatus ?? '';
      onStatus(`Job ${jobId}: ${status} (${attempts}/${MAX_POLL_ATTEMPTS})`);
      finalStatus = status;
      if (TERMINAL_STATUSES.includes(status)) break;
    }
  } finally {
    rn3Api.clearAccessToken();
  }
  return { jobId, jobStatus: finalStatus || 'UNKNOWN' };
}
