import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Link,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import { getFieldLabel } from '../../schema/pamViewConfig';
import { formatValue } from './types';

type DataTableProps = {
  records: any[];
  title?: string;
};

export default function DataTable({ records, title: _title }: DataTableProps) {
  if (!records || records.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No data available
      </Typography>
    );
  }

  // Get all fields from records (excluding internal fields)
  const fields = Object.keys(records[0]).filter(
    (key) => !['id', 'idRecordSchema', 'idTableSchema', 'countryCode'].includes(key) && !key.startsWith('Fk_')
  );

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'grey.100' }}>
            {fields.map((field) => (
              <TableCell key={field} sx={{ fontWeight: 'bold' }}>
                {getFieldLabel(field)}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((record, idx) => (
            <TableRow key={idx} hover>
              {fields.map((field) => (
                <TableCell key={field}>
                  {field === 'URL' || field === 'WebLink' ? (
                    record[field] ? (
                      <Link href={record[field]} target="_blank" rel="noopener">
                        <LinkIcon fontSize="small" /> Link
                      </Link>
                    ) : (
                      '-'
                    )
                  ) : (
                    formatValue(record[field])
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
