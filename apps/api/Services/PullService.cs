using System.Text.Json;
using Api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace Api.Services;

public class PullService(
    IRn3Service rn3Service,
    ILockService lockService,
    IHubContext<WorkflowHub> hub,
    ILogger<PullService> logger) : IPullService
{
    public async Task PullAsync(
        string dataflowId, string datasetId,
        string userId, string userEmail,
        string connectionId,
        CancellationToken cancellationToken = default)
    {
        var datasetKey = $"{dataflowId}:{datasetId}";

        // 1. Acquire lock
        var lockResult = lockService.TryAcquire(datasetKey, userId, userEmail);
        if (lockResult.Status == Models.LockResultStatus.AlreadyLocked)
        {
            await hub.Clients.Client(connectionId).SendAsync(
                "WorkflowError", "pull",
                $"Dataset is locked by {lockResult.Lock!.UserEmail} since {lockResult.Lock.LockedAt:u}",
                cancellationToken);
            return;
        }

        try
        {
            await RunExport(datasetId, dataflowId, connectionId, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "PullAsync failed for dataset {DatasetKey}", datasetKey);
            lockService.Release(datasetKey, userId);
            await hub.Clients.Client(connectionId).SendAsync(
                "WorkflowError", "pull", ex.Message, cancellationToken);
        }
    }

    public async Task PullReadOnlyAsync(
        string dataflowId, string datasetId,
        string connectionId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await RunExport(datasetId, dataflowId, connectionId, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "PullReadOnlyAsync failed for dataset {DataflowId}:{DatasetId}", dataflowId, datasetId);
            await hub.Clients.Client(connectionId).SendAsync(
                "WorkflowError", "pull", ex.Message, cancellationToken);
        }
    }

    // ── Shared export logic ────────────────────────────────────────────────────

    private async Task RunExport(
        string datasetId, string dataflowId,
        string connectionId,
        CancellationToken cancellationToken)
    {
        // Step 1: Trigger ETL export
        await SendProgress(connectionId, "pull", "Triggering ETL export…", 5, cancellationToken);
        var pollingUrl = await rn3Service.TriggerEtlExport(datasetId, dataflowId);
        logger.LogInformation("ETL export triggered for dataset {DatasetId}, pollingUrl: {Url}", datasetId, pollingUrl);

        // Step 2: Poll until job finishes — extract job ID from the pollingUrl
        // pollingUrl is something like /orchestrator/jobs/status/{jobId} or contains the jobId
        var jobId = ExtractJobId(pollingUrl);
        await SendProgress(connectionId, "pull", "Waiting for export job…", 10, cancellationToken);

        string? downloadUrl = null;
        await foreach (var progress in rn3Service.PollOrchestratorJob(jobId, cancellationToken: cancellationToken))
        {
            var pct = 10 + progress.Percent * 60 / 100; // scale to 10-70%
            await SendProgress(connectionId, "pull", $"Export job: {progress.Status}", pct, cancellationToken);
            if (progress.DownloadUrl is not null)
                downloadUrl = progress.DownloadUrl;
        }

        if (string.IsNullOrEmpty(downloadUrl))
            throw new InvalidOperationException("Export job finished but no download URL was returned.");

        // Step 3: Download and extract
        await SendProgress(connectionId, "pull", "Downloading data…", 75, cancellationToken);
        var json = await rn3Service.DownloadAndExtractJson(downloadUrl);

        // Step 4: Parse and send result
        await SendProgress(connectionId, "pull", "Processing data…", 95, cancellationToken);
        var data = JsonSerializer.Deserialize<object>(json)
            ?? throw new InvalidOperationException("Empty data returned from RN3 export.");

        logger.LogInformation("Pull complete for dataset {DatasetId}", datasetId);
        await hub.Clients.Client(connectionId).SendAsync("WorkflowComplete", "pull", data, cancellationToken);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task SendProgress(string connectionId, string step, string message, int percent, CancellationToken ct)
    {
        logger.LogDebug("[{Step}] {Percent}% — {Message}", step, percent, message);
        await hub.Clients.Client(connectionId).SendAsync("ProgressUpdate", step, message, percent, ct);
    }

    /// <summary>
    /// Extracts the job ID from a pollingUrl like:
    ///   /orchestrator/jobs/status/12345
    ///   or https://host/orchestrator/jobs/status/12345
    /// </summary>
    private static string ExtractJobId(string pollingUrl)
    {
        var segments = pollingUrl.TrimEnd('/').Split('/');
        var id = segments.LastOrDefault(s => !string.IsNullOrEmpty(s));
        return id ?? throw new InvalidOperationException($"Cannot extract job ID from pollingUrl: {pollingUrl}");
    }
}
