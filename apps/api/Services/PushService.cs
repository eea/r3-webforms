using System.IO.Compression;
using System.Text;
using Api.Hubs;
using Api.Models;
using Microsoft.AspNetCore.SignalR;

namespace Api.Services;

public class PushService(
    IRn3Service rn3Service,
    ILockService lockService,
    IHubContext<WorkflowHub> hub,
    ILogger<PushService> logger) : IPushService
{
    public async Task PushAsync(
        string dataflowId,
        string datasetId,
        Dictionary<string, List<Dictionary<string, object?>>> tables,
        string userId,
        string connectionId,
        CancellationToken cancellationToken = default)
    {
        var datasetKey = $"{dataflowId}:{datasetId}";

        // 1. Verify caller owns the lock
        var existingLock = lockService.GetLock(datasetKey);
        if (existingLock is null || existingLock.UserId != userId)
        {
            await hub.Clients.Client(connectionId).SendAsync(
                "WorkflowError", "push",
                existingLock is null
                    ? "Cannot push: dataset is not locked. Acquire the lock via a full pull first."
                    : $"Cannot push: dataset is locked by {existingLock.UserEmail}.",
                cancellationToken);
            return;
        }

        try
        {
            // 2. Fetch schema to determine field order
            await SendProgress(connectionId, "push", "Fetching dataset schema…", 5, cancellationToken);
            var schema = await rn3Service.GetSimpleSchema(datasetId, dataflowId);
            var schemaTables = schema.Tables ?? [];

            // 3. Build ZIP
            await SendProgress(connectionId, "push", "Building ZIP…", 10, cancellationToken);
            var zipBytes = BuildZip(schemaTables, tables);
            logger.LogInformation("PushAsync: built ZIP ({Bytes} bytes) for dataset {DatasetKey}", zipBytes.Length, datasetKey);

            // 4. Import
            await SendProgress(connectionId, "push", "Uploading to RN3…", 25, cancellationToken);
            var jobId = await rn3Service.ImportFileData(datasetId, dataflowId, zipBytes);

            // 5. Poll until import job finishes
            await SendProgress(connectionId, "push", "Waiting for import job…", 30, cancellationToken);
            await foreach (var progress in rn3Service.PollOrchestratorJob(jobId, cancellationToken: cancellationToken))
            {
                var pct = 30 + progress.Percent * 60 / 100; // scale to 30-90%
                await SendProgress(connectionId, "push", $"Import job: {progress.Status}", pct, cancellationToken);
            }

            // 6. Release lock
            lockService.Release(datasetKey, userId);
            await hub.Clients.Client(connectionId).SendAsync("LockReleased", datasetKey, "push_complete", cancellationToken);

            logger.LogInformation("Push complete for dataset {DatasetKey}", datasetKey);
            await hub.Clients.Client(connectionId).SendAsync("WorkflowComplete", "push", new { datasetKey }, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "PushAsync failed for dataset {DatasetKey}", datasetKey);
            await hub.Clients.Client(connectionId).SendAsync("WorkflowError", "push", ex.Message, cancellationToken);
        }
    }

    // ── ZIP / CSV builder ─────────────────────────────────────────────────────

    private static byte[] BuildZip(
        List<Rn3SimpleTable> schemaTables,
        Dictionary<string, List<Dictionary<string, object?>>> tables)
    {
        using var ms = new MemoryStream();
        using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var schemaTable in schemaTables)
            {
                var tableName = schemaTable.EffectiveName;
                if (!tables.TryGetValue(tableName, out var records) || records.Count == 0)
                    continue;

                var fieldNames = (schemaTable.Fields ?? [])
                    .Select(f => f.EffectiveName)
                    .Where(n => !string.IsNullOrEmpty(n))
                    .ToList();

                var csv = RecordsToCsv(records, fieldNames);
                var entry = archive.CreateEntry($"{tableName}.csv", CompressionLevel.Fastest);
                using var writer = new StreamWriter(entry.Open(), new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
                writer.Write(csv);
            }
        }
        return ms.ToArray();
    }

    /// <summary>
    /// Builds a pipe-delimited CSV with BOM prefix and CRLF line endings,
    /// matching the format RN3 expects (same as PAMS client-side buildZip).
    /// </summary>
    private static string RecordsToCsv(
        List<Dictionary<string, object?>> records,
        List<string> fieldNames)
    {
        if (fieldNames.Count == 0 && records.Count > 0)
            fieldNames = [.. records[0].Keys];

        var sb = new StringBuilder();
        sb.Append('\uFEFF'); // BOM
        sb.Append(string.Join("|", fieldNames));

        foreach (var record in records)
        {
            sb.Append("\r\n");
            sb.Append(string.Join("|", fieldNames.Select(f =>
                EscapeCsvValue(record.TryGetValue(f, out var v) ? v : null))));
        }

        return sb.ToString();
    }

    private static string EscapeCsvValue(object? value)
    {
        if (value is null) return string.Empty;
        var s = value is System.Text.Json.JsonElement je ? je.ToString() : value.ToString() ?? string.Empty;
        return s.Contains('|') || s.Contains('"') || s.Contains('\n')
            ? $"\"{s.Replace("\"", "\"\"")}\""
            : s;
    }

    private async Task SendProgress(string connectionId, string step, string message, int percent, CancellationToken ct)
    {
        logger.LogDebug("[{Step}] {Percent}% — {Message}", step, percent, message);
        await hub.Clients.Client(connectionId).SendAsync("ProgressUpdate", step, message, percent, ct);
    }
}
