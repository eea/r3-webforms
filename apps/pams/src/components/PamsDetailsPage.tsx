import { useState, useMemo, useEffect } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import PolicyIcon from '@mui/icons-material/Policy';
import TuneIcon from '@mui/icons-material/Tune';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FindReplaceIcon from '@mui/icons-material/FindReplace';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DescriptionIcon from '@mui/icons-material/Description';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { getTabDefinitions } from '../schema/pamViewConfig';
import {
  type TableInfo,
  type FieldFilter,
  type FieldValueWithTable,
  type AdvancedFieldFilter,
  type AdvancedFilters,
  type StatusFilter,
  UnifiedFieldDialog,
  DeleteConfirmDialog,
  SinglePamDeleteDialog,
  AdvancedFilterPanel,
  usePamFiltering,
  usePamDialogs,
  usePamEditing,
  PamListPanel,
  PamDetailsPanel,
} from './pams';
import {
  applyAdvancedFindReplace,
  applySimpleFindReplace,
  createRecords,
} from './pams/findReplaceUtils';
import type { SimpleFindReplaceRow } from './pams/UnifiedFieldDialog';
import { type ValidationRow, VALIDATION_CLEARED_EVENT, VALIDATION_UPDATED_EVENT } from './validation';
import ValidationWorkflow from './ValidationWorkflow';

type PamsDetailsPageProps = {
  allTables: TableInfo[];
  hasData: boolean;
  datasetId?: number;
  dataflowId?: number;
};

const PAMS_DRAFT_STORAGE_KEY = 'pams_details_draft_v1';

function PamsDetailsPage({ allTables, hasData }: PamsDetailsPageProps) {
  const [selectedPamId, setSelectedPamId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Reorder mode
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [pamOrder, setPamOrder] = useState<any[]>([]);
  const [, setHasReordered] = useState(false);
  const [reorderIdMode, setReorderIdMode] = useState<'keep' | 'update'>('keep');

  // Multi-select
  const [selectedPamIds, setSelectedPamIds] = useState<Set<number>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  // PAM list visibility
  const [isPamListHidden, setIsPamListHidden] = useState(false);

  // Working copy of PAMs / related data
  const [modifiedPams, setModifiedPams] = useState<any[] | null>(null);
  const [modifiedTableData, setModifiedTableData] = useState<Record<string, any[]>>({});
  const [modifiedPamIds, setModifiedPamIds] = useState<Set<number>>(new Set());
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);

  // ── Data processing ──────────────────────────────────────────────────────
  const { pamsRecords, tableMap } = useMemo(() => {
    const map: Record<string, any[]> = {};
    let pams: any[] = [];
    allTables.forEach((table) => {
      const records = table.records.map((r) => {
        if (r.fields && Array.isArray(r.fields)) {
          const flat: any = { ...r };
          r.fields.forEach((f: any) => {
            if (f.fieldName && f.value !== undefined) flat[f.fieldName] = f.value;
          });
          delete flat.fields;
          return flat;
        }
        return r;
      });
      map[table.name] = records;
      if (table.name === 'PaMs') pams = records;
    });
    return { pamsRecords: pams, tableMap: map };
  }, [allTables]);

  const dataSignature = useMemo(
    () => JSON.stringify(allTables.map((t) => ({ name: t.name, count: t.records.length }))),
    [allTables]
  );

  const workingPams = modifiedPams || pamsRecords;

  // DEBUG: trace "new" PAM detection
  useEffect(() => {
    console.log('[PAM Debug] pamsRecords:', pamsRecords.length, 'modifiedPams:', modifiedPams?.length ?? 'null', 'workingPams:', workingPams.length);
    if (pamsRecords.length > 0) {
      const sample = pamsRecords[0];
      console.log('[PAM Debug] pamsRecords[0] keys:', Object.keys(sample), 'Id:', sample.Id, 'id:', sample.id);
    }
    if (workingPams.length > 0) {
      const sample = workingPams[0];
      console.log('[PAM Debug] workingPams[0] keys:', Object.keys(sample), 'Id:', sample.Id, 'id:', sample.id);
    }
  }, [pamsRecords, modifiedPams, workingPams]);

  const workingTableMap = useMemo(() => {
    const map = { ...tableMap };
    if (modifiedPams) map['PaMs'] = modifiedPams;
    Object.entries(modifiedTableData).forEach(([name, records]) => { map[name] = records; });
    return map;
  }, [tableMap, modifiedPams, modifiedTableData]);

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const filtering = usePamFiltering(workingPams, pamsRecords, modifiedPamIds);
  const dialogs = usePamDialogs();

  const selectedPam = useMemo(() => {
    if (selectedPamId === null && workingPams.length > 0) return workingPams[0];
    return workingPams.find((p) => p.Id === selectedPamId || p.id === selectedPamId);
  }, [selectedPamId, workingPams]);

  const relatedData = useMemo(() => {
    if (!selectedPam) return {};
    const pamId = Number(selectedPam.Id || selectedPam.id);
    const effectiveMap = { ...tableMap, ...modifiedTableData };
    if (modifiedPams) effectiveMap['PaMs'] = modifiedPams;
    const related: Record<string, any[]> = {};
    Object.entries(effectiveMap).forEach(([name, records]) => {
      if (name === 'PaMs') return;
      related[name] = records.filter((r) => Number(r.Fk_PaMs ?? r.fk_pams ?? -1) === pamId);
    });
    return related;
  }, [selectedPam, tableMap, modifiedPams, modifiedTableData]);

  // Re-evaluate validation map when data is cleared or updated
  const [valVersion, setValVersion] = useState(0);
  useEffect(() => {
    const onClear = () => setValVersion((v) => v + 1);
    window.addEventListener(VALIDATION_CLEARED_EVENT, onClear);
    window.addEventListener(VALIDATION_UPDATED_EVENT, onClear);
    window.addEventListener('storage', onClear);
    return () => {
      window.removeEventListener(VALIDATION_CLEARED_EVENT, onClear);
      window.removeEventListener(VALIDATION_UPDATED_EVENT, onClear);
      window.removeEventListener('storage', onClear);
    };
  }, []);

  // Build maps: pamId → { errors, warnings } and pamId → ValidationRow[] for the PAM list
  const { pamValidationMap, pamValidationRows } = useMemo(() => {
    try {
      const raw = localStorage.getItem('rn3_validation_results');
      if (!raw) return { pamValidationMap: {}, pamValidationRows: {} };
      const stored = JSON.parse(raw) as { rows: ValidationRow[] };
      if (!stored?.rows?.length) return { pamValidationMap: {}, pamValidationRows: {} };

      const mapResult: Record<number, { errors: number; warnings: number }> = {};
      const rowsResult: Record<number, ValidationRow[]> = {};
      for (const row of stored.rows) {
        if (row.typeEntity === 'TABLE') continue;
        const pamId = row.pamId;
        if (!pamId) continue;
        if (!mapResult[pamId]) mapResult[pamId] = { errors: 0, warnings: 0 };
        if (!rowsResult[pamId]) rowsResult[pamId] = [];
        rowsResult[pamId].push(row);
        const level = row.level?.toUpperCase();
        if (level === 'ERROR' || level === 'BLOCKER') {
          mapResult[pamId].errors++;
        } else if (level === 'WARNING') {
          mapResult[pamId].warnings++;
        }
      }
      return { pamValidationMap: mapResult, pamValidationRows: rowsResult };
    } catch {
      return { pamValidationMap: {}, pamValidationRows: {} };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingPams, valVersion]);

  const editing = usePamEditing({
    selectedPam,
    relatedData,
    workingPams,
    workingTableMap,
    setModifiedPams,
    setModifiedTableData,
    setModifiedPamIds,
  });

  // ── localStorage draft persistence ───────────────────────────────────────
  useEffect(() => {
    if (isDraftHydrated) return;
    if (!hasData || allTables.length === 0) return;

    try {
      const raw = localStorage.getItem(PAMS_DRAFT_STORAGE_KEY);
      if (!raw) { setIsDraftHydrated(true); return; }

      const parsed = JSON.parse(raw) as {
        signature?: string;
        modifiedPams?: any[] | null;
        modifiedTableData?: Record<string, any[]>;
        modifiedPamIds?: Array<number | string>;
        statusFilter?: StatusFilter;
        filterType?: 'all' | 'single' | 'group';
        searchText?: string;
        advancedFilters?: AdvancedFilters;
        showAdvancedFilters?: boolean;
      };

      if (!parsed || parsed.signature !== dataSignature) { setIsDraftHydrated(true); return; }

      if (parsed.modifiedPams && Array.isArray(parsed.modifiedPams)) setModifiedPams(parsed.modifiedPams);
      if (parsed.modifiedTableData) setModifiedTableData(parsed.modifiedTableData);
      if (parsed.modifiedPamIds) setModifiedPamIds(new Set(parsed.modifiedPamIds as number[]));
      if (parsed.statusFilter) filtering.setStatusFilter(parsed.statusFilter);
      if (parsed.filterType) filtering.setFilterType(parsed.filterType);
      if (typeof parsed.searchText === 'string') filtering.setSearchText(parsed.searchText);
      if (parsed.advancedFilters) filtering.setAdvancedFilters(parsed.advancedFilters);
      if (typeof parsed.showAdvancedFilters === 'boolean') filtering.setShowAdvancedFilters(parsed.showAdvancedFilters);

      console.log('Restored PAM draft changes from localStorage');
    } catch (error) {
      console.error('Failed to restore PAM draft changes:', error);
    } finally {
      setIsDraftHydrated(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraftHydrated, hasData, allTables.length, dataSignature]);

  useEffect(() => {
    if (!isDraftHydrated) return;
    const hasPamChanges = modifiedPams !== null;
    const hasRelatedChanges = Object.keys(modifiedTableData).length > 0;
    const hasModifiedFlags = modifiedPamIds.size > 0;

    if (!hasPamChanges && !hasRelatedChanges && !hasModifiedFlags) {
      localStorage.removeItem(PAMS_DRAFT_STORAGE_KEY);
      return;
    }

    try {
      localStorage.setItem(
        PAMS_DRAFT_STORAGE_KEY,
        JSON.stringify({
          signature: dataSignature,
          modifiedPams,
          modifiedTableData,
          modifiedPamIds: Array.from(modifiedPamIds),
          statusFilter: filtering.statusFilter,
          filterType: filtering.filterType,
          searchText: filtering.searchText,
          advancedFilters: filtering.advancedFilters,
          showAdvancedFilters: filtering.showAdvancedFilters,
        })
      );
    } catch (error) {
      console.error('Failed to persist PAM draft changes:', error);
    }
  }, [
    isDraftHydrated,
    dataSignature,
    modifiedPams,
    modifiedTableData,
    modifiedPamIds,
    filtering.statusFilter,
    filtering.filterType,
    filtering.searchText,
    filtering.advancedFilters,
    filtering.showAdvancedFilters,
  ]);

  // Auto-select first PAM when selection is filtered out
  useMemo(() => {
    if (filtering.filteredPams.length > 0) {
      const current = filtering.filteredPams.find((p) => (p.Id || p.id) === selectedPamId);
      if (!current) setSelectedPamId(filtering.filteredPams[0].Id || filtering.filteredPams[0].id);
    }
  }, [filtering.filteredPams, selectedPamId]);

  // ── Reorder handlers ──────────────────────────────────────────────────────
  const handleToggleReorderMode = () => {
    if (!isReorderMode && pamOrder.length === 0) setPamOrder([...filtering.filteredPams]);
    setIsReorderMode(!isReorderMode);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = pamOrder.findIndex((p) => (p.Id || p.id) === active.id);
      const newIndex = pamOrder.findIndex((p) => (p.Id || p.id) === over.id);
      setPamOrder(arrayMove(pamOrder, oldIndex, newIndex));
      setHasReordered(true);
    }
  };

  const handleSaveOrder = () => {
    if (reorderIdMode === 'update') {
      const updatedPams = pamOrder.map((pam, index) => {
        const newId = index + 1;
        const oldId = pam.Id || pam.id;
        if (oldId !== newId) setModifiedPamIds((prev) => new Set([...prev, newId]));
        return { ...pam, Id: newId, id: newId, _originalId: pam._originalId || oldId };
      });
      setModifiedPams(updatedPams);
    } else {
      setModifiedPams([...pamOrder]);
      pamOrder.forEach((pam) => {
        setModifiedPamIds((prev) => new Set([...prev, pam.Id || pam.id]));
      });
    }
    setPamOrder([]);
    setHasReordered(false);
    setIsReorderMode(false);
  };

  const handleCancelReorder = () => {
    setPamOrder([]);
    setHasReordered(false);
    setIsReorderMode(false);
    setReorderIdMode('keep');
  };

  // ── Select mode handlers ─────────────────────────────────────────────────
  const handleToggleSelectMode = () => {
    if (isSelectMode) setSelectedPamIds(new Set());
    setIsSelectMode(!isSelectMode);
  };

  const handleTogglePamSelection = (pamId: number) => {
    setSelectedPamIds((prev) => {
      const next = new Set(prev);
      next.has(pamId) ? next.delete(pamId) : next.add(pamId);
      return next;
    });
  };

  const handleSelectAll = () => setSelectedPamIds(new Set(filtering.filteredPams.map((p) => p.Id || p.id)));
  const handleDeselectAll = () => setSelectedPamIds(new Set());

  // ── Bulk / CRUD handlers ──────────────────────────────────────────────────
  const handleReset = () => {
    setModifiedPams(null);
    setModifiedTableData({});
    setModifiedPamIds(new Set());
  };

  const handleFindReplaceSimple = (rows: SimpleFindReplaceRow[]) => {
    const updatesByTable = applySimpleFindReplace(rows, workingTableMap);
    Object.entries(updatesByTable).forEach(([tableName, update]) => {
      if (tableName === 'PaMs') {
        setModifiedPams(update.updatedRecords);
        setModifiedPamIds((prev) => { const next = new Set(prev); update.modifiedIds.forEach((id) => next.add(id)); return next; });
      } else {
        setModifiedTableData((prev) => ({ ...prev, [tableName]: update.updatedRecords }));
      }
    });
  };

  const handleFindReplaceAdvanced = (filters: FieldFilter[], fieldValues: FieldValueWithTable[]) => {
    const updatesByTable = applyAdvancedFindReplace(filters, fieldValues, workingTableMap);
    Object.entries(updatesByTable).forEach(([tableName, update]) => {
      if (tableName === 'PaMs') {
        setModifiedPams(update.updatedRecords);
        setModifiedPamIds((prev) => { const next = new Set(prev); update.modifiedIds.forEach((id) => next.add(id)); return next; });
      } else {
        setModifiedTableData((prev) => ({ ...prev, [tableName]: update.updatedRecords }));
      }
    });
  };

  const handleCreateRecords = (
    tableName: string,
    count: number,
    fieldValues: FieldValueWithTable[],
    linkToPamId?: number,
    cloneFromPamId?: number
  ) => {
    const sourcePamId = Number(cloneFromPamId || 0);
    if (tableName === 'PaMs' && sourcePamId > 0) {
      const sourcePam = workingPams.find((p) => Number(p.Id || p.id || 0) === sourcePamId);
      if (!sourcePam) {
        console.warn(`Source PAM #${sourcePamId} not found for cloning`);
      } else {
        const existingPamIds = workingPams.map((p) => Number(p.Id || p.id || 0)).filter(Boolean);
        const nextPamId = existingPamIds.length > 0 ? Math.max(...existingPamIds) + 1 : 1;
        const pamOverrides = fieldValues.filter((fv) => fv.table === 'PaMs');
        const newPamRecords: any[] = [];

        for (let i = 0; i < count; i++) {
          const newPamId = nextPamId + i;
          const cloneSuffix = `(Clone from PaM: ${sourcePamId})`;
          const baseTitle = String(sourcePam.Title || 'PAM');
          const clonedPam: any = {
            ...sourcePam, Id: newPamId, id: newPamId,
            Title: count > 1 ? `${baseTitle} ${i + 1} ${cloneSuffix}` : `${baseTitle} ${cloneSuffix}`,
          };
          pamOverrides.forEach((fv) => {
            clonedPam[fv.field] = fv.field === 'Title' && count > 1 ? `${fv.value} ${i + 1}` : fv.value;
          });
          if (clonedPam.Title !== undefined) {
            const titleValue = String(clonedPam.Title || '').trim();
            if (!titleValue.includes(cloneSuffix)) clonedPam.Title = `${titleValue || baseTitle} ${cloneSuffix}`.trim();
          }
          newPamRecords.push(clonedPam);
        }

        const relatedTableUpdates: Record<string, any[]> = {};
        Object.entries(workingTableMap).forEach(([relName, records]) => {
          if (relName === 'PaMs') return;
          const sourceRelated = (records || []).filter((r) => Number(r.Fk_PaMs ?? r.fk_pams ?? 0) === sourcePamId);
          if (sourceRelated.length === 0) return;
          const existingIds = (records || []).map((r) => Number(r.Id ?? r.id ?? 0)).filter(Boolean);
          let nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
          const cloned: any[] = [];
          newPamRecords.forEach((newPam) => {
            sourceRelated.forEach((src) => {
              const rec: any = { ...src, Id: nextId, id: nextId };
              delete rec._stableId;
              nextId++;
              if ('Fk_PaMs' in rec || !('fk_pams' in rec)) rec.Fk_PaMs = newPam.Id || newPam.id;
              if ('fk_pams' in rec) rec.fk_pams = newPam.Id || newPam.id;
              cloned.push(rec);
            });
          });
          relatedTableUpdates[relName] = [...(records || []), ...cloned];
        });

        setModifiedPams([...workingPams, ...newPamRecords]);
        setModifiedTableData((prev) => ({ ...prev, ...relatedTableUpdates }));
        setModifiedPamIds((prev) => { const next = new Set(prev); newPamRecords.forEach((r) => next.add(r.Id || r.id)); return next; });
        return;
      }
    }

    const existing = workingTableMap[tableName] || [];
    const { updatedRecords, newRecords } = createRecords(existing, count, fieldValues, linkToPamId);
    if (tableName === 'PaMs') {
      setModifiedPams(updatedRecords);
      setModifiedPamIds((prev) => { const next = new Set(prev); newRecords.forEach((r) => next.add(r.Id as number)); return next; });
    } else {
      setModifiedTableData((prev) => ({ ...prev, [tableName]: updatedRecords }));
    }
  };

  const handleDeletePams = () => {
    const targetIds = selectedPamIds.size > 0 ? Array.from(selectedPamIds) : filtering.filteredPams.map((p) => p.Id || p.id);
    setModifiedPams(workingPams.filter((p) => !targetIds.includes(p.Id || p.id)));
    setSelectedPamIds(new Set());
    dialogs.setShowDeleteDialog(false);
  };

  const handleDeleteSinglePam = () => {
    if (!dialogs.pamToDelete) return;
    setModifiedPams(workingPams.filter((p) => (p.Id || p.id) !== dialogs.pamToDelete!.id));
    if (selectedPamId === dialogs.pamToDelete.id) setSelectedPamId(null);
    dialogs.closeSingleDeleteDialog();
  };

  const handleDiscardPamChanges = (pamId: number) => {
    const originalPam = pamsRecords.find((p) => (p.Id || p.id) === pamId);
    if (!originalPam) return;
    const reverted = workingPams.map((p) => ((p.Id || p.id) === pamId ? originalPam : p));
    const sameAsOriginal =
      reverted.length === pamsRecords.length &&
      reverted.every((p, i) => JSON.stringify(p) === JSON.stringify(pamsRecords[i]));
    setModifiedPams(sameAsOriginal ? null : reverted);

    setModifiedTableData((prev) => {
      const next = { ...prev };
      Object.keys(tableMap).forEach((tableName) => {
        if (tableName === 'PaMs') return;
        const originalRecords = tableMap[tableName] || [];
        const currentRecords = (prev[tableName] ?? tableMap[tableName]) || [];
        const keepOther = currentRecords.filter((r) => Number(r.Fk_PaMs ?? r.fk_pams ?? -1) !== pamId);
        const origForPam = originalRecords.filter((r) => Number(r.Fk_PaMs ?? r.fk_pams ?? -1) === pamId);
        const merged = [...keepOther, ...origForPam];
        const isOriginal =
          merged.length === originalRecords.length &&
          merged.every((r, i) => JSON.stringify(r) === JSON.stringify(originalRecords[i]));
        if (isOriginal) delete next[tableName];
        else next[tableName] = merged;
      });
      return next;
    });

    setModifiedPamIds((prev) => { const next = new Set(prev); next.delete(pamId); return next; });
  };

  const handleQuickEdit = (tableName: string, recordIds: number[], field: string, value: string) => {
    const records = workingTableMap[tableName] || [];
    const targetSet = new Set(recordIds);
    const updated = records.map((r) => targetSet.has(r.Id || r.id) ? { ...r, [field]: value } : r);
    if (tableName === 'PaMs') {
      setModifiedPams(updated);
      setModifiedPamIds((prev) => { const next = new Set(prev); recordIds.forEach((id) => next.add(id)); return next; });
    } else {
      setModifiedTableData((prev) => ({ ...prev, [tableName]: updated }));
    }
  };

  const handleQuickAddPam = () => {
    const maxId = workingPams.reduce((max, p) => Math.max(max, p.Id || p.id || 0), 0);
    const newId = maxId + 1;
    const newPam = {
      Id: newId, id: newId, Title: `New PAM ${newId}`, TitleNational: '', NECP_PamId: '',
      IsGroup: 'Single', Description: '', StatusImplementation: '', TypePolicyInstrument: '',
      GeographicalCoverage: '', QuantifiedObjective: '', Comments: '', Progress: '',
      ImplementationPeriodStart: null, ImplementationPeriodFinish: null,
    };
    filtering.setSearchText('');
    filtering.setStatusFilter('new');
    filtering.setFilterType('all');
    setModifiedPams([newPam, ...workingPams]);
    setSelectedPamId(newId);
    setModifiedPamIds((prev) => new Set([...prev, newId]));
    editing.setEditedPam({ ...newPam });
    editing.setIsEditMode(true);
  };

  const handleClonePam = () => {
    if (!selectedPam) return;
    const maxId = workingPams.reduce((max, p) => Math.max(max, p.Id || p.id || 0), 0);
    const newId = maxId + 1;
    const cloned = { ...selectedPam, Id: newId, id: newId, Title: `Copy of ${selectedPam.Title || 'PAM'}` };
    filtering.setSearchText('');
    filtering.setStatusFilter('new');
    filtering.setFilterType('all');
    setModifiedPams([cloned, ...workingPams]);
    setSelectedPamId(newId);
    setModifiedPamIds((prev) => new Set([...prev, newId]));
    editing.setEditedPam({ ...cloned });
    editing.setIsEditMode(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const tabDefs = getTabDefinitions();

  // Map table names to tab indices for validation navigation
  const tableToTabIndex = useMemo(() => {
    const map: Record<string, number> = {};
    tabDefs.forEach((tab, idx) => { map[tab.field] = idx; });
    // PaMs header fields are visible on all tabs (but show in tab 0 / header card area)
    map['PaMs'] = -1; // special: scroll without tab change
    return map;
  }, [tabDefs]);

  // Navigate to a specific validation field: switch tab + scroll to field
  const handleNavigateToValidation = (pamId: number, table: string, column: string) => {
    // Select the PAM first
    setSelectedPamId(pamId);

    // Find the tab for this table
    const tabIdx = tableToTabIndex[table];
    if (tabIdx !== undefined && tabIdx >= 0) {
      setActiveTab(tabIdx);
    }

    // Wait for tab change and render, then scroll to field
    setTimeout(() => {
      const fieldId = `${table}.${column}`;
      const el = document.querySelector(`[data-field-id="${fieldId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Flash highlight
        const htmlEl = el as HTMLElement;
        htmlEl.style.transition = 'box-shadow 0.3s';
        htmlEl.style.boxShadow = '0 0 0 3px rgba(25, 118, 210, 0.5)';
        setTimeout(() => { htmlEl.style.boxShadow = ''; }, 2000);
      }
    }, 200);
  };
  const displayPams = isReorderMode && pamOrder.length > 0 ? pamOrder : filtering.filteredPams;
  const pamIds = displayPams.map((p) => p.Id || p.id);

  if (!hasData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)', p: 3 }}>
        <Card sx={{ maxWidth: 500 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>No Data Available</Typography>
            <Typography variant="body2" color="text.secondary">
              Please export data first to view PAMs details.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 0 }}>
        {/* Header */}
        <Box sx={{ mb: 0, px: 3, pt: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0 }}>
                <PolicyIcon /> PAMs Details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Explore detailed information about Policies and Measures
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant={dialogs.showBulkOperations ? 'contained' : 'outlined'}
                size="small"
                onClick={() => dialogs.setShowBulkOperations(!dialogs.showBulkOperations)}
                endIcon={dialogs.showBulkOperations ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              >
                Bulk Operations
              </Button>
              <Divider orientation="vertical" flexItem />
              <Button variant="outlined" color="secondary" size="small" onClick={() => dialogs.setShowValidation(true)}>
                Validate
              </Button>
              <Divider orientation="vertical" flexItem />
              <Tooltip title="Reset all changes">
                <span>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<RestartAltIcon />}
                    onClick={handleReset}
                    size="small"
                    disabled={!modifiedPams && Object.keys(modifiedTableData).length === 0}
                  >
                    Reset
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          </Stack>

          {/* Bulk Operations Panel */}
          <Collapse in={dialogs.showBulkOperations}>
            <Box sx={{ mt: 2, p: 1.5, border: '1px solid', borderColor: 'primary.main', borderRadius: 1, backgroundColor: 'primary.50' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2" color="primary" sx={{ mr: 1 }}>Multi-PAM Operations:</Typography>
                <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => dialogs.openCreate()} size="small">
                  Create Records
                </Button>
                <Button variant="outlined" startIcon={<FindReplaceIcon />} onClick={() => dialogs.openFindReplace('PaMs')} size="small">
                  Find and Update
                </Button>
                <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => dialogs.openDelete('PaMs')} size="small">
                  Delete PAMs
                </Button>
              </Stack>
            </Box>
          </Collapse>

          {/* Quick Filters */}
          <Box sx={{ mt: 2, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'grey.50' }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <Chip
                label="All"
                size="small"
                color={filtering.statusFilter === 'all' && filtering.filterType === 'all' ? 'primary' : 'default'}
                variant={filtering.statusFilter === 'all' && filtering.filterType === 'all' ? 'filled' : 'outlined'}
                onClick={() => { filtering.setStatusFilter('all'); filtering.setFilterType('all'); }}
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                label={`New (${workingPams.filter((p) => !filtering.originalPamIds.has(p.Id || p.id)).length})`}
                size="small"
                color={filtering.statusFilter === 'new' ? 'success' : 'default'}
                variant={filtering.statusFilter === 'new' ? 'filled' : 'outlined'}
                onClick={() => filtering.setStatusFilter(filtering.statusFilter === 'new' ? 'all' : 'new')}
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                label={`Modified (${[...modifiedPamIds].filter((id) => filtering.originalPamIds.has(id)).length})`}
                size="small"
                color={filtering.statusFilter === 'modified' ? 'warning' : 'default'}
                variant={filtering.statusFilter === 'modified' ? 'filled' : 'outlined'}
                onClick={() => filtering.setStatusFilter(filtering.statusFilter === 'modified' ? 'all' : 'modified')}
                sx={{ cursor: 'pointer' }}
              />
              <Divider orientation="vertical" flexItem />
              <Chip
                icon={<DescriptionIcon />}
                label={`${filtering.singleCount} Single`}
                size="small"
                color={filtering.filterType === 'single' ? 'info' : 'default'}
                variant={filtering.filterType === 'single' ? 'filled' : 'outlined'}
                onClick={() => filtering.setFilterType(filtering.filterType === 'single' ? 'all' : 'single')}
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                icon={<GroupWorkIcon />}
                label={`${filtering.groupCount} Groups`}
                size="small"
                color={filtering.filterType === 'group' ? 'secondary' : 'default'}
                variant={filtering.filterType === 'group' ? 'filled' : 'outlined'}
                onClick={() => filtering.setFilterType(filtering.filterType === 'group' ? 'all' : 'group')}
                sx={{ cursor: 'pointer' }}
              />
            </Stack>
          </Box>

          <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <Chip icon={<PolicyIcon />} label={`${filtering.filteredPams.length} / ${workingPams.length} PAMs`} color="primary" variant="outlined" size="small" />
              <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
              <Badge badgeContent={filtering.activeFilterCount} color="primary">
                <Chip
                  icon={<TuneIcon />}
                  label="Advanced Filters"
                  color={filtering.showAdvancedFilters ? 'primary' : 'default'}
                  variant={filtering.showAdvancedFilters ? 'filled' : 'outlined'}
                  onClick={() => filtering.setShowAdvancedFilters(!filtering.showAdvancedFilters)}
                  sx={{ cursor: 'pointer' }}
                />
              </Badge>
              {filtering.activeFilterCount > 0 && (
                <Chip
                  label="Clear Filters"
                  variant="outlined"
                  size="small"
                  onDelete={() => filtering.setAdvancedFilters({ textFilters: [], dateFilters: [] })}
                />
              )}
              {(modifiedPams !== null || Object.keys(modifiedTableData).length > 0 || modifiedPamIds.size > 0) && (
                <Chip label={`Changes pending (${modifiedPamIds.size})`} color="warning" size="small" />
              )}
            </Stack>

            {/* PAM Edit Actions */}
            {selectedPam && (
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{
                  pl: 2,
                  borderLeft: '2px solid',
                  borderColor: 'divider',
                }}
              >
                <Chip label={`#${selectedPam.Id || selectedPam.id}`} color="primary" size="small" variant="outlined" />
                {!editing.isEditMode ? (
                  <Tooltip title="Edit PAM">
                    <IconButton size="small" color="primary" onClick={editing.handleStartEdit}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <>
                    <Tooltip title="Save changes">
                      <IconButton size="small" color="primary" onClick={editing.handleSaveEdit}>
                        <SaveIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Cancel changes">
                      <IconButton size="small" onClick={editing.handleCancelEdit}>
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
                <Divider orientation="vertical" flexItem />
                <Tooltip title={`Find and Update - PAM #${selectedPam.Id || selectedPam.id}`}>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() =>
                      dialogs.openFindReplace('PaMs', true, {
                        id: selectedPam.Id || selectedPam.id,
                        title: selectedPam.Title || 'Untitled',
                      })
                    }
                  >
                    <FindReplaceIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={`Delete PAM #${selectedPam.Id || selectedPam.id}`}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      dialogs.setPamToDelete({
                        id: selectedPam.Id || selectedPam.id,
                        title: selectedPam.Title || 'Untitled',
                      });
                      dialogs.setShowDeleteSingleDialog(true);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            )}
          </Stack>

          <Box sx={{ mt: 2 }}>
            <AdvancedFilterPanel
              open={filtering.showAdvancedFilters}
              filters={filtering.advancedFilters}
              onFiltersChange={filtering.setAdvancedFilters}
              onClose={() => filtering.setShowAdvancedFilters(false)}
              tableMap={workingTableMap}
            />
          </Box>
        </Box>

        {/* Main Layout */}
        <Box sx={{ display: 'flex', height: 'calc(100vh - 240px)' }}>
          <PamListPanel
            displayPams={displayPams}
            pamIds={pamIds}
            filteredPams={filtering.filteredPams}
            workingPams={workingPams}
            originalPamIds={filtering.originalPamIds}
            modifiedPamIds={modifiedPamIds}
            selectedPamId={selectedPamId}
            selectedPam={selectedPam}
            isPamListHidden={isPamListHidden}
            setIsPamListHidden={setIsPamListHidden}
            searchText={filtering.searchText}
            setSearchText={filtering.setSearchText}
            isReorderMode={isReorderMode}
            isSelectMode={isSelectMode}
            reorderIdMode={reorderIdMode}
            setReorderIdMode={setReorderIdMode}
            selectedPamIds={selectedPamIds}
            onSelectPam={setSelectedPamId}
            onToggleReorderMode={handleToggleReorderMode}
            onDragEnd={handleDragEnd}
            onSaveOrder={handleSaveOrder}
            onCancelReorder={handleCancelReorder}
            onToggleSelectMode={handleToggleSelectMode}
            onTogglePamSelection={handleTogglePamSelection}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onQuickAddPam={handleQuickAddPam}
            onClonePam={handleClonePam}
            onDiscardPamChanges={handleDiscardPamChanges}
            pamValidationMap={pamValidationMap}
            pamValidationRows={pamValidationRows}
            onNavigateToValidation={handleNavigateToValidation}
          />

          <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
            <PamDetailsPanel
              selectedPam={selectedPam}
              relatedData={relatedData}
              workingPams={workingPams}
              modifiedPamIds={modifiedPamIds}
              originalPamIds={filtering.originalPamIds}
              isEditMode={editing.isEditMode}
              editedPam={editing.editedPam}
              editedRelatedData={editing.editedRelatedData}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabDefs={tabDefs}
              onStartEdit={editing.handleStartEdit}
              onSaveEdit={editing.handleSaveEdit}
              onCancelEdit={editing.handleCancelEdit}
              onFieldChange={editing.handleFieldChange}
              onRelatedFieldChange={editing.handleRelatedFieldChange}
              onAddRecord={editing.handleAddRecord}
              onDeleteRecord={editing.handleDeleteRecord}
              onOpenFindReplace={dialogs.openFindReplace}
              onDeletePam={(pam) => {
                dialogs.setPamToDelete(pam);
                dialogs.setShowDeleteSingleDialog(true);
              }}
            />
          </Box>
        </Box>

        {/* Dialogs */}
        <UnifiedFieldDialog
          open={dialogs.dialogMode !== null}
          onClose={dialogs.closeDialog}
          mode={dialogs.dialogMode || 'findReplace'}
          tableMap={workingTableMap}
          pamsRecords={workingPams}
          onEdit={handleQuickEdit}
          onCreate={handleCreateRecords}
          onFindReplaceSimple={handleFindReplaceSimple}
          onFindReplaceAdvanced={handleFindReplaceAdvanced}
          onFindOnly={(filters: FieldFilter[]) => {
            const textFilters: AdvancedFieldFilter[] = filters
              .filter((f) => f.table === 'PaMs')
              .map((f) => ({
                field: f.field,
                operator: f.operator as AdvancedFieldFilter['operator'],
                value: f.value,
              }));
            filtering.setAdvancedFilters({ textFilters, dateFilters: [] });
            filtering.setShowAdvancedFilters(true);
          }}
          onDelete={(tableName, recordIds) => {
            if (tableName === 'PaMs') {
              setModifiedPams(workingPams.filter((p) => !recordIds.includes(p.Id || p.id)));
              setSelectedPamIds(new Set());
            } else {
              const records = workingTableMap[tableName] || [];
              setModifiedTableData((prev) => ({
                ...prev,
                [tableName]: records.filter((r) => !recordIds.includes(r.Id || r.id)),
              }));
            }
          }}
          initialTable={dialogs.dialogInitialTable}
          initialRecordId={dialogs.dialogInitialRecordId}
          simpleOnly={dialogs.dialogSimpleOnly}
          currentPam={dialogs.dialogCurrentPam}
        />

        <DeleteConfirmDialog
          open={dialogs.showDeleteDialog}
          onClose={() => dialogs.setShowDeleteDialog(false)}
          selectedCount={selectedPamIds.size > 0 ? selectedPamIds.size : filtering.filteredPams.length}
          onConfirm={handleDeletePams}
        />

        <SinglePamDeleteDialog
          open={dialogs.showDeleteSingleDialog}
          pamToDelete={dialogs.pamToDelete}
          onClose={dialogs.closeSingleDeleteDialog}
          onConfirm={handleDeleteSinglePam}
        />

        <ValidationWorkflow
          open={dialogs.showValidation}
          onClose={() => dialogs.setShowValidation(false)}
        />
      </Box>
    </LocalizationProvider>
  );
}

export default PamsDetailsPage;
