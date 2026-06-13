// Shared types for PAMs components

export type TableInfo = {
  name: string;
  records: any[];
  index: number;
};

// Filter types
export type FieldFilter = {
  table: string; // Table to filter on
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'isEmpty' | 'isNotEmpty' | 'greaterThan' | 'lessThan';
  value: string;
  matchCase?: boolean; // Per-filter match case option
};

export type AdvancedFieldFilter = {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'isEmpty' | 'isNotEmpty';
  value: string;
};

export type DateFilter = {
  field: string;
  operator: 'equals' | 'before' | 'after' | 'between';
  value: Date | null;
  valueTo?: Date | null;
};

export type AdvancedFilters = {
  textFilters: AdvancedFieldFilter[];
  dateFilters: DateFilter[];
};

// Field value for create/edit operations (single table)
export type FieldValueEntry = {
  field: string;
  value: string;
};

// Field value with table support (cross-table)
export type FieldValueWithTable = {
  table: string;
  field: string;
  value: string;
};

// Dialog mode
export type UnifiedDialogMode = 'create' | 'edit' | 'findReplace' | 'delete';

// Filter type for PAM list
export type FilterType = 'all' | 'single' | 'group';

// Status filter for PAM list
export type StatusFilter = 'all' | 'modified' | 'new';

// Change history entry for undo functionality
export type ChangeHistoryEntry = {
  id: number;
  timestamp: Date;
  description: string;
  tableName: string;
  affectedRecords: number;
  previousPams: any[] | null;
  previousTableData: Record<string, any[]>;
  previousModifiedIds: Set<number>;
};

// Non-editable fields (IDs and system fields)
export const NON_EDITABLE_FIELDS = [
  'id', 'Id', 'ID',
  'idRecordSchema', 'idTableSchema', 'idRecord',
  'Fk_PaMs', 'fk_pams', 'Fk_SectorObjectives',
  'countryCode', 'country',
];

// PAM fields that can be searched/filtered
export const SEARCHABLE_PAM_FIELDS = [
  'Title', 'TitleNational', 'NECP_PamId', 'IsGroup', 'Description',
  'StatusImplementation', 'TypePolicyInstrument', 'GeographicalCoverage',
  'QuantifiedObjective', 'Comments', 'Progress',
];

export const DATE_FIELDS = [
  'ImplementationPeriodStart', 'ImplementationPeriodFinish',
];

// Helper function to check if a field is editable
export function isEditableField(fieldName: string): boolean {
  return !NON_EDITABLE_FIELDS.some(
    (f) => f.toLowerCase() === fieldName.toLowerCase() || fieldName.toLowerCase().startsWith('fk_')
  );
}

// Helper to get numeric record ID consistently
export function getRecordId(record: any): number {
  return Number(record.Id ?? record.id ?? 0);
}

// Format value for display
export function formatValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
