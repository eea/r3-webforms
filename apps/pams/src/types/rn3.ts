// RN3 API Types

export interface RN3AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface RN3User {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

export interface RN3Dataflow {
  id: number;
  name: string;
  description: string;
  status: string;
  obligation: {
    id: number;
    title: string;
  };
}

export interface RN3Dataset {
  id: number;
  dataflowId: number;
  name: string;
  status: string;
  createdDate: string;
  modifiedDate: string;
}

export interface RN3ApiError {
  message: string;
  statusCode: number;
  timestamp: string;
}

// ETL Export Types
export interface RN3TableRecord {
  id?: number | string;
  [key: string]: any; // Dynamic fields based on dataset schema
}

export interface RN3Table {
  tableName?: string;
  records: RN3TableRecord[];
  schema?: {
    fields: Array<{
      name: string;
      type: string;
      description?: string;
    }>;
  };
}

export interface RN3EtlExportData {
  tables?: RN3Table[];
  records?: RN3TableRecord[];
  metadata?: {
    datasetId: number;
    dataflowId: number;
    exportDate: string;
    recordCount?: number;
  };
  [key: string]: any; // Allow for additional dynamic properties
}

// Export Job Response Types
export interface RN3ExportJobResponse {
  pollingUrl: string;
  status: string;
  jobId?: string;
  estimatedTime?: number;
}

export interface RN3JobStatusResponse {
  status: 'FINISHED' | 'PENDING' | 'IN_PROGRESS' | 'FAILED' | 'ERROR';
  downloadUrl?: string;
  url?: string;
  error?: string;
  progress?: number;
}
