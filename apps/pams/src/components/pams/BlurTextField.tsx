import { useState, useEffect } from 'react';
import { Box, TextField, Tooltip, Typography } from '@mui/material';
import type { ValidationRow } from '../validation';

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

type BlurTextFieldProps = {
  value: string;
  onChange: (value: string) => void;
  validations?: ValidationRow[];
  /** Used for scroll-to-field navigation. Sets a data attribute for identifying the field. */
  fieldId?: string;
} & Omit<React.ComponentProps<typeof TextField>, 'value' | 'onChange'>;

/**
 * TextField that only updates parent state on blur (when field loses focus).
 * This prevents re-renders on every keystroke, improving performance.
 * Optionally displays validation indicators when `validations` prop is provided.
 */
export default function BlurTextField({
  value,
  onChange,
  validations,
  fieldId,
  ...props
}: BlurTextFieldProps) {
  const [localValue, setLocalValue] = useState(value ?? '');

  // Sync local value when external value changes (e.g., on cancel/reset)
  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

  const hasValidation = validations && validations.length > 0;
  const topLevel = hasValidation ? validations[0].level : '';
  const borderColor = hasValidation ? valBorderColor(topLevel) : '';
  const tooltipMsg = hasValidation
    ? validations.map((v) => `[${v.level}] ${v.message}`).join('\n')
    : '';

  const textField = (
    <TextField
      {...props}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        // Only trigger update if value actually changed
        if (localValue !== value) {
          onChange(localValue);
        }
      }}
    />
  );

  if (!hasValidation) {
    return fieldId ? <Box data-field-id={fieldId}>{textField}</Box> : textField;
  }

  return (
    <Tooltip title={tooltipMsg} arrow placement="top">
      <Box data-field-id={fieldId} sx={{ border: `2px solid ${borderColor}`, borderRadius: 1, p: 0.5 }}>
        {textField}
        <Typography variant="caption" sx={{ color: borderColor, mt: 0.25, display: 'block', px: 0.5 }}>
          {validations.map((v) => v.message).join('; ')}
        </Typography>
      </Box>
    </Tooltip>
  );
}
