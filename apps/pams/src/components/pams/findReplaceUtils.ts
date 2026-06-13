import type { FieldFilter } from './types';
import type { FieldValueWithTable } from './MultiFieldValueAssignment';
import type { SimpleFindReplaceRow } from './UnifiedFieldDialog';

type TableRecord = Record<string, unknown>;
type TableRecordsMap = Record<string, TableRecord[]>;

export type TableUpdateResult = {
  updatedRecords: TableRecord[];
  modifiedIds: number[];
  changeCount: number;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const matchesFilterCondition = (
  value: string,
  operator: string,
  filterVal: string,
  matchCase: boolean
): boolean => {
  const compareVal = matchCase ? value : value.toLowerCase();
  const compareFilter = matchCase ? filterVal : filterVal.toLowerCase();

  switch (operator) {
    case 'equals':
      return compareVal === compareFilter;
    case 'contains':
      return compareVal.includes(compareFilter);
    case 'startsWith':
      return compareVal.startsWith(compareFilter);
    case 'endsWith':
      return compareVal.endsWith(compareFilter);
    case 'isEmpty':
      return value.trim() === '';
    case 'isNotEmpty':
      return value.trim() !== '';
    case 'greaterThan':
      return parseFloat(value) > parseFloat(filterVal);
    case 'lessThan':
      return parseFloat(value) < parseFloat(filterVal);
    default:
      return true;
  }
};

export const applySimpleFindReplace = (
  rows: SimpleFindReplaceRow[],
  workingTableMap: TableRecordsMap
): Record<string, TableUpdateResult> => {
  const rowsByTable = rows.reduce((acc, row) => {
    if (!acc[row.table]) acc[row.table] = [];
    acc[row.table].push(row);
    return acc;
  }, {} as Record<string, SimpleFindReplaceRow[]>);

  const result: Record<string, TableUpdateResult> = {};

  Object.entries(rowsByTable).forEach(([tableName, tableRows]) => {
    const records = workingTableMap[tableName] || [];
    let changeCount = 0;

    const updatedRecords = records.map((record) => {
      let modified = { ...record };
      let recordChanged = false;

      for (const row of tableRows) {
        const currentValue = String(modified[row.field] || '');
        const rowMatchCase = row.matchCase || false;
        const matches = matchesFilterCondition(currentValue, row.operator, row.findValue, rowMatchCase);

        if (!matches) continue;

        let newValue: string;
        if (row.operator === 'isEmpty' || row.operator === 'isNotEmpty') {
          newValue = row.replaceValue;
        } else if (row.findValue === '') {
          newValue = row.replaceValue;
        } else if (rowMatchCase) {
          newValue = currentValue.split(row.findValue).join(row.replaceValue);
        } else {
          const regex = new RegExp(escapeRegExp(row.findValue), 'gi');
          newValue = currentValue.replace(regex, row.replaceValue);
        }

        modified = { ...modified, [row.field]: newValue };
        recordChanged = true;
      }

      if (recordChanged) changeCount++;
      return modified;
    });

    const modifiedIds = updatedRecords
      .filter((record, index) => JSON.stringify(record) !== JSON.stringify(records[index]))
      .map((record) => Number(record.Id || record.id || 0))
      .filter(Boolean);

    result[tableName] = { updatedRecords, modifiedIds, changeCount };
  });

  return result;
};

export const applyAdvancedFindReplace = (
  filters: FieldFilter[],
  fieldValues: FieldValueWithTable[],
  workingTableMap: TableRecordsMap
): Record<string, TableUpdateResult> => {
  const valuesByTable = fieldValues.reduce((acc, fv) => {
    if (!acc[fv.table]) acc[fv.table] = [];
    acc[fv.table].push(fv);
    return acc;
  }, {} as Record<string, FieldValueWithTable[]>);

  const result: Record<string, TableUpdateResult> = {};

  Object.entries(valuesByTable).forEach(([tableName, tableFieldValues]) => {
    const records = workingTableMap[tableName] || [];

    const targetRecords = records.filter((record) => {
      if (filters.length === 0) return true;

      const recordPamId = Number(
        record.Fk_PaMs ?? record.fk_pams ?? (tableName === 'PaMs' ? (record.Id || record.id) : 0)
      );

      for (const filter of filters) {
        const filterMatchCase = filter.matchCase || false;

        if (filter.table === tableName) {
          const value = String(record[filter.field] || '');
          if (!matchesFilterCondition(value, filter.operator, filter.value, filterMatchCase)) {
            return false;
          }
          continue;
        }

        const filterTableRecords = workingTableMap[filter.table] || [];
        let relatedRecords: TableRecord[];

        if (filter.table === 'PaMs') {
          relatedRecords = filterTableRecords.filter((r) => (r.Id || r.id) === recordPamId);
        } else if (tableName === 'PaMs') {
          const pamId = record.Id || record.id;
          relatedRecords = filterTableRecords.filter((r) => Number(r.Fk_PaMs ?? r.fk_pams ?? 0) === pamId);
        } else {
          relatedRecords = filterTableRecords.filter(
            (r) => Number(r.Fk_PaMs ?? r.fk_pams ?? 0) === recordPamId
          );
        }

        const anyMatch = relatedRecords.some((relatedRecord) => {
          const value = String(relatedRecord[filter.field] || '');
          return matchesFilterCondition(value, filter.operator, filter.value, filterMatchCase);
        });

        if (!anyMatch) return false;
      }

      return true;
    });

    const targetIds = new Set(targetRecords.map((r) => Number(r.Id || r.id || 0)).filter(Boolean));
    const updatedRecords = records.map((record) => {
      const recordId = Number(record.Id || record.id || 0);
      if (!targetIds.has(recordId)) return record;

      let modified = { ...record };
      for (const fv of tableFieldValues) {
        modified = { ...modified, [fv.field]: fv.value };
      }
      return modified;
    });

    result[tableName] = {
      updatedRecords,
      modifiedIds: Array.from(targetIds),
      changeCount: targetRecords.length,
    };
  });

  return result;
};

export const createRecords = (
  existingRecords: TableRecord[],
  count: number,
  fieldValues: FieldValueWithTable[],
  linkToPamId?: number
) => {
  const existingIds = existingRecords.map((r) => Number(r.Id ?? r.id ?? 0)).filter(Boolean);
  const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
  const newRecords: TableRecord[] = [];

  for (let i = 0; i < count; i++) {
    const newId = nextId + i;
    const record: TableRecord = { Id: newId, id: newId };

    fieldValues.forEach((fv) => {
      let value = fv.value;
      if (fv.field === 'Title' && count > 1) {
        value = `${fv.value} ${i + 1}`;
      }
      record[fv.field] = value;
    });

    if (linkToPamId) {
      record.Fk_PaMs = linkToPamId;
    }

    newRecords.push(record);
  }

  return {
    newRecords,
    updatedRecords: [...existingRecords, ...newRecords],
  };
};
