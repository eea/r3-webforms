import { useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { ghgExAnteYears, resExAnteYears, eeExAnteYears } from '../../schema/pamViewConfig';
import { formatValue } from './types';
import EditableDataTable from './EditableDataTable';
import FieldValueGrid, { type FieldValidationMap } from './FieldValueGrid';
import BlurTextField from './BlurTextField';

const SHOW_ALL_FORMS_IN_VIEW = true;

// Common props type for section components
type SectionProps = {
  data: any;
  relatedData: Record<string, any[]>;
  isEditMode?: boolean;
  editedData?: any;
  editedRelatedData?: Record<string, any[]>;
  onFieldChange?: (tableName: string, recordIndex: number, field: string, value: string) => void;
  onRelatedFieldChange?: (tableName: string, recordIndex: number, field: string, value: string) => void;
  onAddRecord?: (tableName: string) => void;
  onDeleteRecord?: (tableName: string, recordIndex: number) => void;
  fieldValidations?: FieldValidationMap;
};

// GHG Ex-Ante Section
export function GHGExAnteSection({
  data,
  relatedData,
  isEditMode = false,
  editedData,
  editedRelatedData,
  onFieldChange,
  onRelatedFieldChange,
  onAddRecord,
  onDeleteRecord,
  fieldValidations,
}: SectionProps) {
  const displayData = (isEditMode && editedData ? editedData : (isEditMode ? {} : data)) || {};
  const displayRelated = isEditMode && editedRelatedData ? editedRelatedData : relatedData;

  return (
    <Stack spacing={3}>
      {/* Policy Impact */}
      {isEditMode ? (
        <BlurTextField
          fullWidth
          label="Policy Impacting"
          value={displayData.PolicyImpacting ?? ''}
          onChange={(value) => onFieldChange?.('GHG_ExAnte', 0, 'PolicyImpacting', value)}
          size="small"
          validations={fieldValidations?.['PolicyImpacting']}
        />
      ) : (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Policy Impacting
          </Typography>
          {displayData.PolicyImpacting ? (
            <Chip label={displayData.PolicyImpacting} color="success" size="small" />
          ) : (
            <Typography variant="body2" color="text.secondary">-</Typography>
          )}
        </Box>
      )}

      {/* Ex-Ante Assessment Table */}
      <Box>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Ex-ante Assessment - GHG emissions reductions (kt CO2-equivalent per year)
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'success.light' }}>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Year</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>EU ETS</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>ESR</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>LULUCF</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ghgExAnteYears.map(({ year, fields }) => {
                const [euets, esr, lulucf, total] = fields;
                return (
                  <TableRow key={year} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{year}</TableCell>
                    {isEditMode ? (
                      <>
                        <TableCell sx={{ p: 0.5 }}>
                          <BlurTextField
                            size="small"
                            type="number"
                            value={displayData[euets] ?? ''}
                            onChange={(value) => onFieldChange?.('GHG_ExAnte', 0, euets, value)}
                            sx={{ '& .MuiInputBase-input': { p: 0.75 } }}
                            validations={fieldValidations?.[euets]}
                          />
                        </TableCell>
                        <TableCell sx={{ p: 0.5 }}>
                          <BlurTextField
                            size="small"
                            type="number"
                            value={displayData[esr] ?? ''}
                            onChange={(value) => onFieldChange?.('GHG_ExAnte', 0, esr, value)}
                            sx={{ '& .MuiInputBase-input': { p: 0.75 } }}
                            validations={fieldValidations?.[esr]}
                          />
                        </TableCell>
                        <TableCell sx={{ p: 0.5 }}>
                          <BlurTextField
                            size="small"
                            type="number"
                            value={displayData[lulucf] ?? ''}
                            onChange={(value) => onFieldChange?.('GHG_ExAnte', 0, lulucf, value)}
                            sx={{ '& .MuiInputBase-input': { p: 0.75 } }}
                            validations={fieldValidations?.[lulucf]}
                          />
                        </TableCell>
                        <TableCell sx={{ p: 0.5 }}>
                          <BlurTextField
                            size="small"
                            type="number"
                            value={displayData[total] ?? ''}
                            onChange={(value) => onFieldChange?.('GHG_ExAnte', 0, total, value)}
                            sx={{ '& .MuiInputBase-input': { p: 0.75 } }}
                            validations={fieldValidations?.[total]}
                          />
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{formatValue(displayData[euets])}</TableCell>
                        <TableCell>{formatValue(displayData[esr])}</TableCell>
                        <TableCell>{formatValue(displayData[lulucf])}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{formatValue(displayData[total])}</TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Explanation */}
      {isEditMode ? (
        <BlurTextField
          fullWidth
          label="Explanation of the basis for the mitigation estimates"
          value={displayData.Explanation ?? ''}
          onChange={(value) => onFieldChange?.('GHG_ExAnte', 0, 'Explanation', value)}
          size="small"
          multiline
          rows={3}
          validations={fieldValidations?.['Explanation']}
        />
      ) : (
        <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Explanation of the basis for the mitigation estimates
          </Typography>
          <Typography variant="body2">{formatValue(displayData.Explanation)}</Typography>
        </Box>
      )}

      {/* Factors Affected */}
      {isEditMode ? (
        <BlurTextField
          fullWidth
          label="Factors affected by the PaM"
          value={displayData.FactorsAffected ?? ''}
          onChange={(value) => onFieldChange?.('GHG_ExAnte', 0, 'FactorsAffected', value)}
          size="small"
          multiline
          rows={2}
          validations={fieldValidations?.['FactorsAffected']}
        />
      ) : (
        <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Factors affected by the PaM
          </Typography>
          <Typography variant="body2">{formatValue(displayData.FactorsAffected)}</Typography>
        </Box>
      )}

      {/* Documentation */}
      {(displayRelated['GHG_ExAnte_Docs']?.length > 0 || isEditMode || SHOW_ALL_FORMS_IN_VIEW) && (
        <Accordion defaultExpanded={isEditMode}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Ex-Ante Documentation ({displayRelated['GHG_ExAnte_Docs']?.length || 0})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <EditableDataTable
              records={displayRelated['GHG_ExAnte_Docs'] || []}
              tableName="GHG_ExAnte_Docs"
              title="Documentation"
              isEditMode={isEditMode}
              onFieldChange={onRelatedFieldChange || (() => {})}
              onAddRecord={onAddRecord}
              onDeleteRecord={onDeleteRecord}
            />
          </AccordionDetails>
        </Accordion>
      )}

      {/* Ex-Post Assessment */}
      {(displayRelated['GHG_ExPost_emissions']?.length > 0 || isEditMode || SHOW_ALL_FORMS_IN_VIEW) && (
        <Box>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
            Ex-post Assessment
          </Typography>
          <EditableDataTable
            records={displayRelated['GHG_ExPost_emissions'] || []}
            tableName="GHG_ExPost_emissions"
            title="GHG emissions reductions"
            isEditMode={isEditMode}
            onFieldChange={onRelatedFieldChange || (() => {})}
              onAddRecord={onAddRecord}
              onDeleteRecord={onDeleteRecord}
          />
        </Box>
      )}

      {(displayRelated['GHG_ExPost_additional']?.length > 0 || isEditMode || SHOW_ALL_FORMS_IN_VIEW) && (
        <Accordion defaultExpanded={isEditMode}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Ex-Post Additional Information ({displayRelated['GHG_ExPost_additional']?.length || 0})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <EditableDataTable
              records={displayRelated['GHG_ExPost_additional'] || []}
              tableName="GHG_ExPost_additional"
              title="Additional Info"
              isEditMode={isEditMode}
              onFieldChange={onRelatedFieldChange || (() => {})}
              onAddRecord={onAddRecord}
              onDeleteRecord={onDeleteRecord}
            />
          </AccordionDetails>
        </Accordion>
      )}

      {(displayRelated['GHG_ExPost_Docs']?.length > 0 || isEditMode || SHOW_ALL_FORMS_IN_VIEW) && (
        <Accordion defaultExpanded={isEditMode}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Ex-Post Documentation ({displayRelated['GHG_ExPost_Docs']?.length || 0})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <EditableDataTable
              records={displayRelated['GHG_ExPost_Docs'] || []}
              tableName="GHG_ExPost_Docs"
              title="Documentation"
              isEditMode={isEditMode}
              onFieldChange={onRelatedFieldChange || (() => {})}
              onAddRecord={onAddRecord}
              onDeleteRecord={onDeleteRecord}
            />
          </AccordionDetails>
        </Accordion>
      )}
    </Stack>
  );
}

// Renewable Energy Ex-Ante Section
export function RESExAnteSection({
  data,
  relatedData,
  isEditMode = false,
  editedData,
  editedRelatedData,
  onFieldChange,
  onRelatedFieldChange,
  onAddRecord,
  onDeleteRecord,
  fieldValidations,
}: SectionProps) {
  const displayData = (isEditMode && editedData ? editedData : (isEditMode ? {} : data)) || {};
  const displayRelated = isEditMode && editedRelatedData ? editedRelatedData : relatedData;

  return (
    <Stack spacing={3}>
      {/* Ex-Ante Assessment Table */}
      <Box>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Ex-ante Assessment - Renewable energy production (ktoe/year)
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'warning.light' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Year</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Renewable Energy</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {resExAnteYears.map(({ year, field }) => {
                return (
                  <TableRow key={year} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{year}</TableCell>
                    {isEditMode ? (
                      <TableCell sx={{ p: 0.5 }}>
                        <BlurTextField
                          size="small"
                          type="number"
                          value={displayData[field] ?? ''}
                          onChange={(value) => onFieldChange?.('RES_ExAnte', 0, field, value)}
                          sx={{ '& .MuiInputBase-input': { p: 0.75 } }}
                          validations={fieldValidations?.[field]}
                        />
                      </TableCell>
                    ) : (
                      <TableCell>{formatValue(displayData[field])}</TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {isEditMode ? (
        <BlurTextField
          fullWidth
          label="Explanation"
          value={displayData.Explanation ?? ''}
          onChange={(value) => onFieldChange?.('RES_ExAnte', 0, 'Explanation', value)}
          size="small"
          multiline
          rows={3}
          validations={fieldValidations?.['Explanation']}
        />
      ) : (
        <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Explanation
          </Typography>
          <Typography variant="body2">{formatValue(displayData.Explanation)}</Typography>
        </Box>
      )}

      {(displayRelated['RES_ExAnte_Docs']?.length > 0 || isEditMode || SHOW_ALL_FORMS_IN_VIEW) && (
        <Accordion defaultExpanded={isEditMode}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Ex-Ante Documentation ({displayRelated['RES_ExAnte_Docs']?.length || 0})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <EditableDataTable
              records={displayRelated['RES_ExAnte_Docs'] || []}
              tableName="RES_ExAnte_Docs"
              title="Documentation"
              isEditMode={isEditMode}
              onFieldChange={onRelatedFieldChange || (() => {})}
              onAddRecord={onAddRecord}
              onDeleteRecord={onDeleteRecord}
            />
          </AccordionDetails>
        </Accordion>
      )}

      {(displayRelated['RES_ExPost']?.length > 0 || isEditMode || SHOW_ALL_FORMS_IN_VIEW) && (
        <Box>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
            Ex-post Assessment
          </Typography>
          <EditableDataTable
            records={displayRelated['RES_ExPost'] || []}
            tableName="RES_ExPost"
            title="Renewable energy production"
            isEditMode={isEditMode}
            onFieldChange={onRelatedFieldChange || (() => {})}
              onAddRecord={onAddRecord}
              onDeleteRecord={onDeleteRecord}
          />
        </Box>
      )}

      {(displayRelated['RES_ExPost_Docs']?.length > 0 || isEditMode || SHOW_ALL_FORMS_IN_VIEW) && (
        <Accordion defaultExpanded={isEditMode}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Ex-Post Documentation ({displayRelated['RES_ExPost_Docs']?.length || 0})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <EditableDataTable
              records={displayRelated['RES_ExPost_Docs'] || []}
              tableName="RES_ExPost_Docs"
              title="Documentation"
              isEditMode={isEditMode}
              onFieldChange={onRelatedFieldChange || (() => {})}
              onAddRecord={onAddRecord}
              onDeleteRecord={onDeleteRecord}
            />
          </AccordionDetails>
        </Accordion>
      )}
    </Stack>
  );
}

// Energy Efficiency Ex-Ante Section
export function EEExAnteSection({
  data,
  relatedData,
  isEditMode = false,
  editedData,
  editedRelatedData,
  onFieldChange,
  onRelatedFieldChange,
  onAddRecord,
  onDeleteRecord,
  fieldValidations,
}: SectionProps) {
  const displayData = (isEditMode && editedData ? editedData : (isEditMode ? {} : data)) || {};
  const displayRelated = isEditMode && editedRelatedData ? editedRelatedData : relatedData;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Ex-ante Assessment - Energy reductions (ktoe/year, final energy)
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'secondary.light' }}>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Year</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Energy Reductions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {eeExAnteYears.map(({ year, field }) => {
                return (
                  <TableRow key={year} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{year}</TableCell>
                    {isEditMode ? (
                      <TableCell sx={{ p: 0.5 }}>
                        <BlurTextField
                          size="small"
                          type="number"
                          value={displayData[field] ?? ''}
                          onChange={(value) => onFieldChange?.('EE_ExAnte', 0, field, value)}
                          sx={{ '& .MuiInputBase-input': { p: 0.75 } }}
                          validations={fieldValidations?.[field]}
                        />
                      </TableCell>
                    ) : (
                      <TableCell>{formatValue(displayData[field])}</TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {isEditMode ? (
        <BlurTextField
          fullWidth
          label="Explanation"
          value={displayData.Explanation ?? ''}
          onChange={(value) => onFieldChange?.('EE_ExAnte', 0, 'Explanation', value)}
          size="small"
          multiline
          rows={3}
          validations={fieldValidations?.['Explanation']}
        />
      ) : (
        <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Explanation
          </Typography>
          <Typography variant="body2">{formatValue(displayData.Explanation)}</Typography>
        </Box>
      )}

      {(displayRelated['EE_ExAnte_Docs']?.length > 0 || isEditMode || SHOW_ALL_FORMS_IN_VIEW) && (
        <Accordion defaultExpanded={isEditMode}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Ex-Ante Documentation ({displayRelated['EE_ExAnte_Docs']?.length || 0})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <EditableDataTable
              records={displayRelated['EE_ExAnte_Docs'] || []}
              tableName="EE_ExAnte_Docs"
              title="Documentation"
              isEditMode={isEditMode}
              onFieldChange={onRelatedFieldChange || (() => {})}
              onAddRecord={onAddRecord}
              onDeleteRecord={onDeleteRecord}
            />
          </AccordionDetails>
        </Accordion>
      )}

      {(displayRelated['EE_ExPost']?.length > 0 || isEditMode || SHOW_ALL_FORMS_IN_VIEW) && (
        <Box>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
            Ex-post Assessment
          </Typography>
          <EditableDataTable
            records={displayRelated['EE_ExPost'] || []}
            tableName="EE_ExPost"
            title="Energy reductions"
            isEditMode={isEditMode}
            onFieldChange={onRelatedFieldChange || (() => {})}
              onAddRecord={onAddRecord}
              onDeleteRecord={onDeleteRecord}
          />
        </Box>
      )}

      {(displayRelated['EE_ExPost_Docs']?.length > 0 || isEditMode || SHOW_ALL_FORMS_IN_VIEW) && (
        <Accordion defaultExpanded={isEditMode}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Ex-Post Documentation ({displayRelated['EE_ExPost_Docs']?.length || 0})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <EditableDataTable
              records={displayRelated['EE_ExPost_Docs'] || []}
              tableName="EE_ExPost_Docs"
              title="Documentation"
              isEditMode={isEditMode}
              onFieldChange={onRelatedFieldChange || (() => {})}
              onAddRecord={onAddRecord}
              onDeleteRecord={onDeleteRecord}
            />
          </AccordionDetails>
        </Accordion>
      )}
    </Stack>
  );
}

// Cost/Benefit Section (generic for GHG, RES, EE)
type CostBenefitSectionProps = SectionProps & {
  type: 'GHG' | 'RES' | 'EE';
};

export function CostBenefitSection({
  data,
  relatedData,
  type,
  isEditMode = false,
  editedData,
  editedRelatedData,
  onFieldChange,
  onRelatedFieldChange,
  onAddRecord,
  onDeleteRecord,
  fieldValidations,
}: CostBenefitSectionProps) {
  const displayData = (isEditMode && editedData ? editedData : (isEditMode ? {} : data)) || {};
  const displayRelated = isEditMode && editedRelatedData ? editedRelatedData : relatedData;
  const tableName = `${type}_CostBen`;

  const projDocTable = `${type}_CostBen_Proj_Docs`;
  const realDocTable = `${type}_CostBen_Real_Docs`;

  // Helper to render editable or display cell
  const renderCell = (fieldName: string, altFieldNames: string[] = []) => {
    const value = displayData[fieldName] || altFieldNames.reduce((acc, f) => acc || displayData[f], null);
    if (isEditMode) {
      return (
        <TableCell sx={{ p: 0.5 }}>
          <BlurTextField
            size="small"
            type="number"
            value={value ?? ''}
            onChange={(value) => onFieldChange?.(tableName, 0, fieldName, value)}
            sx={{ '& .MuiInputBase-input': { p: 0.75 } }}
            validations={fieldValidations?.[fieldName]}
          />
        </TableCell>
      );
    }
    return <TableCell>{formatValue(value)}</TableCell>;
  };

  return (
    <Stack spacing={3}>
      {/* Projected Costs */}
      <Box>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Projected Costs and Benefits
        </Typography>

        {isEditMode ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
            <BlurTextField
              label="Start Year"
              size="small"
              type="number"
              value={displayData.ProjectedYearStart ?? ''}
              onChange={(value) => onFieldChange?.(tableName, 0, 'ProjectedYearStart', value)}
              validations={fieldValidations?.['ProjectedYearStart']}
            />
            <BlurTextField
              label="End Year"
              size="small"
              type="number"
              value={displayData.ProjectedYearFinish ?? ''}
              onChange={(value) => onFieldChange?.(tableName, 0, 'ProjectedYearFinish', value)}
              validations={fieldValidations?.['ProjectedYearFinish']}
            />
            <BlurTextField
              label="Reference Year"
              size="small"
              type="number"
              value={displayData.ProjectedReferenceYear ?? displayData.ProjectedPriceYear ?? ''}
              onChange={(value) => onFieldChange?.(tableName, 0, 'ProjectedReferenceYear', value)}
              validations={fieldValidations?.['ProjectedReferenceYear']}
            />
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
            <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Period
              </Typography>
              <Typography variant="body2">
                {formatValue(displayData.ProjectedYearStart)} - {formatValue(displayData.ProjectedYearFinish)}
              </Typography>
            </Box>
            <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Reference Year
              </Typography>
              <Typography variant="body2">{formatValue(displayData.ProjectedReferenceYear || displayData.ProjectedPriceYear)}</Typography>
            </Box>
          </Box>
        )}

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'info.light' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Metric</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Per Unit</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Absolute (EUR/year)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Gross Costs</TableCell>
                {renderCell('ProjectedCost', ['ProjectedGrossCostRenewable', 'ProjectedGrossCostFinal'])}
                {renderCell('ProjectedAbsoluteCost', ['ProjectedAbsoluteGross'])}
              </TableRow>
              <TableRow>
                <TableCell>Benefits</TableCell>
                {renderCell('ProjectedBenefit', ['ProjectedBenefitRenewable', 'ProjectedBenefitFinal'])}
                {renderCell('ProjectedAbsoluteBenefit', ['ProjectedAbsoluteBenefits'])}
              </TableRow>
              <TableRow sx={{ backgroundColor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Net Costs</TableCell>
                {isEditMode ? (
                  <>
                    <TableCell sx={{ p: 0.5 }}>
                      <BlurTextField
                        size="small"
                        type="number"
                        value={displayData.ProjectedNetCost ?? ''}
                        onChange={(value) => onFieldChange?.(tableName, 0, 'ProjectedNetCost', value)}
                        sx={{ '& .MuiInputBase-input': { p: 0.75, fontWeight: 'bold' } }}
                        validations={fieldValidations?.['ProjectedNetCost']}
                      />
                    </TableCell>
                    <TableCell sx={{ p: 0.5 }}>
                      <BlurTextField
                        size="small"
                        type="number"
                        value={displayData.ProjectedAbsoluteNetCost ?? ''}
                        onChange={(value) => onFieldChange?.(tableName, 0, 'ProjectedAbsoluteNetCost', value)}
                        sx={{ '& .MuiInputBase-input': { p: 0.75, fontWeight: 'bold' } }}
                        validations={fieldValidations?.['ProjectedAbsoluteNetCost']}
                      />
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell sx={{ fontWeight: 'bold' }}>{formatValue(displayData.ProjectedNetCost || displayData.ProjectedRenewableNetCost || displayData.ProjectedReductionNetCost)}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{formatValue(displayData.ProjectedAbsoluteNetCost)}</TableCell>
                  </>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {isEditMode ? (
          <BlurTextField
            fullWidth
            label="Description of cost estimates"
            value={displayData.ProjectedDescriptionCost ?? ''}
            onChange={(value) => onFieldChange?.(tableName, 0, 'ProjectedDescriptionCost', value)}
            size="small"
            multiline
            rows={3}
            sx={{ mt: 2 }}
            validations={fieldValidations?.['ProjectedDescriptionCost']}
          />
        ) : (
          <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1, mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Description of cost estimates
            </Typography>
            <Typography variant="body2">{formatValue(displayData.ProjectedDescriptionCost)}</Typography>
          </Box>
        )}

        {(displayRelated[projDocTable]?.length > 0 || isEditMode || SHOW_ALL_FORMS_IN_VIEW) && (
          <Accordion sx={{ mt: 2 }} defaultExpanded={isEditMode}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Projected Cost Documentation ({displayRelated[projDocTable]?.length || 0})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <EditableDataTable
                records={displayRelated[projDocTable] || []}
                tableName={projDocTable}
                title="Documentation"
                isEditMode={isEditMode}
                onFieldChange={onRelatedFieldChange || (() => {})}
              onAddRecord={onAddRecord}
              onDeleteRecord={onDeleteRecord}
              />
            </AccordionDetails>
          </Accordion>
        )}
      </Box>

      <Divider />

      {/* Realised Costs */}
      <Box>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Realised Costs and Benefits
        </Typography>

        {isEditMode ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
            <BlurTextField
              label="Start Year"
              size="small"
              type="number"
              value={displayData.RealisedYearStart ?? ''}
              onChange={(value) => onFieldChange?.(tableName, 0, 'RealisedYearStart', value)}
              validations={fieldValidations?.['RealisedYearStart']}
            />
            <BlurTextField
              label="End Year"
              size="small"
              type="number"
              value={displayData.RealisedYearFinish ?? ''}
              onChange={(value) => onFieldChange?.(tableName, 0, 'RealisedYearFinish', value)}
              validations={fieldValidations?.['RealisedYearFinish']}
            />
            <BlurTextField
              label="Reference Year"
              size="small"
              type="number"
              value={displayData.RealisedReferenceYear ?? displayData.RealisedPriceYear ?? ''}
              onChange={(value) => onFieldChange?.(tableName, 0, 'RealisedReferenceYear', value)}
              validations={fieldValidations?.['RealisedReferenceYear']}
            />
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
            <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Period
              </Typography>
              <Typography variant="body2">
                {formatValue(displayData.RealisedYearStart)} - {formatValue(displayData.RealisedYearFinish)}
              </Typography>
            </Box>
            <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Reference Year
              </Typography>
              <Typography variant="body2">{formatValue(displayData.RealisedReferenceYear || displayData.RealisedPriceYear)}</Typography>
            </Box>
          </Box>
        )}

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'success.light' }}>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Metric</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Per Unit</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Absolute (EUR/year)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Gross Costs</TableCell>
                {isEditMode ? (
                  <>
                    <TableCell sx={{ p: 0.5 }}>
                      <BlurTextField
                        size="small"
                        type="number"
                        value={displayData.RealisedCost ?? ''}
                        onChange={(value) => onFieldChange?.(tableName, 0, 'RealisedCost', value)}
                        sx={{ '& .MuiInputBase-input': { p: 0.75 } }}
                        validations={fieldValidations?.['RealisedCost']}
                      />
                    </TableCell>
                    <TableCell sx={{ p: 0.5 }}>
                      <BlurTextField
                        size="small"
                        type="number"
                        value={displayData.RealisedAbsoluteCost ?? ''}
                        onChange={(value) => onFieldChange?.(tableName, 0, 'RealisedAbsoluteCost', value)}
                        sx={{ '& .MuiInputBase-input': { p: 0.75 } }}
                        validations={fieldValidations?.['RealisedAbsoluteCost']}
                      />
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{formatValue(displayData.RealisedCost || displayData.RealisedGrossCostRenewable || displayData.RealisedGrossCostFinal)}</TableCell>
                    <TableCell>{formatValue(displayData.RealisedAbsoluteCost || displayData.RealisedAbsoluteGross)}</TableCell>
                  </>
                )}
              </TableRow>
              <TableRow>
                <TableCell>Benefits</TableCell>
                {isEditMode ? (
                  <>
                    <TableCell sx={{ p: 0.5 }}>
                      <BlurTextField
                        size="small"
                        type="number"
                        value={displayData.RealisedBenefit ?? ''}
                        onChange={(value) => onFieldChange?.(tableName, 0, 'RealisedBenefit', value)}
                        sx={{ '& .MuiInputBase-input': { p: 0.75 } }}
                        validations={fieldValidations?.['RealisedBenefit']}
                      />
                    </TableCell>
                    <TableCell sx={{ p: 0.5 }}>
                      <BlurTextField
                        size="small"
                        type="number"
                        value={displayData.RealisedAbsoluteBenefit ?? ''}
                        onChange={(value) => onFieldChange?.(tableName, 0, 'RealisedAbsoluteBenefit', value)}
                        sx={{ '& .MuiInputBase-input': { p: 0.75 } }}
                        validations={fieldValidations?.['RealisedAbsoluteBenefit']}
                      />
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{formatValue(displayData.RealisedBenefit || displayData.RealisedBenefitRenewable || displayData.RealisedBenefitFinal)}</TableCell>
                    <TableCell>{formatValue(displayData.RealisedAbsoluteBenefit || displayData.RealisedAbsoluteBenefits)}</TableCell>
                  </>
                )}
              </TableRow>
              <TableRow sx={{ backgroundColor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Net Costs</TableCell>
                {isEditMode ? (
                  <>
                    <TableCell sx={{ p: 0.5 }}>
                      <BlurTextField
                        size="small"
                        type="number"
                        value={displayData.RealisedNetCost ?? ''}
                        onChange={(value) => onFieldChange?.(tableName, 0, 'RealisedNetCost', value)}
                        sx={{ '& .MuiInputBase-input': { p: 0.75, fontWeight: 'bold' } }}
                        validations={fieldValidations?.['RealisedNetCost']}
                      />
                    </TableCell>
                    <TableCell sx={{ p: 0.5 }}>
                      <BlurTextField
                        size="small"
                        type="number"
                        value={displayData.RealisedAbsoluteNetCost ?? ''}
                        onChange={(value) => onFieldChange?.(tableName, 0, 'RealisedAbsoluteNetCost', value)}
                        sx={{ '& .MuiInputBase-input': { p: 0.75, fontWeight: 'bold' } }}
                        validations={fieldValidations?.['RealisedAbsoluteNetCost']}
                      />
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell sx={{ fontWeight: 'bold' }}>{formatValue(displayData.RealisedNetCost || displayData.RealisedNetCostRenewable || displayData.RealisedNetCostFinal)}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{formatValue(displayData.RealisedAbsoluteNetCost)}</TableCell>
                  </>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {isEditMode ? (
          <BlurTextField
            fullWidth
            label="Description of cost estimates"
            value={displayData.RealisedDescriptionCost ?? ''}
            onChange={(value) => onFieldChange?.(tableName, 0, 'RealisedDescriptionCost', value)}
            size="small"
            multiline
            rows={3}
            sx={{ mt: 2 }}
            validations={fieldValidations?.['RealisedDescriptionCost']}
          />
        ) : (
          <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1, mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Description of cost estimates
            </Typography>
            <Typography variant="body2">{formatValue(displayData.RealisedDescriptionCost)}</Typography>
          </Box>
        )}

        {(displayRelated[realDocTable]?.length > 0 || isEditMode || SHOW_ALL_FORMS_IN_VIEW) && (
          <Accordion sx={{ mt: 2 }} defaultExpanded={isEditMode}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Realised Cost Documentation ({displayRelated[realDocTable]?.length || 0})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <EditableDataTable
                records={displayRelated[realDocTable] || []}
                tableName={realDocTable}
                title="Documentation"
                isEditMode={isEditMode}
                onFieldChange={onRelatedFieldChange || (() => {})}
              onAddRecord={onAddRecord}
              onDeleteRecord={onDeleteRecord}
              />
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
    </Stack>
  );
}

// Key Characteristics Section (Table_1)
export function KeyCharacteristicsSection({
  data,
  relatedData,
  isEditMode = false,
  editedData,
  editedRelatedData,
  onFieldChange,
  onRelatedFieldChange,
  onAddRecord,
  onDeleteRecord,
  fieldValidations,
}: SectionProps) {
  const displayData = (isEditMode && editedData ? editedData : (isEditMode ? {} : data)) || {};
  const displayRelated = isEditMode && editedRelatedData ? editedRelatedData : relatedData;

  const mainFields = [
    'GeographicalCoverage',
    'QuantifiedObjective',
    'AssessmentContribution',
    'TypePolicyInstrument',
    'OtherPolicyInstrument',
    'StatusImplementation',
    'ImplementationPeriodStart',
    'ImplementationPeriodFinish',
    'ImplementationPeriodComment',
    'ProjectionScenarios',
    'Progress',
    'Comments',
  ];

  return (
    <Stack spacing={3}>
      {/* Main Fields */}
      <FieldValueGrid
        data={displayData}
        fields={mainFields}
        isEditMode={isEditMode}
        tableName="Table_1"
        recordIndex={0}
        onFieldChange={onFieldChange}
        fieldValidations={fieldValidations}
      />

      {/* Union Policy */}
      {isEditMode ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <BlurTextField
            fullWidth
            label="Union Policy"
            value={displayData.UnionPolicy ?? ''}
            onChange={(value) => onFieldChange?.('Table_1', 0, 'UnionPolicy', value)}
            size="small"
            validations={fieldValidations?.['UnionPolicy']}
          />
          <BlurTextField
            fullWidth
            label="Union Policy List"
            value={displayData.UnionPolicyList ?? ''}
            onChange={(value) => onFieldChange?.('Table_1', 0, 'UnionPolicyList', value)}
            size="small"
            validations={fieldValidations?.['UnionPolicyList']}
          />
        </Box>
      ) : (
        <Box sx={{ p: 2, backgroundColor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.200' }}>
          <Typography variant="subtitle2" gutterBottom color="primary">
            Union Policy
          </Typography>
          {displayData.UnionPolicy ? (
            <Chip label={displayData.UnionPolicy} size="small" sx={{ mr: 1 }} />
          ) : (
            <Typography variant="body2" color="text.secondary">-</Typography>
          )}
          <Typography variant="body2">{formatValue(displayData.UnionPolicyList)}</Typography>
        </Box>
      )}

      {/* Dimensions */}
      {(displayRelated['Dimensions']?.length > 0 || isEditMode || SHOW_ALL_FORMS_IN_VIEW) && (
        <Accordion defaultExpanded={isEditMode}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontWeight: 'medium' }}>Dimensions ({displayRelated['Dimensions']?.length || 0})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <EditableDataTable
              records={displayRelated['Dimensions'] || []}
              tableName="Dimensions"
              title="Dimensions"
              isEditMode={isEditMode}
              onFieldChange={onRelatedFieldChange || (() => {})}
              onAddRecord={onAddRecord}
              onDeleteRecord={onDeleteRecord}
            />
          </AccordionDetails>
        </Accordion>
      )}

      {/* Sector Objectives */}
      {(displayRelated['SectorObjectives']?.length > 0 || isEditMode || SHOW_ALL_FORMS_IN_VIEW) && (
        <Accordion defaultExpanded={isEditMode}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontWeight: 'medium' }}>Sector Objectives ({displayRelated['SectorObjectives']?.length || 0})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <EditableDataTable
              records={displayRelated['SectorObjectives'] || []}
              tableName="SectorObjectives"
              title="Sector Objectives"
              isEditMode={isEditMode}
              onFieldChange={onRelatedFieldChange || (() => {})}
              onAddRecord={onAddRecord}
              onDeleteRecord={onDeleteRecord}
            />
            {(displayRelated['OtherObjectives']?.length > 0 || isEditMode || SHOW_ALL_FORMS_IN_VIEW) && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Other Objectives
                </Typography>
                <EditableDataTable
                  records={displayRelated['OtherObjectives'] || []}
                  tableName="OtherObjectives"
                  title="Other Objectives"
                  isEditMode={isEditMode}
                  onFieldChange={onRelatedFieldChange || (() => {})}
              onAddRecord={onAddRecord}
              onDeleteRecord={onDeleteRecord}
                />
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      )}

      {/* Entities */}
      {(displayRelated['Entities']?.length > 0 || isEditMode || SHOW_ALL_FORMS_IN_VIEW) && (
        <Accordion defaultExpanded={isEditMode}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontWeight: 'medium' }}>Implementing Entities ({displayRelated['Entities']?.length || 0})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <EditableDataTable
              records={displayRelated['Entities'] || []}
              tableName="Entities"
              title="Entities"
              isEditMode={isEditMode}
              onFieldChange={onRelatedFieldChange || (() => {})}
              onAddRecord={onAddRecord}
              onDeleteRecord={onDeleteRecord}
            />
          </AccordionDetails>
        </Accordion>
      )}

      {/* Indicators */}
      {(displayRelated['Indicators']?.length > 0 || isEditMode || SHOW_ALL_FORMS_IN_VIEW) && (
        <Accordion defaultExpanded={isEditMode}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontWeight: 'medium' }}>Indicators ({displayRelated['Indicators']?.length || 0})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <EditableDataTable
              records={displayRelated['Indicators'] || []}
              tableName="Indicators"
              title="Indicators"
              isEditMode={isEditMode}
              onFieldChange={onRelatedFieldChange || (() => {})}
              onAddRecord={onAddRecord}
              onDeleteRecord={onDeleteRecord}
            />
          </AccordionDetails>
        </Accordion>
      )}

      {/* Policy Indicators */}
      {(displayRelated['PolicyIndicators']?.length > 0 || isEditMode || SHOW_ALL_FORMS_IN_VIEW) && (
        <Accordion defaultExpanded={isEditMode}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontWeight: 'medium' }}>Policy Indicators ({displayRelated['PolicyIndicators']?.length || 0})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <EditableDataTable
              records={displayRelated['PolicyIndicators'] || []}
              tableName="PolicyIndicators"
              title="Policy Indicators"
              isEditMode={isEditMode}
              onFieldChange={onRelatedFieldChange || (() => {})}
              onAddRecord={onAddRecord}
              onDeleteRecord={onDeleteRecord}
            />
          </AccordionDetails>
        </Accordion>
      )}

      {/* References */}
      {(displayRelated['Reference']?.length > 0 || isEditMode || SHOW_ALL_FORMS_IN_VIEW) && (
        <Accordion defaultExpanded={isEditMode}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontWeight: 'medium' }}>References ({displayRelated['Reference']?.length || 0})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <EditableDataTable
              records={displayRelated['Reference'] || []}
              tableName="Reference"
              title="References"
              isEditMode={isEditMode}
              onFieldChange={onRelatedFieldChange || (() => {})}
              onAddRecord={onAddRecord}
              onDeleteRecord={onDeleteRecord}
            />
          </AccordionDetails>
        </Accordion>
      )}

      {/* Update Info */}
      {isEditMode ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <BlurTextField
            fullWidth
            label="Update Reason"
            value={displayData.UpdReason ?? ''}
            onChange={(value) => onFieldChange?.('Table_1', 0, 'UpdReason', value)}
            size="small"
            validations={fieldValidations?.['UpdReason']}
          />
          <BlurTextField
            fullWidth
            label="Explanation"
            value={displayData.Explanation ?? ''}
            onChange={(value) => onFieldChange?.('Table_1', 0, 'Explanation', value)}
            size="small"
            multiline
            rows={2}
            validations={fieldValidations?.['Explanation']}
          />
        </Box>
      ) : (
        <Box sx={{ p: 2, backgroundColor: 'warning.50', borderRadius: 1, border: '1px solid', borderColor: 'warning.200' }}>
          <Typography variant="subtitle2" gutterBottom color="warning.dark">
            Update Information
          </Typography>
          <Typography variant="body2">
            <strong>Reason:</strong> {formatValue(displayData.UpdReason)}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>Explanation:</strong> {formatValue(displayData.Explanation)}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}

// Statistics Section - Shows PAM counts by status
type StatisticsSectionProps = {
  pamsRecords: any[];
  modifiedPamIds?: Set<number>;
  originalPamIds?: Set<number>;
};

export function StatisticsSection({
  pamsRecords,
  modifiedPamIds = new Set(),
  originalPamIds = new Set(),
}: StatisticsSectionProps) {
  // Calculate status distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    pamsRecords.forEach(pam => {
      const status = pam.StatusImplementation || 'Not specified';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, y]) => ({ name, y }))
      .sort((a, b) => b.y - a.y);
  }, [pamsRecords]);

  // Calculate type distribution (Single vs Group)
  const typeData = useMemo(() => {
    const singleCount = pamsRecords.filter(p => p.IsGroup !== 'Group').length;
    const groupCount = pamsRecords.filter(p => p.IsGroup === 'Group').length;
    return [
      { name: 'Single', y: singleCount },
      { name: 'Group', y: groupCount },
    ];
  }, [pamsRecords]);

  // Calculate modification status
  const modificationData = useMemo(() => {
    const newCount = pamsRecords.filter(p => !originalPamIds.has(p.Id || p.id)).length;
    const modifiedCount = pamsRecords.filter(p =>
      modifiedPamIds.has(p.Id || p.id) && originalPamIds.has(p.Id || p.id)
    ).length;
    const unchangedCount = pamsRecords.length - newCount - modifiedCount;
    return [
      { name: 'New', y: newCount, color: '#4caf50' },
      { name: 'Modified', y: modifiedCount, color: '#ff9800' },
      { name: 'Unchanged', y: unchangedCount, color: '#9e9e9e' },
    ].filter(d => d.y > 0);
  }, [pamsRecords, modifiedPamIds, originalPamIds]);

  // Status chart options
  const statusChartOptions: Highcharts.Options = {
    chart: {
      type: 'pie',
      height: 300,
    },
    title: {
      text: 'PAMs by Implementation Status',
      style: { fontSize: '14px' },
    },
    tooltip: {
      pointFormat: '<b>{point.y}</b> PAMs ({point.percentage:.1f}%)',
    },
    plotOptions: {
      pie: {
        innerSize: '50%',
        dataLabels: {
          enabled: true,
          format: '{point.name}: {point.y}',
          style: { fontSize: '11px' },
        },
      },
    },
    series: [{
      type: 'pie',
      name: 'PAMs',
      data: statusData,
    }],
    credits: { enabled: false },
  };

  // Type chart options
  const typeChartOptions: Highcharts.Options = {
    chart: {
      type: 'pie',
      height: 250,
    },
    title: {
      text: 'PAMs by Type',
      style: { fontSize: '14px' },
    },
    tooltip: {
      pointFormat: '<b>{point.y}</b> PAMs ({point.percentage:.1f}%)',
    },
    plotOptions: {
      pie: {
        innerSize: '50%',
        colors: ['#2196f3', '#9c27b0'],
        dataLabels: {
          enabled: true,
          format: '{point.name}: {point.y}',
          style: { fontSize: '11px' },
        },
      },
    },
    series: [{
      type: 'pie',
      name: 'PAMs',
      data: typeData,
    }],
    credits: { enabled: false },
  };

  // Modification status chart options
  const modificationChartOptions: Highcharts.Options = {
    chart: {
      type: 'pie',
      height: 250,
    },
    title: {
      text: 'Modification Status',
      style: { fontSize: '14px' },
    },
    tooltip: {
      pointFormat: '<b>{point.y}</b> PAMs ({point.percentage:.1f}%)',
    },
    plotOptions: {
      pie: {
        innerSize: '50%',
        dataLabels: {
          enabled: true,
          format: '{point.name}: {point.y}',
          style: { fontSize: '11px' },
        },
      },
    },
    series: [{
      type: 'pie',
      name: 'PAMs',
      data: modificationData,
    }],
    credits: { enabled: false },
  };

  if (pamsRecords.length === 0) {
    return <Alert severity="info">No PAMs data available for statistics</Alert>;
  }

  return (
    <Stack spacing={3}>
      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
        <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'primary.50' }}>
          <Typography variant="h4" color="primary">{pamsRecords.length}</Typography>
          <Typography variant="body2" color="text.secondary">Total PAMs</Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'info.50' }}>
          <Typography variant="h4" color="info.main">{typeData[0].y}</Typography>
          <Typography variant="body2" color="text.secondary">Single PAMs</Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'secondary.50' }}>
          <Typography variant="h4" color="secondary">{typeData[1].y}</Typography>
          <Typography variant="body2" color="text.secondary">Group PAMs</Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'success.50' }}>
          <Typography variant="h4" color="success.main">{statusData.length}</Typography>
          <Typography variant="body2" color="text.secondary">Status Categories</Typography>
        </Paper>
      </Box>

      {/* Main Status Chart */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <HighchartsReact highcharts={Highcharts} options={statusChartOptions} />
      </Paper>

      {/* Secondary Charts */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <HighchartsReact highcharts={Highcharts} options={typeChartOptions} />
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <HighchartsReact highcharts={Highcharts} options={modificationChartOptions} />
        </Paper>
      </Box>

      {/* Status Breakdown Table */}
      <Paper variant="outlined">
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight="medium">Status Breakdown</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Implementation Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Count</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Percentage</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {statusData.map(({ name, y }) => (
                <TableRow key={name} hover>
                  <TableCell>
                    <Chip label={name} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">{y}</TableCell>
                  <TableCell align="right">{((y / pamsRecords.length) * 100).toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  );
}
