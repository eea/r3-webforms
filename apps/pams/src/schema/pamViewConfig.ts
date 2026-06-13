// PAM View Configuration - derived from PAMTEST.json
// Defines the structure for PAMs Details visualization

export interface FieldElement {
  type: 'FIELD';
  name: string;
  title: string;
  tooltip?: string;
  isPrimary?: boolean;
  customInput?: string;
  readOnly?: boolean;
  calculatedWhenGroup?: boolean;
  hideWhenCalculated?: boolean;
  hideWhenSingle?: boolean;
  showRequiredCharacter?: boolean;
  dependency?: {
    field: string;
    value: string[];
  };
}

export interface LabelElement {
  type: 'LABEL';
  level?: number;
  title: string;
  tooltip?: string;
  showRequiredCharacter?: boolean;
}

export interface BlockElement {
  type: 'BLOCK';
  elements: (FieldElement | LabelElement)[];
}

export interface TableElement {
  type: 'TABLE';
  name: string;
  label?: string;
  title: string;
  multipleRecords?: boolean;
  showInsideParentTable?: boolean;
  showRequiredCharacter?: boolean;
  hasCalculatedFields?: boolean;
  parentTable?: boolean;
  dependency?: {
    field: string;
    value: string[];
  };
  elements: (FieldElement | LabelElement | BlockElement | TableElement)[];
}

export type ViewElement = FieldElement | LabelElement | BlockElement | TableElement;

export interface TableDefinition {
  name: string;
  label: string;
  title: string;
  multipleRecords?: boolean;
  isVisible?: boolean;
  elements: ViewElement[];
}

export interface OverviewField {
  field: string;
  type: 'FIELD' | 'TABLE';
  header: string;
}

export interface PamViewConfig {
  overview: OverviewField[];
  tables: TableDefinition[];
}

// Overview configuration - first 5 are info fields, rest are tabs
export const pamOverview: OverviewField[] = [
  { field: 'Id', type: 'FIELD', header: 'PaM Number' },
  { field: 'NECP_PamId', type: 'FIELD', header: 'PaM number in NECP' },
  { field: 'Title', type: 'FIELD', header: 'Name' },
  { field: 'TitleNational', type: 'FIELD', header: 'Name in national language' },
  { field: 'IsGroup', type: 'FIELD', header: 'Single or group' },
  { field: 'Table_1', type: 'TABLE', header: 'Key characteristics' },
  { field: 'GHG_ExAnte', type: 'TABLE', header: 'GHG: Ex-ante and ex-post' },
  { field: 'GHG_CostBen', type: 'TABLE', header: 'GHG: Costs and benefits' },
  { field: 'RES_ExAnte', type: 'TABLE', header: 'Renewable energy: Ex-ante and ex-post' },
  { field: 'RES_CostBen', type: 'TABLE', header: 'Renewable energy: Costs and benefits' },
  { field: 'EE_ExAnte', type: 'TABLE', header: 'Energy efficiency: Ex-ante and ex-post' },
  { field: 'EE_CostBen', type: 'TABLE', header: 'Energy efficiency: Costs and benefits' },
];

// Get info fields (FIELD type from overview)
export const getInfoFields = () => pamOverview.filter(f => f.type === 'FIELD');

// Get tab definitions (TABLE type from overview)
export const getTabDefinitions = () => pamOverview.filter(f => f.type === 'TABLE');

// Tab icons mapping
export const tabIcons: Record<string, string> = {
  'Table_1': 'info',
  'GHG_ExAnte': 'eco',
  'GHG_CostBen': 'payments',
  'RES_ExAnte': 'solar_power',
  'RES_CostBen': 'payments',
  'EE_ExAnte': 'bolt',
  'EE_CostBen': 'payments',
};

// Tab colors for visual distinction
export const tabColors: Record<string, string> = {
  'Table_1': '#1976d2',      // Blue - Key characteristics
  'GHG_ExAnte': '#2e7d32',   // Green - GHG
  'GHG_CostBen': '#2e7d32',  // Green - GHG
  'RES_ExAnte': '#f57c00',   // Orange - Renewable
  'RES_CostBen': '#f57c00',  // Orange - Renewable
  'EE_ExAnte': '#7b1fa2',    // Purple - Energy efficiency
  'EE_CostBen': '#7b1fa2',   // Purple - Energy efficiency
};

// Field groups for GHG Ex-Ante table (yearly data)
export const ghgExAnteYears = [
  { year: 2025, fields: ['EUETS_1', 'ESR_1', 'LULUCF_1', 'Total_1'] },
  { year: 2030, fields: ['EUETS_2', 'ESR_2', 'LULUCF_2', 'Total_2'] },
  { year: 2035, fields: ['EUETS_3', 'ESR_3', 'LULUCF_3', 'Total_3'] },
  { year: 2040, fields: ['EUETS_4', 'ESR_4', 'LULUCF_4', 'Total_4'] },
  { year: 2045, fields: ['EUETS_5', 'ESR_5', 'LULUCF_5', 'Total_5'] },
  { year: 2050, fields: ['EUETS_6', 'ESR_6', 'LULUCF_6', 'Total_6'] },
  { year: 2055, fields: ['EUETS_7', 'ESR_7', 'LULUCF_7', 'Total_7'] },
];

// Field groups for RES Ex-Ante table (yearly data)
export const resExAnteYears = [
  { year: 2025, field: 'RE_2025' },
  { year: 2030, field: 'RE_2030' },
  { year: 2035, field: 'RE_2035' },
  { year: 2040, field: 'RE_2040' },
  { year: 2045, field: 'RE_2045' },
  { year: 2050, field: 'RE_2050' },
  { year: 2055, field: 'RE_2055' },
];

// Field groups for EE Ex-Ante table (yearly data)
export const eeExAnteYears = [
  { year: 2025, field: 'ER_2025' },
  { year: 2030, field: 'ER_2030' },
  { year: 2035, field: 'ER_2035' },
  { year: 2040, field: 'ER_2040' },
  { year: 2045, field: 'ER_2045' },
  { year: 2050, field: 'ER_2050' },
  { year: 2055, field: 'ER_2055' },
];

// Related child tables for each tab
export const relatedTables: Record<string, string[]> = {
  'Table_1': [
    'Dimensions',
    'SectorObjectives',
    'OtherObjectives',
    'UnionPolicyOther',
    'Entities',
    'Indicators',
    'PolicyIndicators',
    'Reference',
  ],
  'GHG_ExAnte': [
    'GHG_ExAnte_Docs',
    'GHG_ExPost_emissions',
    'GHG_ExPost_additional',
    'GHG_ExPost_Docs',
  ],
  'GHG_CostBen': [
    'GHG_CostBen_Proj_Docs',
    'GHG_CostBen_Real_Docs',
  ],
  'RES_ExAnte': [
    'RES_ExAnte_Docs',
    'RES_ExPost',
    'RES_ExPost_Docs',
  ],
  'RES_CostBen': [
    'RES_CostBen_Proj_Docs',
    'RES_CostBen_Real_Docs',
  ],
  'EE_ExAnte': [
    'EE_ExAnte_Docs',
    'EE_ExPost',
    'EE_ExPost_Docs',
  ],
  'EE_CostBen': [
    'EE_CostBen_Proj_Docs',
    'EE_CostBen_Real_Docs',
  ],
};

// Helper to get human-readable field labels
export const fieldLabels: Record<string, string> = {
  // PaMs info fields
  Id: 'PaM Number',
  NECP_PamId: 'PaM number in NECP',
  Title: 'Name',
  TitleNational: 'Name in national language',
  IsGroup: 'Single or group',
  ShortDescription: 'Short description',
  ListOfSinglePams: 'Policies/measures covered',

  // Table_1 fields
  GeographicalCoverage: 'Geographical coverage',
  QuantifiedObjective: 'Quantified Objective',
  AssessmentContribution: 'Assessment of contribution to climate-neutrality',
  TypePolicyInstrument: 'Type of policy instrument',
  OtherPolicyInstrument: 'Other policy instrument',
  UnionPolicyList: 'Union policy list',
  UnionPolicy: 'Related/Non related',
  RelevantProvision: 'Relevant provision(s)',
  OtherRelevantProvision: 'Other relevant provision',
  StatusImplementation: 'Status of implementation',
  ImplementationPeriodStart: 'Start year',
  ImplementationPeriodFinish: 'Finish year',
  ImplementationPeriodComment: 'Implementation period comment',
  Comments: 'General comments',
  UpdReason: 'Update since last submission',
  Explanation: 'Explanation',
  Progress: 'Progress against policy objective',
  ProjectionScenarios: 'Projections scenario',

  // GHG fields
  PolicyImpacting: 'Policy impacting EU ETS, LULUCF and/or ESD/ESR',
  FactorsAffected: 'Factors affected by the PaM',

  // Cost/Benefit fields
  ProjectedYearStart: 'Start year (projected)',
  ProjectedYearFinish: 'End year (projected)',
  ProjectedReferenceYear: 'Price reference year',
  ProjectedCost: 'Gross costs (EUR/tonne CO2eq)',
  ProjectedAbsoluteCost: 'Absolute gross costs (EUR/year)',
  ProjectedBenefit: 'Benefits (EUR/tonne CO2eq)',
  ProjectedAbsoluteBenefit: 'Absolute benefit (EUR/year)',
  ProjectedNetCost: 'Net costs (EUR/tonne CO2eq)',
  ProjectedAbsoluteNetCost: 'Absolute net cost (EUR/year)',
  ProjectedDescriptionCost: 'Description of cost estimates',
  ProjectedDescriptionNonGHG: 'Description of non-GHG benefits',

  RealisedYearStart: 'Start year (realised)',
  RealisedYearFinish: 'End year (realised)',
  RealisedReferenceYear: 'Price reference year',
  RealisedCost: 'Gross costs (EUR/tonne CO2eq)',
  RealisedAbsoluteCost: 'Absolute gross costs (EUR/year)',
  RealisedBenefit: 'Benefits (EUR/tonne CO2eq)',
  RealisedAbsoluteBenefit: 'Absolute benefit (EUR/year)',
  RealisedNetCost: 'Net costs (EUR/tonne CO2eq)',
  RealisedAbsoluteNetCost: 'Absolute net cost (EUR/year)',
  RealisedDescriptionCost: 'Description of cost estimates',
  RealisedDescriptionNonGHG: 'Description of non-GHG benefits',
};

// Get label for a field
export function getFieldLabel(fieldName: string): string {
  return fieldLabels[fieldName] || fieldName.replace(/_/g, ' ');
}
