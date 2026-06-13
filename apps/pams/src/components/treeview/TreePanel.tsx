import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import TableChartIcon from '@mui/icons-material/ListAltSharp';
import type { TableInfo } from './types';

// import ListAltSharpIcon from '@mui/icons-material/ListAltSharp';

type ChildData = { table: TableInfo; grandchildren: TableInfo[] };
type TreeStructure = { parent: TableInfo; children: ChildData[] };

type TreePanelProps = {
  structure: TreeStructure;
  selectedTable: TableInfo | null;
  onTableClick: (table: TableInfo, event: React.MouseEvent) => void;
};

function TableLabel({
  table,
  color,
  fontSize,
  badge,
  badgeColor,
}: {
  table: TableInfo;
  color: string;
  fontSize?: number;
  badge?: string;
  badgeColor?: 'primary' | 'secondary' | 'info';
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        py: 0.5,
        cursor: 'pointer',
        '&:hover': { backgroundColor: 'action.hover' },
        borderRadius: 1,
        px: 1,
      }}
    >
      <TableChartIcon sx={{ mr: 1, color, fontSize: fontSize || 24 }} />
      <Typography variant="body2" sx={{ fontWeight: fontSize ? 'medium' : 'bold', fontSize: fontSize ? `${fontSize / 16}rem` : undefined }}>
        {table.name}
      </Typography>
      <Chip label={`${table.records.length} rows`} size="small" sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} />
      {badge && (
        <Chip label={badge} size="small" color={badgeColor} sx={{ ml: 0.5, height: 20, fontSize: '0.7rem' }} />
      )}
    </Box>
  );
}

export default function TreePanel({ structure, onTableClick }: TreePanelProps) {
  return (
    <Box sx={{ width: { xs: '100%', md: 320 }, flex: '0 0 auto' }}>
      <Card sx={{ height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: 1, overflow: 'auto', padding: 2, minHeight: 0 }}>
          <SimpleTreeView defaultExpandedItems={['parent']} sx={{ pb: 4 }}>
            {/* Parent Table */}
            <TreeItem
              itemId="parent"
              label={
                <Box onClick={(e) => onTableClick(structure.parent, e)}>
                  <TableLabel table={structure.parent} color="primary.main" badge="Parent" badgeColor="primary" />
                </Box>
              }
            >
              {/* Child Tables */}
              {structure.children.map((childData, childIdx) => (
                <TreeItem
                  key={`child-${childIdx}`}
                  itemId={`child-${childIdx}`}
                  label={
                    <Box onClick={(e) => onTableClick(childData.table, e)}>
                      <TableLabel
                        table={childData.table}
                        color="success.main"
                        fontSize={20}
                        badge={childData.grandchildren.length > 0 ? `${childData.grandchildren.length} sub` : undefined}
                        badgeColor="info"
                      />
                    </Box>
                  }
                >
                  {/* Grandchild Tables */}
                  {childData.grandchildren.map((grandchild, grandchildIdx) => (
                    <TreeItem
                      key={`grandchild-${childIdx}-${grandchildIdx}`}
                      itemId={`grandchild-${childIdx}-${grandchildIdx}`}
                      label={
                        <Box onClick={(e) => onTableClick(grandchild, e)}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              py: 0.5,
                              cursor: 'pointer',
                              '&:hover': { backgroundColor: 'action.hover' },
                              borderRadius: 1,
                              px: 1,
                            }}
                          >
                            <TableChartIcon sx={{ mr: 1, color: 'info.main', fontSize: 18 }} />
                            <Typography variant="body2" sx={{ fontWeight: 'regular', fontSize: '0.85rem' }}>
                              {grandchild.name}
                            </Typography>
                            <Chip label={`${grandchild.records.length} rows`} size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                          </Box>
                        </Box>
                      }
                    />
                  ))}
                </TreeItem>
              ))}
            </TreeItem>
          </SimpleTreeView>
        </CardContent>
      </Card>
    </Box>
  );
}
