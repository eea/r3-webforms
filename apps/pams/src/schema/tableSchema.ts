// Auto-generated from CSV table definitions
// Source: support_docu/table-definition-40400-2026-02-12 11.05.05/

export type FieldType =
  | 'NUMBER_INTEGER'
  | 'NUMBER_DECIMAL'
  | 'TEXT'
  | 'TEXTAREA'
  | 'LINK'
  | 'CODELIST'
  | 'MULTISELECT_CODELIST'
  | 'URL';

export interface FieldSchema {
  type: FieldType;
  required: boolean;
  readOnly: boolean;
  pk: boolean;
  description: string;
  extraInfo: string;
}

export interface TableSchema {
  fields: Record<string, FieldSchema>;
}

export interface DataflowSchema {
  tables: Record<string, TableSchema>;
}

// Complete schema definition for all tables
export const dataflowSchema: DataflowSchema = {
  tables: {
    PaMs: {
      fields: {
        Id: { type: 'NUMBER_INTEGER', required: true, readOnly: false, pk: true, description: '', extraInfo: '' },
        NECP_PamId: { type: 'TEXT', required: false, readOnly: false, pk: false, description: 'PaM number in NECP, if different', extraInfo: '' },
        Title: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        TitleNational: { type: 'TEXT', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        IsGroup: { type: 'CODELIST', required: true, readOnly: false, pk: false, description: 'Boolean', extraInfo: 'Single;Group' },
        ListOfSinglePams: { type: 'TEXT', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ShortDescription: { type: 'TEXTAREA', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    Table_1: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        GeographicalCoverage: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        QuantifiedObjective: { type: 'TEXT', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        AssessmentContribution: { type: 'TEXTAREA', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        TypePolicyInstrument: { type: 'LINK', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        OtherPolicyInstrument: { type: 'TEXT', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        UnionPolicyList: { type: 'LINK', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RelevantProvision: { type: 'LINK', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        OtherRelevantProvision: { type: 'TEXT', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        UnionPolicy: { type: 'CODELIST', required: false, readOnly: false, pk: false, description: '', extraInfo: 'Related;Non related' },
        StatusImplementation: { type: 'LINK', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ImplementationPeriodStart: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: 'Year', extraInfo: '' },
        ImplementationPeriodFinish: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: 'Year', extraInfo: '' },
        ImplementationPeriodComment: { type: 'TEXTAREA', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Comments: { type: 'TEXTAREA', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        UpdReason: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Explanation: { type: 'TEXTAREA', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Progress: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectionScenarios: { type: 'LINK', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    Dimensions: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: 'PAM_ID', extraInfo: '' },
        Dimension: { type: 'LINK', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ObjTargCont: { type: 'LINK', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Vectors: { type: 'LINK', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Vectors_OtherFuels: { type: 'TEXT', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Priorities: { type: 'LINK', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Technologies: { type: 'LINK', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Sectors: { type: 'TEXTAREA', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        GHG_affected: { type: 'LINK', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    SectorObjectives: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: 'PAM_ID', extraInfo: '' },
        Id_SectorObjectives: { type: 'TEXT', required: true, readOnly: false, pk: true, description: '', extraInfo: '' },
        SectorAffected: { type: 'LINK', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        OtherSectors: { type: 'TEXT', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Objective: { type: 'LINK', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    OtherObjectives: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Fk_SectorObjectives: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Other: { type: 'TEXT', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    UnionPolicyOther: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        OtherUnionPolicy: { type: 'TEXT', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    Entities: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Type: { type: 'CODELIST', required: true, readOnly: false, pk: false, description: '', extraInfo: 'National government;Regional entities;Local government;Companies / businesses / industrial associations;Research institutions;Others' },
        Name: { type: 'TEXT', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    Indicators: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Description: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Unit: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Year1: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Year2: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Year3: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Year4: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Value1: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Value2: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Value3: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Value4: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    PolicyIndicators: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: true, description: 'PAM_ID', extraInfo: '' },
        Indicator: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Year: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Value: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Unit: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    Reference: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Reference: { type: 'TEXT', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        URL: { type: 'URL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    GHG_ExAnte: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        PolicyImpacting: { type: 'MULTISELECT_CODELIST', required: false, readOnly: false, pk: false, description: '', extraInfo: 'EU ETS;ESD/ESR;LULUCF' },
        EUETS_1: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ESR_1: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        LULUCF_1: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Total_1: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        EUETS_2: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ESR_2: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        LULUCF_2: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Total_2: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        EUETS_3: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ESR_3: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        LULUCF_3: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Total_3: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        EUETS_4: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ESR_4: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        LULUCF_4: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Total_4: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        EUETS_5: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ESR_5: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        LULUCF_5: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Total_5: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        EUETS_6: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ESR_6: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        LULUCF_6: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Total_6: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        EUETS_7: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ESR_7: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        LULUCF_7: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Total_7: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Explanation: { type: 'TEXTAREA', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        FactorsAffected: { type: 'TEXT', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    GHG_ExAnte_Docs: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Reference: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        WebLink: { type: 'URL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    GHG_ExPost_emissions: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Year: { type: 'NUMBER_INTEGER', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Value_EU_ETS: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Value_ESR: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Value_LULUCF: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Value_Total: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    GHG_ExPost_additional: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Explanation: { type: 'TEXTAREA', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        FactorAffected: { type: 'TEXT', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    GHG_ExPost_Docs: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Reference: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        WebLink: { type: 'URL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    GHG_CostBen: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedCost: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedAbsoluteCost: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedBenefit: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedAbsoluteBenefit: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedNetCost: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedAbsoluteNetCost: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedYearStart: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedYearFinish: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedReferenceYear: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedDescriptionCost: { type: 'TEXTAREA', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedDescriptionNonGHG: { type: 'TEXTAREA', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedCost: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedAbsoluteCost: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedBenefit: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedAbsoluteBenefit: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedNetCost: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedAbsoluteNetCost: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedYearStart: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedYearFinish: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedReferenceYear: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedDescriptionCost: { type: 'TEXTAREA', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedDescriptionNonGHG: { type: 'TEXTAREA', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    GHG_CostBen_Proj_Docs: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Reference: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        URL: { type: 'URL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    GHG_CostBen_Real_Docs: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Reference: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        URL: { type: 'URL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    RES_ExAnte: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: true, description: '', extraInfo: '' },
        RE_2025: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RE_2030: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RE_2035: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RE_2040: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RE_2045: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RE_2050: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RE_2055: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Explanation: { type: 'TEXTAREA', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    RES_ExAnte_Docs: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Reference: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        WebLink: { type: 'URL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    RES_ExPost: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Year: { type: 'NUMBER_INTEGER', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        RE: { type: 'NUMBER_DECIMAL', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Explanation: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    RES_ExPost_Docs: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Reference: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        WebLink: { type: 'URL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    RES_CostBen: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedYearStart: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedYearFinish: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedPriceYear: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedGrossCostRenewable: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedAbsoluteGross: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedAbsoluteBenefits: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedBenefitRenewable: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedRenewableNetCost: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedAbsoluteNetCost: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedDescriptionCost: { type: 'TEXTAREA', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedDescriptionBenefit: { type: 'TEXTAREA', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedPriceYear: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedYearStart: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedYearFinish: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedGrossCostRenewable: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedAbsoluteGross: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedBenefitRenewable: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedAbsoluteBenefits: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedNetCostRenewable: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedAbsoluteNetCost: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedDescriptionCost: { type: 'TEXTAREA', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedDescriptionBenefit: { type: 'TEXTAREA', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    RES_CostBen_Proj_Docs: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Reference: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        URL: { type: 'URL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    RES_CostBen_Real_Docs: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Reference: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        URL: { type: 'URL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    EE_ExAnte: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: true, description: '', extraInfo: '' },
        ER_2025: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ER_2030: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ER_2035: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ER_2040: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ER_2045: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ER_2050: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ER_2055: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        Explanation: { type: 'TEXTAREA', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    EE_ExAnte_Docs: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Reference: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        WebLink: { type: 'URL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    EE_ExPost: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Year: { type: 'NUMBER_INTEGER', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        ER: { type: 'NUMBER_DECIMAL', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Explanation: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    EE_ExPost_Docs: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Reference: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        WebLink: { type: 'URL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    EE_CostBen: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedYearStart: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedYearFinish: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedPriceYear: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedGrossCostFinal: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedAbsoluteGross: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedAbsoluteBenefits: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedBenefitFinal: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedReductionNetCost: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedAbsoluteNetCost: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedDescriptionCost: { type: 'TEXTAREA', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        ProjectedDescriptionBenefit: { type: 'TEXTAREA', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedYearStart: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedYearFinish: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedPriceYear: { type: 'NUMBER_INTEGER', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedGrossCostFinal: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedAbsoluteGross: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedBenefitFinal: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedAbsoluteBenefits: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedNetCostFinal: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedAbsoluteNetCost: { type: 'NUMBER_DECIMAL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedDescriptionCost: { type: 'TEXTAREA', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
        RealisedDescriptionBenefit: { type: 'TEXTAREA', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    EE_CostBen_Proj_Docs: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Reference: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        URL: { type: 'URL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
    EE_CostBen_Real_Docs: {
      fields: {
        Fk_PaMs: { type: 'LINK', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        Reference: { type: 'TEXT', required: true, readOnly: false, pk: false, description: '', extraInfo: '' },
        URL: { type: 'URL', required: false, readOnly: false, pk: false, description: '', extraInfo: '' },
      },
    },
  },
};

// Helper function to get field schema for a table and field
export function getFieldSchema(tableName: string, fieldName: string): FieldSchema | undefined {
  const table = dataflowSchema.tables[tableName];
  if (!table) return undefined;
  return table.fields[fieldName];
}

// Helper function to get all field schemas for a table
export function getTableSchema(tableName: string): TableSchema | undefined {
  return dataflowSchema.tables[tableName];
}

// Helper function to convert schema type to DataGrid type
export function schemaTypeToGridType(schemaType: FieldType): 'string' | 'number' | 'boolean' | 'date' | 'dateTime' {
  switch (schemaType) {
    case 'NUMBER_INTEGER':
    case 'NUMBER_DECIMAL':
      return 'number';
    case 'TEXT':
    case 'TEXTAREA':
    case 'LINK':
    case 'CODELIST':
    case 'MULTISELECT_CODELIST':
    case 'URL':
    default:
      return 'string';
  }
}

// Helper function to check if a field should be an integer
export function isIntegerField(schemaType: FieldType): boolean {
  return schemaType === 'NUMBER_INTEGER';
}

// Helper function to check if a field should be a decimal
export function isDecimalField(schemaType: FieldType): boolean {
  return schemaType === 'NUMBER_DECIMAL';
}

// Helper function to parse a value based on schema type
export function parseValueBySchemaType(value: any, schemaType: FieldType): any {
  if (value === null || value === undefined || value === '') {
    return value;
  }

  switch (schemaType) {
    case 'NUMBER_INTEGER': {
      const parsed = parseInt(String(value), 10);
      return isNaN(parsed) ? value : parsed;
    }
    case 'NUMBER_DECIMAL': {
      const parsed = parseFloat(String(value));
      return isNaN(parsed) ? value : parsed;
    }
    default:
      return value;
  }
}

// Build a lookup map for faster field type resolution
// This maps fieldName (case-insensitive) to its schema type across all tables
export const fieldTypeMap: Map<string, FieldType> = new Map();

// Populate the field type map
Object.entries(dataflowSchema.tables).forEach(([_tableName, table]) => {
  Object.entries(table.fields).forEach(([fieldName, fieldSchema]) => {
    // Use lowercase for case-insensitive lookup
    const lowerFieldName = fieldName.toLowerCase();
    // Only set if not already set (first occurrence wins)
    if (!fieldTypeMap.has(lowerFieldName)) {
      fieldTypeMap.set(lowerFieldName, fieldSchema.type);
    }
  });
});

// Helper to get field type from the global map
export function getFieldType(fieldName: string): FieldType | undefined {
  return fieldTypeMap.get(fieldName.toLowerCase());
}
