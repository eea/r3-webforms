import { type GridColDef } from '@mui/x-data-grid';
import {
  getFieldType,
  schemaTypeToGridType,
  parseValueBySchemaType,
} from '../../schema/tableSchema';
import type { TableInfo } from './types';

type ChildData = { table: TableInfo; grandchildren: TableInfo[] };
type TableStructure = { parent: TableInfo; children: ChildData[] };

export function analyzeTableStructure(
  allTables: TableInfo[],
  grandchildRelationships: Record<string, string>
): TableStructure | null {
  if (allTables.length === 0) return null;

  const parentTable = allTables[0];
  const otherTables = allTables.slice(1);

  const childTables: TableInfo[] = [];
  const grandchildMap = new Map<string, TableInfo[]>();

  otherTables.forEach((table) => {
    const parentChildName = grandchildRelationships[table.name.toLowerCase()];
    if (parentChildName) {
      const existing = grandchildMap.get(parentChildName) || [];
      existing.push(table);
      grandchildMap.set(parentChildName, existing);
    } else {
      childTables.push(table);
    }
  });

  return {
    parent: parentTable,
    children: childTables.map((child) => ({
      table: child,
      grandchildren: grandchildMap.get(child.name) || [],
    })),
  };
}

export function getColumnInfo(records: any[]): { name: string; type: string }[] {
  if (records.length === 0) return [];
  return Object.keys(records[0]).map((key) => {
    const value = records[0][key];
    let type = 'string';
    if (value !== null && value !== undefined) {
      if (typeof value === 'number') type = 'number';
      else if (typeof value === 'boolean') type = 'boolean';
      else if (typeof value === 'object') type = 'object';
      else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) type = 'date';
    }
    return { name: key, type };
  });
}

export function buildColumnsAndRows(selectedTable: TableInfo | null): { columns: GridColDef[]; rows: any[] } {
  if (!selectedTable || selectedTable.records.length === 0) return { columns: [], rows: [] };

  try {
    const tableRecords = selectedTable.records;
    const firstRecord = tableRecords[0];
    const hasFieldsArray = firstRecord.fields && Array.isArray(firstRecord.fields);

    // Collect unique dynamic field names from fields arrays
    const fieldNamesSet = new Set<string>();
    if (hasFieldsArray) {
      tableRecords.forEach(record => {
        (record.fields || []).forEach((field: any) => {
          if (field.fieldName) fieldNamesSet.add(field.fieldName);
        });
      });
    }
    const dynamicFieldNames = Array.from(fieldNamesSet);

    const NON_EDITABLE = ['id', 'idrecordschema', 'id_record_schema', 'idtableschema', 'id_table_schema', 'idrecord', 'id_record', 'country', 'countrycode', 'country_code'];

    // Build columns from direct record keys
    const generatedColumns: GridColDef[] = Object.keys(firstRecord)
      .filter(key => key !== 'fields')
      .map((key) => {
        const value = firstRecord[key];
        const schemaType = getFieldType(key);
        let type: 'string' | 'number' | 'boolean' | 'date' | 'dateTime' = 'string';
        let width = 150;
        let isComplexType = false;

        if (schemaType) {
          type = schemaTypeToGridType(schemaType);
          if (type === 'number') width = 120;
        } else if (value !== null && value !== undefined) {
          if (typeof value === 'number') { type = 'number'; width = 120; }
          else if (typeof value === 'boolean') { type = 'boolean'; width = 100; }
          else if (typeof value === 'string') {
            const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
            if (dateRegex.test(value)) { type = value.includes('T') ? 'dateTime' : 'date'; width = 180; }
            else if (value.length > 50) width = 250;
          } else if (typeof value === 'object') {
            isComplexType = true;
            width = 250;
          }
        }

        const column: GridColDef = {
          field: key,
          headerName: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
          width: isComplexType ? 250 : width,
          type: isComplexType ? 'string' : type,
          sortable: true,
          filterable: true,
          resizable: true,
          editable: !isComplexType && !NON_EDITABLE.includes(key.toLowerCase()),
        };

        if (isComplexType) {
          column.valueGetter = (_value: any, row: any) => {
            const val = row?.[key];
            if (val === null || val === undefined) return '';
            return typeof val === 'object' ? JSON.stringify(val, null, 2) : val;
          };
        }
        if (type === 'date' || type === 'dateTime') {
          column.valueFormatter = (value: any) => {
            if (!value) return '';
            try {
              const d = new Date(value);
              return type === 'date' ? d.toLocaleDateString() : d.toLocaleString();
            } catch { return value; }
          };
        }
        if (type === 'number') {
          column.valueFormatter = (value: any) => {
            if (value === null || value === undefined) return '';
            return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
          };
        }

        return column;
      });

    // Add columns for dynamic fields from fields array
    if (hasFieldsArray && dynamicFieldNames.length > 0) {
      const NON_EDITABLE_FIELDS = ['idrecordschema', 'id_record_schema', 'idtableschema', 'id_table_schema', 'idrecord', 'id_record', 'country', 'countrycode', 'country_code'];
      dynamicFieldNames.forEach(fieldName => {
        const fieldSchemaType = getFieldType(fieldName);
        let fieldType: 'string' | 'number' | 'boolean' = 'string';
        if (fieldSchemaType) {
          fieldType = schemaTypeToGridType(fieldSchemaType) as 'string' | 'number' | 'boolean';
        } else {
          const firstField = firstRecord.fields?.find((f: any) => f.fieldName === fieldName);
          if (firstField?.value !== null && firstField?.value !== undefined) {
            if (typeof firstField.value === 'number') fieldType = 'number';
            else if (typeof firstField.value === 'boolean') fieldType = 'boolean';
          }
        }
        generatedColumns.push({
          field: `field_${fieldName}`,
          headerName: fieldName,
          width: fieldType === 'boolean' ? 100 : fieldType === 'number' ? 120 : 150,
          type: fieldType,
          sortable: true,
          filterable: true,
          resizable: true,
          editable: !NON_EDITABLE_FIELDS.includes(fieldName.toLowerCase()),
        });
      });
    }

    // Build rows
    const generatedRows = tableRecords.map((record, index) => {
      const flatRecord: any = { id: record.id || index };
      Object.keys(record).forEach(key => {
        if (key !== 'fields') {
          const schemaType = getFieldType(key);
          flatRecord[key] = schemaType ? parseValueBySchemaType(record[key], schemaType) : record[key];
        }
      });
      if (hasFieldsArray && record.fields) {
        (record.fields as any[]).forEach((field: any) => {
          if (field.fieldName && field.value !== undefined) {
            const schemaType = getFieldType(field.fieldName);
            flatRecord[`field_${field.fieldName}`] = schemaType ? parseValueBySchemaType(field.value, schemaType) : field.value;
          }
        });
      }
      return flatRecord;
    });

    return { columns: generatedColumns, rows: generatedRows };
  } catch (error) {
    console.error('Error transforming data for DataGrid:', error);
    return { columns: [], rows: [] };
  }
}
