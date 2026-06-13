export type TableInfo = {
  name: string;
  records: any[];
  index: number;
};

export type TreeViewPageProps = {
  allTables: TableInfo[];
  hasData: boolean;
  onTableDataChange?: (tableName: string, updatedRecords: any[]) => void;
};

// Grandchild table relationships: key = grandchild table name (lowercase), value = parent child table name
export const GRANDCHILD_RELATIONSHIPS: Record<string, string> = {
  otherobjectives: 'SectorObjectives',
};
