import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import type {
  RN3AuthResponse,
  RN3Dataflow,
  RN3Dataset,
  RN3EtlExportData,
  RN3ExportJobResponse,
  RN3JobStatusResponse
} from '../types/rn3';
import JSZip from 'jszip';

// ── API Call Timing Stats ──────────────────────────────────────────────────────

const API_TIMING_KEY = 'rn3_api_timing_stats';

export type ApiTimingEntry = {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  lastMs: number;
  lastCall: string; // ISO timestamp
};

export type ApiTimingStats = Record<string, ApiTimingEntry>;

/**
 * Normalize an endpoint to a pattern key (replace numeric IDs with {id}).
 * e.g. "/dataset/TableValueDataset/40468?..." → "GET /dataset/TableValueDataset/{id}"
 */
function normalizeEndpoint(method: string, url: string): string {
  // Remove query params
  const path = url.split('?')[0];
  // Replace numeric path segments with {id}
  const normalized = path.replace(/\/\d+/g, '/{id}');
  return `${method.toUpperCase()} ${normalized}`;
}

function loadTimingStats(): ApiTimingStats {
  try {
    const raw = localStorage.getItem(API_TIMING_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTimingStats(stats: ApiTimingStats): void {
  try {
    localStorage.setItem(API_TIMING_KEY, JSON.stringify(stats));
  } catch { /* ignore quota errors */ }
}

function recordTiming(method: string, url: string, durationMs: number): void {
  const key = normalizeEndpoint(method, url);
  const stats = loadTimingStats();
  const prev = stats[key];

  if (prev) {
    prev.count++;
    prev.totalMs += durationMs;
    prev.minMs = Math.min(prev.minMs, durationMs);
    prev.maxMs = Math.max(prev.maxMs, durationMs);
    prev.avgMs = Math.round(prev.totalMs / prev.count);
    prev.lastMs = durationMs;
    prev.lastCall = new Date().toISOString();
  } else {
    stats[key] = {
      count: 1,
      totalMs: durationMs,
      minMs: durationMs,
      maxMs: durationMs,
      avgMs: durationMs,
      lastMs: durationMs,
      lastCall: new Date().toISOString(),
    };
  }

  saveTimingStats(stats);
}

/**
 * Get the average response time for an endpoint pattern.
 * Returns null if no data is available.
 */
export function getAvgTime(method: string, urlPattern: string): number | null {
  const key = normalizeEndpoint(method, urlPattern);
  const stats = loadTimingStats();
  return stats[key]?.avgMs ?? null;
}

/**
 * Get all timing stats (for display in UI).
 */
export function getAllTimingStats(): ApiTimingStats {
  return loadTimingStats();
}

/**
 * Clear API endpoint timing stats (does NOT clear workflow timing — that data is valuable).
 */
export function clearTimingStats(): void {
  localStorage.removeItem(API_TIMING_KEY);
}

/**
 * Clear workflow timing stats (use only for full reset).
 */
export function clearWorkflowTimingStats(): void {
  localStorage.removeItem(WORKFLOW_TIMING_KEY);
}

// ── Workflow-Level Timing ─────────────────────────────────────────────────────
// Records total wall-clock time for entire workflows (not individual API calls).
// Includes metadata like number of tables, environment, etc.

const WORKFLOW_TIMING_KEY = 'rn3_workflow_timing_stats';

export type WorkflowTimingEntry = {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  lastMs: number;
  lastCall: string;
  /** Metadata from the most recent run (e.g. tableCount, environment) */
  lastMeta: Record<string, any>;
  /** History of recent runs for weighted estimation */
  recentRuns: Array<{ durationMs: number; meta: Record<string, any>; timestamp: string }>;
};

export type WorkflowTimingStats = Record<string, WorkflowTimingEntry>;

function loadWorkflowStats(): WorkflowTimingStats {
  try {
    const raw = localStorage.getItem(WORKFLOW_TIMING_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveWorkflowStats(stats: WorkflowTimingStats): void {
  try {
    localStorage.setItem(WORKFLOW_TIMING_KEY, JSON.stringify(stats));
  } catch { /* ignore quota errors */ }
}

/**
 * Record the total duration of a workflow step.
 * @param stepKey - Workflow identifier (e.g. 'push-build-zip', 'pull-export', 'validation-full')
 * @param durationMs - Total wall-clock time in milliseconds
 * @param meta - Contextual metadata (tableCount, environment, datasetId, etc.)
 */
export function recordWorkflowTiming(stepKey: string, durationMs: number, meta: Record<string, any> = {}): void {
  // Ignore durations under 1s (bad data / React Strict Mode ghost unmounts)
  if (durationMs < 1000) return;

  const stats = loadWorkflowStats();
  const prev = stats[stepKey];
  const run = { durationMs, meta, timestamp: new Date().toISOString() };

  if (prev) {
    prev.count++;
    prev.totalMs += durationMs;
    prev.minMs = Math.min(prev.minMs, durationMs);
    prev.maxMs = Math.max(prev.maxMs, durationMs);
    prev.avgMs = Math.round(prev.totalMs / prev.count);
    prev.lastMs = durationMs;
    prev.lastCall = run.timestamp;
    prev.lastMeta = meta;
    // Keep last 10 runs for weighted/contextual estimation
    prev.recentRuns = [...(prev.recentRuns || []).slice(-9), run];
  } else {
    stats[stepKey] = {
      count: 1,
      totalMs: durationMs,
      minMs: durationMs,
      maxMs: durationMs,
      avgMs: durationMs,
      lastMs: durationMs,
      lastCall: run.timestamp,
      lastMeta: meta,
      recentRuns: [run],
    };
  }

  saveWorkflowStats(stats);
  console.log(`[Workflow Timing] ${stepKey}: ${durationMs}ms (avg: ${stats[stepKey].avgMs}ms, runs: ${stats[stepKey].count})`, meta);
}

/** Keys suitable for proportional scaling (not IDs or ports). */
const SCALING_KEYS = new Set(['tableCount', 'rowCount', 'totalRecords', 'fileSizeKb', 'pollAttempts']);

/**
 * Get estimated duration for a workflow step.
 * Uses recorded workflow-level timing. If metadata includes a scaling key
 * (e.g. tableCount), estimates proportionally based on the most recent run.
 * Always returns at least 2000ms.
 */
export function getWorkflowEstimate(stepKey: string, defaultMs: number, currentMeta?: Record<string, any>): number {
  const stats = loadWorkflowStats();
  const entry = stats[stepKey];
  if (!entry || entry.avgMs <= 0) return Math.max(defaultMs, 2000);

  // Try proportional scaling using a suitable metadata key
  if (currentMeta && entry.recentRuns?.length > 0) {
    const scalingKey = Object.keys(currentMeta).find(
      k => SCALING_KEYS.has(k) && typeof currentMeta[k] === 'number' && currentMeta[k] > 0
    );
    if (scalingKey) {
      const currentVal = currentMeta[scalingKey] as number;
      // Find recent runs that have the same scaling key with a valid value
      const runsWithKey = entry.recentRuns.filter(
        r => typeof r.meta?.[scalingKey] === 'number' && r.meta[scalingKey] > 0 && r.durationMs > 0
      );
      if (runsWithKey.length > 0) {
        const latest = runsWithKey[runsWithKey.length - 1];
        const latestVal = latest.meta[scalingKey] as number;
        const msPerUnit = latest.durationMs / latestVal;
        const estimate = Math.round(msPerUnit * currentVal);
        if (estimate > 0) return Math.max(estimate, 2000);
      }
    }
  }

  // Fall back to simple average (always at least 2s)
  return Math.max(entry.avgMs, 2000);
}

/**
 * Get detailed timing info for a workflow step: avgMs, lastMs, count.
 * Returns null if no data recorded yet.
 */
export function getWorkflowTimingDetail(stepKey: string): { avgMs: number; lastMs: number; count: number } | null {
  const stats = loadWorkflowStats();
  const entry = stats[stepKey];
  if (!entry) return null;
  return { avgMs: entry.avgMs, lastMs: entry.lastMs, count: entry.count };
}

/**
 * Get all workflow timing stats.
 */
export function getAllWorkflowStats(): WorkflowTimingStats {
  return loadWorkflowStats();
}

// ── API Service ───────────────────────────────────────────────────────────────

class RN3ApiService {
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;
  private runtimeApiKey: string | null = null;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: import.meta.env.VITE_RN3_API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Timing interceptor — stamp request start time
    this.axiosInstance.interceptors.request.use((config) => {
      (config as any)._startTime = Date.now();
      return config;
    });

    // Timing interceptor — record duration on response (success and error)
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const start = (response.config as any)._startTime;
        if (start) {
          const duration = Date.now() - start;
          const method = response.config.method || 'GET';
          const url = response.config.url || '';
          recordTiming(method, url, duration);
        }
        return response;
      },
      (error) => {
        const config = error?.config;
        if (config?._startTime) {
          const duration = Date.now() - config._startTime;
          const method = config.method || 'GET';
          const url = config.url || '';
          recordTiming(method, url, duration);
        }
        return Promise.reject(error);
      },
    );

    // Request interceptor to add auth token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Check if token is expired and refresh if needed
        if (this.tokenExpiry && Date.now() >= this.tokenExpiry) {
          if (this.refreshToken) {
            await this.refreshAccessToken();
          } else {
            // Token expired with no refresh token — clear and fall through to ApiKey
            this.accessToken = null;
            this.tokenExpiry = null;
          }
        }

        if (config.headers) {
          // Add accept header
          config.headers.Accept = 'application/json';

          // Skip auth header for the token generation endpoint or if already set
          const isTokenEndpoint = config.url?.includes('/user/generateToken');
          const hasAuthHeader = !!config.headers.Authorization;

          // Add access token if available (Bearer token for JWT)
          if (!isTokenEndpoint && !hasAuthHeader && this.accessToken) {
            config.headers.Authorization = `Bearer ${this.accessToken}`;
          }
          // Otherwise use ApiKey authentication
          else if (!isTokenEndpoint && !hasAuthHeader) {
            const apiKey = this.runtimeApiKey ?? import.meta.env.VITE_RN3_API_KEY;
            if (apiKey) {
              config.headers.Authorization = `ApiKey ${apiKey}`;
            }
            // Fallback to Basic Auth if no API key but credentials available
            else {
              const username = import.meta.env.VITE_RN3_CUSTODIAN_USERNAME;
              const password = import.meta.env.VITE_RN3_CUSTODIAN_PASSWORD;
              if (username && password) {
                const basicAuth = btoa(`${username}:${password}`);
                config.headers.Authorization = `Basic ${basicAuth}`;
              }
            }
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and we haven't retried yet, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            await this.refreshAccessToken();
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            // If refresh fails, clear tokens and reject
            this.clearTokens();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Authenticate with RN3 API using username and password
   */
  async authenticate(username?: string, password?: string): Promise<void> {
    try {
      const authUsername = username || import.meta.env.VITE_RN3_CUSTODIAN_USERNAME;
      const authPassword = password || import.meta.env.VITE_RN3_CUSTODIAN_PASSWORD;

      if (!authUsername || !authPassword) {
        throw new Error('Authentication credentials not provided');
      }

      // Note: The actual authentication endpoint might be different
      // This is a placeholder - you'll need to adjust based on RN3 API docs
      const response = await this.axiosInstance.post<RN3AuthResponse>('/auth/login', {
        username: authUsername,
        password: authPassword,
      });

      this.setTokens(response.data);
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.axiosInstance.post<RN3AuthResponse>('/auth/refresh', {
        refreshToken: this.refreshToken,
      });

      this.setTokens(response.data);
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Set authentication tokens and calculate expiry
   */
  private setTokens(authData: RN3AuthResponse): void {
    this.accessToken = authData.accessToken;
    this.refreshToken = authData.refreshToken;
    // Set expiry to 90% of actual expiry to refresh before it expires
    this.tokenExpiry = Date.now() + (authData.expiresIn * 1000 * 0.9);
  }

  /**
   * Clear all authentication tokens
   */
  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null &&
           this.tokenExpiry !== null &&
           Date.now() < this.tokenExpiry;
  }

  /**
   * Get all dataflows
   */
  async getDataflows(): Promise<RN3Dataflow[]> {
    try {
      const response = await this.axiosInstance.get<RN3Dataflow[]>('/dataflows');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch dataflows:', error);
      throw error;
    }
  }

  /**
   * Get a specific dataflow by ID (includes datasets list)
   * Endpoint: /dataflow/v1/{dataflowId}
   */
  async getDataflow(dataflowId: number): Promise<RN3Dataflow> {
    try {
      const response = await this.axiosInstance.get<RN3Dataflow>(`/dataflow/v1/${dataflowId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch dataflow ${dataflowId}:`, error);
      throw error;
    }
  }

  /**
   * Get datasets for a dataflow
   */
  async getDatasets(dataflowId: number): Promise<RN3Dataset[]> {
    try {
      const response = await this.axiosInstance.get<RN3Dataset[]>(
        `/dataflows/${dataflowId}/datasets`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch datasets for dataflow ${dataflowId}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific dataset
   */
  async getDataset(dataflowId: number, datasetId: number): Promise<RN3Dataset> {
    try {
      const response = await this.axiosInstance.get<RN3Dataset>(
        `/dataflows/${dataflowId}/datasets/${datasetId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch dataset ${datasetId}:`, error);
      throw error;
    }
  }

  /**
   * READ dataset schema (READ-ONLY operation)
   * This gets the schema with tables and fields for a dataset
   * Endpoint: /dataschema/v1/datasetId/{datasetId}
   */
  async getDatasetSchema(datasetId: number | string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/dataschema/v1/datasetId/${datasetId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch dataset schema for ${datasetId}:`, error);
      throw error;
    }
  }

  /**
   * READ ETL export data for a dataset (READ-ONLY operation)
   * This exports the actual data from the dataset
   * Endpoint: /dataset/v3/etlExport/{datasetId}?dataflowId={dataflowId}
   */
  async getEtlExportData(datasetId: number | string, dataflowId: number | string): Promise<RN3ExportJobResponse> {
    try {
      const response = await this.axiosInstance.get<RN3ExportJobResponse>(`/dataset/v3/etlExport/${datasetId}?dataflowId=${dataflowId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch ETL export for dataset ${datasetId}:`, error);
      throw error;
    }
  }

  /**
   * Export dataset as a ZIP of CSVs (Citus DB / standard datasets).
   * Endpoint: /exportDatasetFile/{datasetId}?mimeType=csv
   */
  async exportDatasetFile(datasetId: number | string): Promise<Blob> {
    try {
      const response = await this.axiosInstance.get(
        `/dataset/v1/exportDatasetFile/${datasetId}?mimeType=csv`,
        { responseType: 'arraybuffer' }
      );
      console.log('exportDatasetFile — downloaded', response.data.byteLength, 'bytes');
      return new Blob([response.data], { type: 'application/zip' });
    } catch (error) {
      console.error(`exportDatasetFile failed for dataset ${datasetId}:`, error);
      throw error;
    }
  }

  /**
   * READ ETL export data for a dataset using v2 endpoint (Citus DB).
   * Endpoint: /dataset/v2/etlExport/{datasetId}?dataflowId={dataflowId}
   */
  async getEtlExportDataV2(datasetId: number | string, dataflowId: number | string, exportCsv = true): Promise<RN3ExportJobResponse> {
    try {
      const response = await this.axiosInstance.get<RN3ExportJobResponse>(`/dataset/v2/etlExport/${datasetId}?dataflowId=${dataflowId}&exportCsv=${exportCsv}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch ETL v2 export for dataset ${datasetId}:`, error);
      throw error;
    }
  }

  /**
   * Download raw ZIP file (for CSV imports — no JSON extraction)
   */
  async downloadRawZip(downloadUrl: string): Promise<Blob> {
    try {
      const response = await this.axiosInstance.get(downloadUrl, {
        responseType: 'arraybuffer',
      });
      console.log('Downloaded ZIP file, size:', response.data.byteLength, 'bytes');
      return new Blob([response.data], { type: 'application/zip' });
    } catch (error) {
      console.error('Failed to download ZIP:', error);
      throw error;
    }
  }

  /**
   * Poll orchestrator job status until it's finished
   * Endpoint: provided in the response (orchestratorJobUrl)
   */
  async pollJobStatus(
    jobUrl: string,
    maxAttempts = 60,
    intervalMs = 2000,
    onProgress?: (attempt: number, maxAttempts: number, status?: string) => void
  ): Promise<RN3JobStatusResponse> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await this.axiosInstance.get(jobUrl);
        const status = response.data?.status || response.data?.orchestratorJobStatus;

        console.log(`Job status (attempt ${attempts + 1}):`, status);

        // Notify progress callback
        if (onProgress) {
          onProgress(attempts + 1, maxAttempts, status);
        }

        if (status === 'FINISHED') {
          return response.data;
        }

        if (status === 'FAILED' || status === 'ERROR') {
          console.error('Job failed — full response:', JSON.stringify(response.data, null, 2));
          const reason = response.data?.message || response.data?.error || response.data?.errorMessage || '';
          throw new Error(`Job failed with status: ${status}${reason ? ` — ${reason}` : ''}`);
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        attempts++;
      } catch (error) {
        console.error('Error polling job status:', error);
        throw error;
      }
    }

    throw new Error(`Job did not finish after ${maxAttempts} attempts`);
  }

  /**
   * Download and extract data from ZIP file
   * Endpoint: provided in the response (downloadUrl)
   * Returns the parsed JSON data from the ZIP file
   */
  async downloadData(downloadUrl: string, onRawZip?: (blob: Blob) => void): Promise<RN3EtlExportData> {
    try {
      // Download as binary data (blob)
      const response = await this.axiosInstance.get(downloadUrl, {
        responseType: 'arraybuffer'
      });

      console.log('Downloaded ZIP file, size:', response.data.byteLength, 'bytes');

      // Optionally expose the raw ZIP to the caller (e.g. to save to disk)
      if (onRawZip) {
        onRawZip(new Blob([response.data], { type: 'application/zip' }));
      }

      // Extract JSON from ZIP
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(response.data);

      console.log('ZIP contents:', Object.keys(zipContent.files));

      // Find the JSON file in the ZIP (usually there's only one file)
      const jsonFileName = Object.keys(zipContent.files).find(name => name.endsWith('.json'));

      if (!jsonFileName) {
        throw new Error('No JSON file found in ZIP archive');
      }

      console.log('Extracting JSON file:', jsonFileName);

      // Extract and parse the JSON file
      const jsonContent = await zipContent.files[jsonFileName].async('text');
      const parsedData = JSON.parse(jsonContent);

      console.log('Successfully parsed JSON data');

      return parsedData;
    } catch (error) {
      console.error('Failed to download and extract data:', error);
      throw error;
    }
  }

  /**
   * Complete ETL export workflow:
   * 1. Trigger export job
   * 2. Poll job status until finished
   * 3. Download the data
   */
  async exportDatasetWithPolling(datasetId: number | string, dataflowId: number | string): Promise<RN3EtlExportData> {
    try {
      // Step 1: Trigger the export job
      console.log('Step 1: Triggering export job...');
      const exportResponse = await this.getEtlExportData(datasetId, dataflowId);

      console.log('Export Response:', exportResponse);
      console.log('Status:', exportResponse.status);

      const pollingUrl = exportResponse.pollingUrl;

      if (!pollingUrl) {
        console.error('Response does not contain pollingUrl. Full response:', exportResponse);
        throw new Error(`No pollingUrl in response. Available keys: ${Object.keys(exportResponse).join(', ')}`);
      }

      console.log('Export job triggered. Polling URL:', pollingUrl);

      // Step 2: Poll until job is finished
      console.log('Step 2: Polling job status...');
      const jobResult = await this.pollJobStatus(pollingUrl);

      console.log('Job finished! Result:', jobResult);

      // Step 3: Download the data
      // The jobResult should contain the download URL or the data itself
      const downloadUrl = jobResult.downloadUrl || jobResult.url;

      if (downloadUrl) {
        console.log('Step 3: Downloading data from:', downloadUrl);
        const data = await this.downloadData(downloadUrl);
        return data;
      } else {
        // If no download URL, the data might be in the job result itself
        console.log('No download URL found. Returning job result data.');
        return jobResult;
      }
    } catch (error) {
      console.error('ETL export workflow failed:', error);
      throw error;
    }
  }

  /**
   * Alias for getDatasetSchema for backward compatibility
   * Note: dataflowId parameter is kept for backward compatibility but not used
   */
  async getDatasetData(_dataflowId: number | string, datasetId: number | string): Promise<any> {
    return this.getDatasetSchema(datasetId);
  }

  /**
   * Generic GET request
   */
  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.get<T>(endpoint, config);
      return response.data;
    } catch (error) {
      console.error(`GET request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Generic POST request
   */
  async post<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.post<T>(endpoint, data, config);
      return response.data;
    } catch (error) {
      console.error(`POST request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Generic PUT request
   */
  async put<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.put<T>(endpoint, data, config);
      return response.data;
    } catch (error) {
      console.error(`PUT request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Generic DELETE request
   */
  async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.delete<T>(endpoint, config);
      return response.data;
    } catch (error) {
      console.error(`DELETE request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Configure runtime API settings (overrides env variables)
   */
  configure(baseUrl: string, apiKey?: string): void {
    this.axiosInstance.defaults.baseURL = baseUrl;
    if (apiKey !== undefined) {
      this.runtimeApiKey = apiKey || null;
    }
    // Clear any lingering bearer token so ApiKey auth takes effect immediately
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get the simple schema for a dataset: all tables with their field names and types.
   * Endpoint: /dataschema/v1/getSimpleSchema/dataset/{datasetId}?dataflowId={dataflowId}
   */
  async getSimpleSchema(datasetId: string | number, dataflowId: string | number): Promise<any> {
    try {
      const response = await this.axiosInstance.get(
        `/dataschema/v1/getSimpleSchema/dataset/${datasetId}?dataflowId=${dataflowId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch simple schema for dataset ${datasetId}:`, error);
      throw error;
    }
  }

  /**
   * Check if the API is reachable and credentials are valid.
   * Uses the getSimpleSchema endpoint and only returns true on HTTP 200.
   */
  async checkConnection(datasetId: string | number, dataflowId: string | number): Promise<boolean> {
    try {
      console.log('[checkConnection] baseURL:', this.axiosInstance.defaults.baseURL,
        'runtimeApiKey:', this.runtimeApiKey ? '***set***' : 'null',
        'accessToken:', this.accessToken ? '***set***' : 'null',
        'tokenExpiry:', this.tokenExpiry);
      await this.getSimpleSchema(datasetId, dataflowId);
      console.log('[checkConnection] SUCCESS');
      return true;
    } catch (err: any) {
      console.error('[checkConnection] FAILED:', err?.message, err?.response?.status, err?.response?.data);
      return false;
    }
  }

  /**
   * Set an access token directly (e.g. from /user/generateToken).
   * Next requests will use Bearer authentication until clearAccessToken is called.
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
    this.tokenExpiry = Date.now() + 3600 * 1000; // 1 hour
  }

  /**
   * Clear the access token so the client falls back to ApiKey authentication.
   */
  clearAccessToken(): void {
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Logout and clear tokens
   */
  logout(): void {
    this.clearTokens();
  }
}

// Export a singleton instance
export const rn3Api = new RN3ApiService();

// Export the class for testing or creating multiple instances
export default RN3ApiService;
