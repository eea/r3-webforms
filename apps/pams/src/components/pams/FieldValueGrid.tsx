import { Box, Tooltip, Typography } from '@mui/material';
import { getFieldLabel } from '../../schema/pamViewConfig';
import { formatValue, isEditableField } from './types';
import BlurTextField from './BlurTextField';
import type { ValidationRow } from '../validation';

export type FieldValidationMap = Record<string, ValidationRow[]>;

const valBorderColor = (level: string): string => {
  switch (level?.toUpperCase()) {
    case 'BLOCKER':
    case 'ERROR':
      return '#d32f2f';
    case 'WARNING':
      return '#ed6c02';
    case 'INFO':
      return '#0288d1';
    default:
      return '#9e9e9e';
  }
};

const valBgColor = (level: string): string => {
  switch (level?.toUpperCase()) {
    case 'BLOCKER':
    case 'ERROR':
      return 'rgba(211, 47, 47, 0.06)';
    case 'WARNING':
      return 'rgba(237, 108, 2, 0.06)';
    case 'INFO':
      return 'rgba(2, 136, 209, 0.06)';
    default:
      return 'rgba(158, 158, 158, 0.06)';
  }
};

type FieldValueGridProps = {
  data: any;
  fields: string[];
  isEditMode?: boolean;
  tableName?: string;
  recordIndex?: number;
  onFieldChange?: (tableName: string, recordIndex: number, field: string, value: string) => void;
  fieldValidations?: FieldValidationMap;
};

export default function FieldValueGrid({
  data,
  fields,
  isEditMode = false,
  tableName = '',
  recordIndex = 0,
  onFieldChange,
  fieldValidations,
}: FieldValueGridProps) {
  if (!isEditMode) {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
      {fields.map((field) => {
        const value = data?.[field];
        const validations = fieldValidations?.[field];
        const hasValidation = validations && validations.length > 0;
        const topLevel = hasValidation ? validations[0].level : '';
        const tooltipMsg = hasValidation
          ? validations.map((v) => `[${v.level}] ${v.message}`).join('\n')
          : '';

        return (
          <Tooltip key={field} title={tooltipMsg} arrow placement="top" disableHoverListener={!hasValidation}>
            <Box
              data-field-id={`${tableName}.${field}`}
              sx={{
                p: 1.5,
                backgroundColor: hasValidation ? valBgColor(topLevel) : 'grey.50',
                borderRadius: 1,
                border: hasValidation ? `2px solid ${valBorderColor(topLevel)}` : 'none',
              }}
            >
              <Typography variant="caption" color="text.secondary" display="block">
                {getFieldLabel(field)}
              </Typography>
              <Typography variant="body2">{formatValue(value)}</Typography>
              {hasValidation && (
                <Typography variant="caption" sx={{ color: valBorderColor(topLevel), mt: 0.5, display: 'block' }}>
                  {validations.map((v) => v.message).join('; ')}
                </Typography>
              )}
            </Box>
          </Tooltip>
          );
        })}
      </Box>
    );
  }

  // Edit mode - show all fields with text inputs
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
      {fields.map((field) => {
        const value = data?.[field];
        const isEditable = isEditableField(field);
        const isMultiline = field.toLowerCase().includes('description') ||
                          field.toLowerCase().includes('comment') ||
                          field.toLowerCase().includes('explanation');
        const validations = fieldValidations?.[field];
        const hasValidation = validations && validations.length > 0;
        const topLevel = hasValidation ? validations[0].level : '';

        return (
          <Tooltip key={field} title={hasValidation ? validations.map((v) => `[${v.level}] ${v.message}`).join('\n') : ''} arrow placement="top" disableHoverListener={!hasValidation}>
            <Box data-field-id={`${tableName}.${field}`} sx={{ border: hasValidation ? `2px solid ${valBorderColor(topLevel)}` : 'none', borderRadius: 1, p: hasValidation ? 0.5 : 0 }}>
              <BlurTextField
                fullWidth
                label={getFieldLabel(field)}
                value={value ?? ''}
                onChange={(value) => onFieldChange?.(tableName, recordIndex, field, value)}
                size="small"
                disabled={!isEditable}
                multiline={isMultiline}
                rows={isMultiline ? 2 : 1}
                InputProps={{
                  readOnly: !isEditable,
                }}
                sx={{
                  '& .Mui-disabled': {
                    backgroundColor: 'action.disabledBackground',
                  },
                }}
              />
              {hasValidation && (
                <Typography variant="caption" sx={{ color: valBorderColor(topLevel), mt: 0.25, display: 'block', px: 0.5 }}>
                  {validations.map((v) => v.message).join('; ')}
                </Typography>
              )}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}
