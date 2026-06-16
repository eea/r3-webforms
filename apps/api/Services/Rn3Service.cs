using System.IO.Compression;
using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Api.Models;

namespace Api.Services;

public class Rn3Service(
    IHttpClientFactory httpClientFactory,
    IHttpContextAccessor httpContextAccessor,
    Rn3TokenStore tokenStore,
    ILogger<Rn3Service> logger) : IRn3Service
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    private static readonly string[] TerminalStatuses = ["FINISHED", "FAILED", "ERROR", "CANCELED", "REFUSED", "CANCELED_BY_ADMIN"];
    private static readonly string[] FailedStatuses = ["FAILED", "ERROR", "CANCELED", "REFUSED", "CANCELED_BY_ADMIN"];

    // ── HTTP client with per-user Bearer token ────────────────────────────────

    private HttpClient CreateClient()
    {
        var client = httpClientFactory.CreateClient("rn3");
        // Prefer explicitly-set token (background tasks) over session (inline requests)
        var token = tokenStore.Token ?? httpContextAccessor.HttpContext?.Session.GetString("rn3_token");
        if (!string.IsNullOrEmpty(token))
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    // ── Schema ────────────────────────────────────────────────────────────────

    public async Task<Rn3SimpleSchema> GetSimpleSchema(string datasetId, string dataflowId)
    {
        var client = CreateClient();
        var url = $"/dataschema/v1/getSimpleSchema/dataset/{datasetId}?dataflowId={dataflowId}";
        logger.LogDebug("GetSimpleSchema {Url}", url);
        var response = await client.GetAsync(url);
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<Rn3SimpleSchema>(json, JsonOpts)
            ?? throw new InvalidOperationException("Empty schema response from RN3");
    }

    // ── ETL Export ────────────────────────────────────────────────────────────

    public async Task<string> TriggerEtlExport(string datasetId, string dataflowId)
    {
        var client = CreateClient();
        var url = $"/dataset/v3/etlExport/{datasetId}?dataflowId={dataflowId}";
        logger.LogDebug("TriggerEtlExport {Url}", url);
        var response = await client.GetAsync(url);
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<Rn3ExportJobResponse>(body, JsonOpts);
        if (string.IsNullOrEmpty(result?.PollingUrl))
            throw new InvalidOperationException($"RN3 etlExport did not return a pollingUrl. Response: {body}");
        logger.LogInformation("ETL export triggered for dataset {DatasetId}, pollingUrl: {Url}", datasetId, result.PollingUrl);
        return result.PollingUrl;
    }

    // ── Orchestrator Job Polling ──────────────────────────────────────────────

    public async IAsyncEnumerable<JobProgress> PollOrchestratorJob(
        string jobId,
        int maxAttempts = 60,
        int intervalMs = 3000,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var client = CreateClient();
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            await Task.Delay(intervalMs, cancellationToken);

            var response = await client.GetAsync(
                "/orchestrator/jobs/?pageNum=0&pageSize=50&asc=0&sortedColumn=dateAdded",
                cancellationToken);
            response.EnsureSuccessStatusCode();

            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            var jobs = JsonSerializer.Deserialize<Rn3OrchestratorJobsResponse>(body, JsonOpts);
            var job = jobs?.JobsList?.FirstOrDefault(j => j.EffectiveId == jobId);

            var status = job?.EffectiveStatus ?? "IN_PROGRESS";
            var percent = Math.Min(attempt * 100 / maxAttempts, 95);
            logger.LogDebug("PollOrchestratorJob {JobId} attempt {Attempt}: {Status}", jobId, attempt, status);

            if (FailedStatuses.Contains(status))
                throw new InvalidOperationException($"Job {jobId} ended with status: {status}");

            if (status == "FINISHED")
            {
                yield return new JobProgress("FINISHED", 100, job?.DownloadUrl);
                yield break;
            }

            yield return new JobProgress(status, percent);
        }

        throw new TimeoutException($"Job {jobId} did not finish after {maxAttempts} attempts");
    }

    // ── Validation Job Polling ────────────────────────────────────────────────

    public async IAsyncEnumerable<JobProgress> PollValidationJob(
        string datasetId,
        int maxAttempts = 90,
        int intervalMs = 3000,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var client = CreateClient();
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            await Task.Delay(intervalMs, cancellationToken);

            var response = await client.GetAsync(
                "/orchestrator/jobs/?pageNum=0&pageSize=30&asc=0&sortedColumn=dateAdded",
                cancellationToken);
            response.EnsureSuccessStatusCode();

            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            var jobs = JsonSerializer.Deserialize<Rn3OrchestratorJobsResponse>(body, JsonOpts);
            var job = jobs?.JobsList?.FirstOrDefault(j =>
                j.JobType == "VALIDATION" && j.DatasetId?.ToString() == datasetId);

            var status = job?.EffectiveStatus ?? "IN_PROGRESS";
            var percent = Math.Min(attempt * 100 / maxAttempts, 95);
            logger.LogDebug("PollValidationJob dataset {DatasetId} attempt {Attempt}: {Status}", datasetId, attempt, status);

            if (FailedStatuses.Contains(status))
                throw new InvalidOperationException($"Validation job for dataset {datasetId} ended with status: {status}");

            if (status == "FINISHED")
            {
                yield return new JobProgress("FINISHED", 100);
                yield break;
            }

            yield return new JobProgress(status, percent);
        }

        throw new TimeoutException($"Validation job for dataset {datasetId} did not finish after {maxAttempts} attempts");
    }

    // ── ZIP Download & Extract ────────────────────────────────────────────────

    public async Task<string> DownloadAndExtractJson(string downloadUrl)
    {
        var zipBytes = await DownloadZipBytes(downloadUrl);
        using var stream = new MemoryStream(zipBytes);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);
        var entry = archive.Entries.FirstOrDefault(e => e.Name.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException("No JSON file found in RN3 export ZIP");
        using var reader = new StreamReader(entry.Open());
        return await reader.ReadToEndAsync();
    }

    public async Task<byte[]> DownloadZipBytes(string downloadUrl)
    {
        var client = CreateClient();
        logger.LogDebug("DownloadZipBytes {Url}", downloadUrl);
        var response = await client.GetAsync(downloadUrl);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsByteArrayAsync();
    }

    // ── Validation ────────────────────────────────────────────────────────────

    public async Task TriggerValidation(string datasetId)
    {
        var client = CreateClient();
        var url = $"/orchestrator/jobs/addValidationJob/{datasetId}";
        logger.LogInformation("TriggerValidation {Url}", url);
        var response = await client.PutAsync(url, null);
        response.EnsureSuccessStatusCode();
    }

    public async Task<Dictionary<string, object>> GetValidationResults(string datasetId, string dataflowId)
    {
        var client = CreateClient();
        const string levelError = "WARNING,ERROR,BLOCKER,INFO";
        const int pageSize = 100;

        // Get full schema to discover table schema IDs
        var schemaResponse = await client.GetAsync($"/dataschema/v1/datasetId/{datasetId}");
        schemaResponse.EnsureSuccessStatusCode();
        var schemaJson = await schemaResponse.Content.ReadAsStringAsync();
        var fullSchema = JsonSerializer.Deserialize<Rn3FullSchemaResponse>(schemaJson, JsonOpts);
        var tables = fullSchema?.EffectiveTables ?? [];

        var results = new Dictionary<string, object>();

        foreach (var table in tables)
        {
            var tableId = table.EffectiveId;
            var tableName = table.EffectiveName;
            if (string.IsNullOrEmpty(tableId)) continue;

            var url = $"/dataset/TableValueDataset/{datasetId}" +
                      $"?fieldValue=&idTableSchema={tableId}" +
                      $"&pageNum=0&pageSize={pageSize}&levelError={levelError}";

            try
            {
                var valResponse = await client.GetAsync(url);
                if (!valResponse.IsSuccessStatusCode)
                {
                    logger.LogWarning("GetValidationResults: table {TableName} returned {Status}", tableName, valResponse.StatusCode);
                    continue;
                }
                var valJson = await valResponse.Content.ReadAsStringAsync();
                var parsed = JsonSerializer.Deserialize<object>(valJson, JsonOpts);
                if (parsed is not null)
                    results[tableName] = parsed;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "GetValidationResults: failed to fetch table {TableName}", tableName);
            }
        }

        return results;
    }

    // ── Import ────────────────────────────────────────────────────────────────

    public async Task<string> ImportFileData(string datasetId, string dataflowId, byte[] zipBytes)
    {
        var client = CreateClient();
        var url = $"/dataset/v2/importFileData/{datasetId}?dataflowId={dataflowId}&replace=true&providerId=86";
        logger.LogInformation("ImportFileData {Url} ({Bytes} bytes)", url, zipBytes.Length);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(zipBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/zip");
        content.Add(fileContent, "file", "data_export.zip");

        var response = await client.PostAsync(url, content);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException(
                $"ImportFileData failed: HTTP {(int)response.StatusCode} — {errorBody}",
                null,
                response.StatusCode);
        }

        var body = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<Rn3ImportResponse>(body, JsonOpts);
        var jobId = result?.JobId?.ToString()
            ?? throw new InvalidOperationException($"RN3 import did not return a jobId. Response: {body}");

        logger.LogInformation("ImportFileData triggered for dataset {DatasetId}, jobId: {JobId}", datasetId, jobId);
        return jobId;
    }

    // ── CSV Export ────────────────────────────────────────────────────────────

    public async Task<byte[]> ExportDatasetFile(string datasetId)
    {
        var client = CreateClient();
        var url = $"/dataset/v1/exportDatasetFile/{datasetId}?mimeType=csv";
        logger.LogDebug("ExportDatasetFile {Url}", url);
        var response = await client.GetAsync(url);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsByteArrayAsync();
    }
}
