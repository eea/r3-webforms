using Api.Models;

namespace Api.Services;

public record JobProgress(string Status, int Percent, string? DownloadUrl = null);

public interface IRn3Service
{
    /// <summary>GET /dataschema/v1/getSimpleSchema/dataset/{datasetId}?dataflowId={dataflowId}</summary>
    Task<Rn3SimpleSchema> GetSimpleSchema(string datasetId, string dataflowId);

    /// <summary>GET /dataset/v3/etlExport/{datasetId}?dataflowId={dataflowId} — returns pollingUrl</summary>
    Task<string> TriggerEtlExport(string datasetId, string dataflowId);

    /// <summary>
    /// Polls /orchestrator/jobs until the given jobId reaches a terminal status.
    /// Yields progress updates. Throws on FAILED/ERROR.
    /// </summary>
    IAsyncEnumerable<JobProgress> PollOrchestratorJob(
        string jobId,
        int maxAttempts = 60,
        int intervalMs = 3000,
        CancellationToken cancellationToken = default);

    /// <summary>Downloads the ZIP from downloadUrl and extracts the single JSON file inside.</summary>
    Task<string> DownloadAndExtractJson(string downloadUrl);

    /// <summary>Downloads the ZIP from downloadUrl as raw bytes (for CSV export).</summary>
    Task<byte[]> DownloadZipBytes(string downloadUrl);

    /// <summary>PUT /orchestrator/jobs/addValidationJob/{datasetId}</summary>
    Task TriggerValidation(string datasetId);

    /// <summary>
    /// Polls /orchestrator/jobs until the VALIDATION job for the given dataset reaches a terminal status.
    /// Yields progress updates.
    /// </summary>
    IAsyncEnumerable<JobProgress> PollValidationJob(
        string datasetId,
        int maxAttempts = 90,
        int intervalMs = 3000,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Fetches validation results for all tables in a dataset.
    /// Returns raw JSON (the TableValueDataset response per table, keyed by table name).
    /// </summary>
    Task<Dictionary<string, object>> GetValidationResults(string datasetId, string dataflowId);

    /// <summary>
    /// POST /dataset/v2/importFileData/{datasetId}?dataflowId={dataflowId}&amp;replace=true&amp;providerId=86
    /// Returns the jobId.
    /// </summary>
    Task<string> ImportFileData(string datasetId, string dataflowId, byte[] zipBytes);

    /// <summary>GET /dataset/v1/exportDatasetFile/{datasetId}?mimeType=csv — returns ZIP bytes</summary>
    Task<byte[]> ExportDatasetFile(string datasetId);
}
