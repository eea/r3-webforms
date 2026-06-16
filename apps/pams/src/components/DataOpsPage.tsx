import { useEffect, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useSignalR } from '../contexts/SignalRContext';
import { useWorkflowProgress } from '../hooks/useWorkflowProgress';
import { saveDataset, loadDataset, clearDataset } from '../db';
import { clearValidationData } from './validation';
import SidebarMenu, { type MenuKey } from './SidebarMenu';
import PushPage from './PushPage';
import PullPage from './PullPage';
import DataflowPage from './DataflowPage';
import TreeViewPage from './TreeViewPage';
import PamsDetailsPage from './PamsDetailsPage';
import StatisticsPage from './StatisticsPage';
import { buildColumnsAndRows } from './treeview';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const DATAFLOW_NAME = 'Governance Regulation - Annex I';

function DataOpsPage() {
  const { dataflowId, datasetId } = useAuth();
  const { connection, sendHeartbeat } = useSignalR();
  const pull = useWorkflowProgress('pull');

  const [etlData, setEtlData] = useState<any>(null);
  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<MenuKey>('export');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [modifiedTableData, setModifiedTableData] = useState<Record<string, any[]>>({});
  const [tableFieldNames, setTableFieldNames] = useState<Record<string, string[]>>({});
  const [hasLock, setHasLock] = useState(false);

  const datasetKey = `${dataflowId}:${datasetId}`;

  // ── Hydrate from IndexedDB on mount ───────────────────────────────────────
  useEffect(() => {
    if (!dataflowId || !datasetId) return;
    loadDataset(datasetKey).then(cached => {
      if (cached) {
        setEtlData(cached.data);
        setCacheTimestamp(cached.pulledAt);
      }
    });
    fetchFieldNames();
  }, [dataflowId, datasetId]);

  // ── Heartbeat while lock is held ──────────────────────────────────────────
  useEffect(() => {
    if (!hasLock || !datasetKey) return;
    const id = setInterval(() => sendHeartbeat(datasetKey), 60_000);
    return () => clearInterval(id);
  }, [hasLock, datasetKey, sendHeartbeat]);

  // ── Handle pull completion ─────────────────────────────────────────────────
  useEffect(() => {
    if (pull.status !== 'done' || !pull.result) return;
    const timestamp = new Date().toISOString();
    setEtlData(pull.result);
    setCacheTimestamp(timestamp);
    setHasLock(true);
    saveDataset(datasetKey, pull.result);
    fetchFieldNames();
  }, [pull.status, pull.result]);

  // ── Fetch schema (field names) from BFF ───────────────────────────────────
  const fetchFieldNames = async () => {
    if (!dataflowId || !datasetId) return;
    try {
      const res = await fetch(`${API}/api/${dataflowId}/${datasetId}/schema`, { credentials: 'include' });
      if (!res.ok) return;
      const schema = await res.json();
      const fieldMap: Record<string, string[]> = {};
      for (const table of schema?.tables ?? []) {
        fieldMap[table.tableName ?? table.name] = (table.fields ?? []).map((f: any) => f.fieldName ?? f.name);
      }
      setTableFieldNames(fieldMap);
    } catch {
      // Schema is optional — app still works without it
    }
  };

  // ── Pull ──────────────────────────────────────────────────────────────────
  const handleExportData = async () => {
    if (!connection?.connectionId) {
      alert('SignalR not connected. Please wait a moment and try again.');
      return;
    }
    pull.reset();
    await fetch(`${API}/api/${dataflowId}/${datasetId}/pull`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionId: connection.connectionId }),
    });
    // Result delivered via SignalR WorkflowComplete → handled in useEffect above
  };

  // ── Clear cache ───────────────────────────────────────────────────────────
  const handleClearCache = () => {
    clearDataset(datasetKey);
    clearValidationData();
    setEtlData(null);
    setCacheTimestamp(null);
    setHasLock(false);
    setModifiedTableData({});
    setTableFieldNames({});
    pull.reset();
  };

  // ── allTables (unchanged logic) ───────────────────────────────────────────
  const extractFieldNames = (records: any[]): string[] | undefined => {
    if (!records?.length) return undefined;
    const first = records[0];
    if (first.fields && Array.isArray(first.fields)) {
      return first.fields.map((f: any) => (f.fieldName || '').replace(/\uFEFF/g, ''));
    }
    const internal = new Set(['id_table_schema', 'id_record', 'countryCode', 'datasetPartitionId', 'dataProviderId']);
    return Object.keys(first).filter(k => !internal.has(k)).map(k => k.replace(/\uFEFF/g, ''));
  };

  const allTables = useMemo(() => {
    if (!etlData) return [];
    const dataByName: Record<string, any[]> = {};
    if (etlData.tables && Array.isArray(etlData.tables)) {
      for (const table of etlData.tables) {
        if (table.tableName) dataByName[table.tableName] = Array.isArray(table.records) ? table.records : [];
      }
    }

    const schemaTableNames = Object.keys(tableFieldNames);
    let tables: Array<{ name: string; records: any[]; index: number; fieldNames?: string[] }>;

    if (schemaTableNames.length > 0) {
      tables = schemaTableNames.map((name, index) => ({
        name, records: dataByName[name] || [], index, fieldNames: tableFieldNames[name],
      }));
      for (const tableName of Object.keys(dataByName)) {
        if (!tableFieldNames[tableName]) {
          tables.push({ name: tableName, records: dataByName[tableName], index: tables.length, fieldNames: extractFieldNames(dataByName[tableName]) });
        }
      }
    } else {
      tables = (etlData.tables || []).map((table: any, index: number) => ({
        name: table.tableName || `Table ${index + 1}`,
        records: Array.isArray(table.records) ? table.records : [],
        index,
        fieldNames: extractFieldNames(Array.isArray(table.records) ? table.records : []),
      }));
    }

    return tables.map(table => {
      const modified = modifiedTableData[table.name];
      return modified ? { ...table, records: modified } : table;
    });
  }, [etlData, modifiedTableData, tableFieldNames]);

  const [selectedTableIndex, setSelectedTableIndex] = useState(0);
  const { columns, rows } = useMemo(() => {
    if (allTables.length === 0) return { columns: [], rows: [] };
    return buildColumnsAndRows(allTables[selectedTableIndex] || allTables[0]);
  }, [allTables, selectedTableIndex]);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', pt: '64px' }}>
      <Box sx={{ minHeight: 'calc(100vh - 64px)', display: 'flex' }}>
        <SidebarMenu
          activeMenu={activeMenu}
          onSelect={setActiveMenu}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        />

        <Box sx={{ backgroundColor: 'background.paper', borderRadius: 0, flex: 1, minWidth: 0, boxSizing: 'border-box', textAlign: 'left !important' }}>
          {activeMenu === 'export' && (
            <PullPage
              loading={pull.status === 'running'}
              error={pull.error}
              progress={pull.percent}
              progressMessage={pull.message}
              cacheTimestamp={cacheTimestamp}
              datasetId={Number(datasetId)}
              dataflowId={Number(dataflowId)}
              dataflowName={DATAFLOW_NAME}
              onExport={handleExportData}
              onClearCache={handleClearCache}
            />
          )}

          {activeMenu === 'import' && (
            <PushPage
              allTables={allTables}
              hasData={Boolean(etlData && allTables.length > 0)}
              hasLock={hasLock}
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
              onTableDataChange={(tableName, updatedRecords) =>
                setModifiedTableData(prev => ({ ...prev, [tableName]: updatedRecords }))
              }
            />
          )}

          {activeMenu === 'treeview' && (
            <TreeViewPage
              allTables={allTables}
              hasData={Boolean(etlData && allTables.length > 0)}
              onTableDataChange={(tableName, updatedRecords) =>
                setModifiedTableData(prev => ({ ...prev, [tableName]: updatedRecords }))
              }
            />
          )}

          {activeMenu === 'pamsdetails' && (
            <PamsDetailsPage
              allTables={allTables}
              hasData={Boolean(etlData && allTables.length > 0)}
              datasetId={Number(datasetId)}
              dataflowId={Number(dataflowId)}
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
