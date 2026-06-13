import { useState } from 'react';
import type { UnifiedDialogMode } from './types';

export function usePamDialogs() {
  const [dialogMode, setDialogMode] = useState<UnifiedDialogMode | null>(null);
  const [dialogInitialTable, setDialogInitialTable] = useState<string | undefined>();
  const [dialogInitialRecordId, setDialogInitialRecordId] = useState<number | undefined>();
  const [dialogSimpleOnly, setDialogSimpleOnly] = useState(false);
  const [dialogCurrentPam, setDialogCurrentPam] = useState<{ id: number; title: string } | undefined>();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteSingleDialog, setShowDeleteSingleDialog] = useState(false);
  const [pamToDelete, setPamToDelete] = useState<{ id: number; title: string } | null>(null);
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const openDialog = (
    mode: UnifiedDialogMode,
    tableName?: string,
    recordId?: number,
    simpleOnly?: boolean,
    currentPam?: { id: number; title: string }
  ) => {
    setDialogMode(mode);
    setDialogInitialTable(tableName);
    setDialogInitialRecordId(recordId);
    setDialogSimpleOnly(simpleOnly || false);
    setDialogCurrentPam(currentPam);
  };

  const closeDialog = () => {
    setDialogMode(null);
    setDialogInitialTable(undefined);
    setDialogInitialRecordId(undefined);
    setDialogSimpleOnly(false);
    setDialogCurrentPam(undefined);
  };

  const openCreate = (tableName?: string) => openDialog('create', tableName);
  const openFindReplace = (
    tableName?: string,
    simpleOnly?: boolean,
    currentPam?: { id: number; title: string }
  ) => openDialog('findReplace', tableName, undefined, simpleOnly, currentPam);
  const openDelete = (tableName?: string) => openDialog('delete', tableName);

  const closeSingleDeleteDialog = () => {
    setShowDeleteSingleDialog(false);
    setPamToDelete(null);
  };

  return {
    dialogMode,
    dialogInitialTable,
    dialogInitialRecordId,
    dialogSimpleOnly,
    dialogCurrentPam,
    showDeleteDialog,
    setShowDeleteDialog,
    showDeleteSingleDialog,
    setShowDeleteSingleDialog,
    pamToDelete,
    setPamToDelete,
    showBulkOperations,
    setShowBulkOperations,
    showValidation,
    setShowValidation,
    openDialog,
    closeDialog,
    openCreate,
    openFindReplace,
    openDelete,
    closeSingleDeleteDialog,
  };
}
