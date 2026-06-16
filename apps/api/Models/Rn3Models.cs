using System.Text.Json.Serialization;

namespace Api.Models;

// ── ETL Export ───────────────────────────────────────────────────────────────

public class Rn3ExportJobResponse
{
    [JsonPropertyName("pollingUrl")]
    public string? PollingUrl { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }
}

// ── Orchestrator Job ─────────────────────────────────────────────────────────

public class Rn3OrchestratorJobsResponse
{
    [JsonPropertyName("jobsList")]
    public List<Rn3OrchestratorJob>? JobsList { get; set; }
}

public class Rn3OrchestratorJob
{
    [JsonPropertyName("id")]
    public object? Id { get; set; }  // can be int or string

    [JsonPropertyName("jobId")]
    public object? JobId { get; set; }

    [JsonPropertyName("jobStatus")]
    public string? JobStatus { get; set; }

    [JsonPropertyName("jobType")]
    public string? JobType { get; set; }

    [JsonPropertyName("datasetId")]
    public object? DatasetId { get; set; }

    [JsonPropertyName("downloadUrl")]
    public string? DownloadUrl { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    public string EffectiveStatus => JobStatus ?? Status ?? string.Empty;
    public string EffectiveId => Id?.ToString() ?? JobId?.ToString() ?? string.Empty;
}

// ── Import ───────────────────────────────────────────────────────────────────

public class Rn3ImportResponse
{
    [JsonPropertyName("jobId")]
    public object? JobId { get; set; }
}

// ── Schema ───────────────────────────────────────────────────────────────────

public class Rn3SimpleSchema
{
    [JsonPropertyName("tables")]
    public List<Rn3SimpleTable>? Tables { get; set; }
}

public class Rn3SimpleTable
{
    [JsonPropertyName("tableName")]
    public string? TableName { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("fields")]
    public List<Rn3SimpleField>? Fields { get; set; }

    public string EffectiveName => TableName ?? Name ?? string.Empty;
}

public class Rn3SimpleField
{
    [JsonPropertyName("fieldName")]
    public string? FieldName { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("fieldType")]
    public string? FieldType { get; set; }

    public string EffectiveName => (FieldName ?? Name ?? string.Empty).TrimStart('\uFEFF');
}

// ── Full Schema (for validation results) ─────────────────────────────────────

public class Rn3FullSchemaResponse
{
    [JsonPropertyName("tableSchemas")]
    public List<Rn3TableSchema>? TableSchemas { get; set; }

    [JsonPropertyName("tables")]
    public List<Rn3TableSchema>? Tables { get; set; }

    public List<Rn3TableSchema> EffectiveTables => TableSchemas ?? Tables ?? [];
}

public class Rn3TableSchema
{
    [JsonPropertyName("idTableSchema")]
    public string? IdTableSchema { get; set; }

    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("nameTableSchema")]
    public string? NameTableSchema { get; set; }

    [JsonPropertyName("tableName")]
    public string? TableName { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("recordSchema")]
    public Rn3RecordSchema? RecordSchema { get; set; }

    public string EffectiveId => IdTableSchema ?? Id ?? string.Empty;
    public string EffectiveName => NameTableSchema ?? TableName ?? Name ?? string.Empty;
}

public class Rn3RecordSchema
{
    [JsonPropertyName("fieldSchema")]
    public List<Rn3FieldSchema>? FieldSchema { get; set; }
}

public class Rn3FieldSchema
{
    [JsonPropertyName("idFieldSchema")]
    public string? IdFieldSchema { get; set; }

    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("headerName")]
    public string? HeaderName { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("fieldName")]
    public string? FieldName { get; set; }

    public string EffectiveId => IdFieldSchema ?? Id ?? string.Empty;
    public string EffectiveName => HeaderName ?? Name ?? FieldName ?? string.Empty;
}

// ── Validation Results ────────────────────────────────────────────────────────

public class Rn3ValidationResultsResponse
{
    [JsonPropertyName("records")]
    public List<Rn3ValidationRecord>? Records { get; set; }

    [JsonPropertyName("totalRecords")]
    public int TotalRecords { get; set; }
}

public class Rn3ValidationRecord
{
    [JsonPropertyName("recordId")]
    public string? RecordId { get; set; }

    [JsonPropertyName("validations")]
    public List<Rn3ValidationError>? Validations { get; set; }

    [JsonPropertyName("fields")]
    public List<Rn3RecordField>? Fields { get; set; }
}

public class Rn3ValidationError
{
    [JsonPropertyName("idValidation")]
    public string? IdValidation { get; set; }

    [JsonPropertyName("levelError")]
    public string? LevelError { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("idRule")]
    public string? IdRule { get; set; }

    [JsonPropertyName("shortCode")]
    public string? ShortCode { get; set; }
}

public class Rn3RecordField
{
    [JsonPropertyName("idFieldSchema")]
    public string? IdFieldSchema { get; set; }

    [JsonPropertyName("value")]
    public string? Value { get; set; }
}
