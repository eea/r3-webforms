import { useEffect, useMemo, useState } from 'react';
import {
  Box,
} from '@mui/material';
import { rn3Api } from '../services/rn3Api';
import { clearValidationData } from './validation';
import type { RN3EtlExportData } from '../types/rn3';
import SidebarMenu, { type MenuKey } from './SidebarMenu';
import PushPage from './PushPage';
import PullPage from './PullPage';
import DataflowPage from './DataflowPage';
import TreeViewPage from './TreeViewPage';
import PamsDetailsPage from './PamsDetailsPage';
import StatisticsPage from './StatisticsPage';
import { buildColumnsAndRows } from './treeview';

const CACHE_KEY = 'rn3_etl_export_cache';
const CACHE_TIMESTAMP_KEY = 'rn3_etl_export_cache_timestamp';
const SCHEMA_CACHE_KEY = 'rn3_schema_field_names_cache';

// Default export configuration (overridden by login popup values)
const DEFAULT_DATASET_ID = 40468;
const DEFAULT_DATAFLOW_ID = 12313;
const DATAFLOW_NAME = 'Governance Regulation - Annex I';

// Derive environment from API URL
const getEnvironment = (): string => {
  const apiUrl = import.meta.env.VITE_RN3_API_URL || '';
  if (apiUrl.includes('sandbox') || apiUrl === '/api') {
    return 'sandbox';
  }
  if (apiUrl.includes('prod') || apiUrl.includes('reportnet.europa.eu')) {
    return 'production';
  }
  return 'development';
};
const ENVIRONMENT = getEnvironment();

function DataOpsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [etlData, setEtlData] = useState<RN3EtlExportData | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [jobStatus, setJobStatus] = useState<string | undefined>(undefined);
  const [activeMenu, setActiveMenu] = useState<MenuKey>('export');
  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Read dataset/dataflow IDs from localStorage (set by login popup), fall back to defaults
  const datasetId = Number(localStorage.getItem('rn3_datasetid')) || DEFAULT_DATASET_ID;
  const dataflowId = Number(localStorage.getItem('rn3_dataflowid')) || DEFAULT_DATAFLOW_ID;

  // Track modified table data from TreeView edits
  const [modifiedTableData, setModifiedTableData] = useState<Record<string, any[]>>({});

  // Field names per table (tableName → fieldNames[]) — from getSimpleSchema
  const [tableFieldNames, setTableFieldNames] = useState<Record<string, string[]>>({});

  /**
   * Fetch the simple schema from the API and build a fieldNames map.
   * getSimpleSchema returns ALL 32 tables with their exact field names.
   */
  const fetchAndCacheFieldNames = async () => {
    try {
      const schema = await rn3Api.getSimpleSchema(datasetId, dataflowId);
      const fieldMap: Record<string, string[]> = {};
      if (schema?.tables) {
        for (const table of schema.tables) {
          fieldMap[table.tableName] = table.fields.map((f: any) => f.fieldName);
        }
      }
      setTableFieldNames(fieldMap);
      localStorage.setItem(SCHEMA_CACHE_KEY, JSON.stringify(fieldMap));
      console.log('Simple schema loaded:', Object.keys(fieldMap).length, 'tables');
    } catch (err) {
      console.warn('Could not fetch simple schema:', err);
    }
  };

  // Load cached data on mount
  useEffect(() => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        setEtlData(parsedData);
        setCacheTimestamp(cachedTimestamp);
        setProgress(100);
        setProgressMessage('Loaded from cache');
        const sizeMB = (cachedData.length / 1024 / 1024).toFixed(2);
        console.log('Loaded cached export data from', cachedTimestamp, `(${sizeMB} MB)`);
      }

      // Always fetch schema from API — it's the source of truth for table structure
      fetchAndCacheFieldNames();
    } catch (err) {
      console.error('Failed to load cached data:', err);
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    }
  }, []);

  const handleClearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    localStorage.removeItem(SCHEMA_CACHE_KEY);
    localStorage.removeItem('pams_details_draft_v1');
    clearValidationData();
    setEtlData(null);
    setCacheTimestamp(null);
    setProgress(0);
    setProgressMessage('');
    setJobStatus(undefined);
    setError(null);
    setModifiedTableData({});
    setTableFieldNames({});
    console.log('Cache cleared');
  };

  const handleExportData = async () => {
    setLoading(true);
    setError(null);
    setEtlData(null);
    setProgress(0);
    setProgressMessage('');
    setJobStatus(undefined);

    try {
      // Step 1: Triggering export job
      setProgress(33);
      setProgressMessage('Triggering export job...');
      await new Promise(resolve => setTimeout(resolve, 100)); // Allow UI to update

      const exportResponse = await rn3Api.getEtlExportData(datasetId, dataflowId);
      const pollingUrl = exportResponse.pollingUrl;

      if (!pollingUrl) {
        throw new Error('No polling URL received from server');
      }
      // Step 2: Polling job status
      setProgress(66);
      setProgressMessage('Waiting for job to complete...');
      const jobResult = await rn3Api.pollJobStatus(
        pollingUrl,
        24,
        5000,
        (attempt, maxAttempts, status) => {
          // Progress from 66% to 90% during polling
          const pollingProgress = 66 + Math.floor((attempt / maxAttempts) * 24);
          setProgress(pollingProgress);
          setProgressMessage(`Waiting for job to complete... (${attempt})`);
          if (status) {
            setJobStatus(status);
          }
        }
      );
      // Step 3: Downloading and extracting data
      setProgress(90);
      setProgressMessage('Downloading and extracting data...');
      const downloadUrl = jobResult.downloadUrl || jobResult.url;

      if (!downloadUrl) {
        throw new Error('No download URL received from server');
      }

      const data = await rn3Api.downloadData(downloadUrl);

      setProgress(100);
      setProgressMessage('Export completed successfully!');
      setJobStatus('FINISHED');
      setEtlData(data);

      // Fetch field names from simple schema (all 32 tables)
      await fetchAndCacheFieldNames();

      // Cache the data for development
      try {
        const timestamp = new Date().toISOString();
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp);
        setCacheTimestamp(timestamp);
        console.log('Cached export data at', timestamp);
      } catch (err) {
        console.error('Failed to cache data:', err);
      }

      // Log the complete data structure to console
      console.log('=== ETL Export Data ===');
      console.log('Full data object:', data);
      console.log('Data structure:', {
        hasTables: !!data.tables,
        hasRecords: !!data.records,
        tablesCount: data.tables?.length || 0,
        recordsCount: data.records?.length || 0,
        metadata: data.metadata
      });
      if (data.tables && data.tables.length > 0) {
        console.log('First table:', data.tables[0]);
        console.log('First table records count:', data.tables[0].records?.length || 0);
        if (data.tables[0].records && data.tables[0].records.length > 0) {
          console.log('First record sample:', data.tables[0].records[0]);
        }
      }

    } catch (err: any) {
      let errorMsg = 'Failed to export data';

      if (err.response) {
        console.error('Error Response:', err.response.data);
        errorMsg = `${err.response.status}: ${
          err.response.data?.message ||
          err.response.data?.error ||
          JSON.stringify(err.response.data) ||
          err.message
        }`;
      } else if (err.request) {
        errorMsg = 'No response from server';
      } else {
        errorMsg = err.message;
      }

      setError(errorMsg);
      setProgress(0);
      setProgressMessage('');
      setJobStatus(undefined);
      console.error('Export error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Extract field names from a nested v3 record's fields array
  const extractFieldNames = (records: any[]): string[] | undefined => {
    if (!records || records.length === 0) return undefined;
    const first = records[0];
    if (first.fields && Array.isArray(first.fields)) {
      return first.fields.map((f: any) => (f.fieldName || '').replace(/\uFEFF/g, ''));
    }
    // Already flat — return keys (excluding internal fields)
    const internal = new Set(['id_table_schema', 'id_record', 'countryCode', 'datasetPartitionId', 'dataProviderId']);
    return Object.keys(first).filter(k => !internal.has(k)).map(k => k.replace(/\uFEFF/g, ''));
  };

  // Build allTables from schema (source of truth) + data records
  const allTables = useMemo(() => {
    if (!etlData) return [];

    // Build a lookup of data records by table name
    const dataByName: Record<string, any[]> = {};
    if (etlData.tables && Array.isArray(etlData.tables)) {
      for (const table of etlData.tables) {
        if (table.tableName) {
          dataByName[table.tableName] = Array.isArray(table.records) ? table.records : [];
        }
      }
    }

    // Schema drives the structure: one entry per schema table
    const schemaTableNames = Object.keys(tableFieldNames);
    let tables: Array<{ name: string; records: any[]; index: number; fieldNames?: string[] }>;

    if (schemaTableNames.length > 0) {
      // Schema is loaded — use it as the master list
      tables = schemaTableNames.map((name, index) => ({
        name,
        records: dataByName[name] || [],
        index,
        fieldNames: tableFieldNames[name],
      }));
      // Add any data tables NOT in schema (shouldn't happen, but safety)
      for (const tableName of Object.keys(dataByName)) {
        if (!tableFieldNames[tableName]) {
          tables.push({
            name: tableName,
            records: dataByName[tableName],
            index: tables.length,
            fieldNames: extractFieldNames(dataByName[tableName]),
          });
        }
      }
    } else {
      // Schema not loaded yet — fall back to data tables
      tables = (etlData.tables || []).map((table: any, index: number) => ({
        name: table.tableName || `Table ${index + 1}`,
        records: Array.isArray(table.records) ? table.records : [],
        index,
        fieldNames: extractFieldNames(Array.isArray(table.records) ? table.records : []),
      }));
    }

    // Apply any modifications from TreeView edits
    return tables.map((table) => {
      const modified = modifiedTableData[table.name];
      return modified ? { ...table, records: modified } : table;
    });
  }, [etlData, modifiedTableData, tableFieldNames]);

  // State for selected table
  const [selectedTableIndex, setSelectedTableIndex] = useState(0);

  // Transform ETL data into DataGrid format for selected table
  const { columns, rows } = useMemo(() => {
    if (allTables.length === 0) return { columns: [], rows: [] };
    const selectedTable = allTables[selectedTableIndex] || allTables[0];
    return buildColumnsAndRows(selectedTable);
  }, [allTables, selectedTableIndex]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        pt: '64px',
      }}
    >
      <Box
        sx={{
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
        }}
      >
        <SidebarMenu
          activeMenu={activeMenu}
          onSelect={setActiveMenu}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />

        <Box
          sx={{
            backgroundColor: 'background.paper',
            borderRadius: 0,
            flex: 1,
            minWidth: 0,
            boxSizing: 'border-box',
            textAlign: 'left !important',
          }}
        >
          {activeMenu === 'export' && (
            <PullPage
              loading={loading}
              error={error}
              progress={progress}
              progressMessage={progressMessage}
              jobStatus={jobStatus}
              cacheTimestamp={cacheTimestamp}
              datasetId={datasetId}
              dataflowId={dataflowId}
              dataflowName={DATAFLOW_NAME}
              environment={ENVIRONMENT}
              onExport={handleExportData}
              onClearCache={handleClearCache}
            />
          )}

          {activeMenu === 'import' && (
            <PushPage
              allTables={allTables}
              hasData={Boolean(etlData && allTables.length > 0)}
            />
          )}

          {activeMenu === 'dataflow' && (
            <DataflowPage
              columns={columns}
              rows={rows}
              hasData={Boolean(etlData && rows.length > 0)}
              allTables={allTables}
              selectedTableIndex={selectedTableIndex}
              onTableSelect={setSelectedTableIndex}
              onTableDataChange={(tableName, updatedRecords) => {
                setModifiedTableData((prev) => ({
                  ...prev,
                  [tableName]: updatedRecords,
                }));
              }}
            />
          )}

          {activeMenu === 'treeview' && (
            <TreeViewPage
              allTables={allTables}
              hasData={Boolean(etlData && allTables.length > 0)}
              onTableDataChange={(tableName, updatedRecords) => {
                setModifiedTableData((prev) => ({
                  ...prev,
                  [tableName]: updatedRecords,
                }));
              }}
            />
          )}

          {activeMenu === 'pamsdetails' && (
            <PamsDetailsPage
              allTables={allTables}
              hasData={Boolean(etlData && allTables.length > 0)}
              datasetId={datasetId}
              dataflowId={dataflowId}
            />
          )}

          {activeMenu === 'statistics' && (
            <StatisticsPage
              allTables={allTables}
              hasData={Boolean(etlData && allTables.length > 0)}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default DataOpsPage;
