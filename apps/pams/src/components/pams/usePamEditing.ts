import { useState, useRef } from 'react';

type EditingParams = {
  selectedPam: any;
  relatedData: Record<string, any[]>;
  workingPams: any[];
  workingTableMap: Record<string, any[]>;
  setModifiedPams: (pams: any[]) => void;
  setModifiedTableData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  setModifiedPamIds: React.Dispatch<React.SetStateAction<Set<number>>>;
};

export function usePamEditing({
  selectedPam,
  relatedData,
  workingPams,
  workingTableMap,
  setModifiedPams,
  setModifiedTableData,
  setModifiedPamIds,
}: EditingParams) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedPam, setEditedPam] = useState<any>(null);
  const [editedRelatedData, setEditedRelatedData] = useState<Record<string, any[]>>({});

  // Refs to track latest values for save handler (avoids stale closure from BlurTextField timing)
  const editedPamRef = useRef<any>(null);
  const editedRelatedRef = useRef<Record<string, any[]>>({});

  const handleStartEdit = () => {
    const pamCopy = { ...selectedPam };
    setEditedPam(pamCopy);
    editedPamRef.current = pamCopy;
    const editableRelated: Record<string, any[]> = {};
    Object.entries(relatedData).forEach(([key, records]) => {
      editableRelated[key] = records.map((r) => ({ ...r }));
    });
    setEditedRelatedData(editableRelated);
    editedRelatedRef.current = editableRelated;
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditedPam(null);
    editedPamRef.current = null;
    setEditedRelatedData({});
    editedRelatedRef.current = {};
    setIsEditMode(false);
  };

  const handleSaveEdit = () => {
    // Read latest values from refs (handles BlurTextField timing where blur + click overlap)
    const currentEditedPam = editedPamRef.current;
    const currentEditedRelated = editedRelatedRef.current;

    if (!selectedPam || !currentEditedPam) {
      setIsEditMode(false);
      return;
    }

    // Normalize pamId to Number for consistent comparisons
    const pamId = Number(selectedPam.Id || selectedPam.id);

    const updatedPams = workingPams.map((pam) => {
      const currentId = Number(pam.Id || pam.id);
      if (currentId !== pamId) return pam;
      return { ...pam, ...currentEditedPam, Id: pamId, id: pamId };
    });
    setModifiedPams(updatedPams);

    const relatedTableUpdates: Record<string, any[]> = {};
    Object.entries(currentEditedRelated).forEach(([tableName, editedRecords]) => {
      const existingRecords = workingTableMap[tableName] || [];
      const recordsForOtherPams = existingRecords.filter((record) => {
        const fkPam = Number(record.Fk_PaMs ?? record.fk_pams ?? -1);
        return fkPam !== pamId;
      });
      const normalizedEditedRecords = editedRecords.map((record) => ({
        ...record,
        Fk_PaMs: pamId,
      }));
      relatedTableUpdates[tableName] = [...recordsForOtherPams, ...normalizedEditedRecords];
    });

    if (Object.keys(relatedTableUpdates).length > 0) {
      setModifiedTableData((prev) => ({ ...prev, ...relatedTableUpdates }));
    }

    setModifiedPamIds((prev) => {
      const next = new Set(prev);
      next.add(pamId);
      return next;
    });

    // Exit edit mode after saving
    setEditedPam(null);
    editedPamRef.current = null;
    setEditedRelatedData({});
    editedRelatedRef.current = {};
    setIsEditMode(false);
    console.log(`Saved changes for PAM #${pamId}`);
  };

  const handleFieldChange = (field: string, value: string) => {
    setEditedPam((prev: any) => {
      const next = { ...prev, [field]: value };
      editedPamRef.current = next;
      return next;
    });
  };

  const handleRelatedFieldChange = (tableName: string, recordIndex: number, field: string, value: string) => {
    setEditedRelatedData((prev) => {
      const tableRecords = prev[tableName] ? [...prev[tableName]] : [];
      tableRecords[recordIndex] = { ...tableRecords[recordIndex], [field]: value };
      const next = { ...prev, [tableName]: tableRecords };
      editedRelatedRef.current = next;
      return next;
    });
  };

  const handleAddRecord = (tableName: string) => {
    const pamId = Number(selectedPam?.Id || selectedPam?.id);
    if (!pamId) return;

    const newRecord: Record<string, any> = {
      id: Date.now(),
      [`Fk_${tableName.split('_')[0]}`]: pamId,
    };

    if (
      ['Table_1', 'Dimensions', 'SectorObjectives', 'OtherObjectives', 'Entities', 'Indicators', 'PolicyIndicators', 'Reference'].includes(
        tableName
      )
    ) {
      newRecord['Fk_PaMs'] = pamId;
    }

    setEditedRelatedData((prev) => {
      const updated = { ...prev };
      const existing = updated[tableName] || [];
      updated[tableName] = [...existing, newRecord];
      editedRelatedRef.current = updated;
      return updated;
    });

    setModifiedPamIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(pamId);
      return newSet;
    });
  };

  const handleDeleteRecord = (tableName: string, recordIndex: number) => {
    const pamId = Number(selectedPam?.Id || selectedPam?.id);
    if (!pamId) return;

    setEditedRelatedData((prev) => {
      const updated = { ...prev };
      if (updated[tableName]) {
        updated[tableName] = updated[tableName].filter((_, idx) => idx !== recordIndex);
      }
      editedRelatedRef.current = updated;
      return updated;
    });

    setModifiedPamIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(pamId);
      return newSet;
    });
  };

  return {
    isEditMode,
    editedPam,
    editedRelatedData,
    setEditedPam,
    setIsEditMode,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleFieldChange,
    handleRelatedFieldChange,
    handleAddRecord,
    handleDeleteRecord,
  };
}
