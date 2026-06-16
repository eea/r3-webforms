using Api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace Api.Services;

public class ValidationService(
    IRn3Service rn3Service,
    IHubContext<WorkflowHub> hub,
    ILogger<ValidationService> logger) : IValidationService
{
    public async Task ValidateAsync(
        string dataflowId,
        string datasetId,
        string connectionId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // 1. Trigger validation job
            await SendProgress(connectionId, "validation", "Submitting validation job…", 5, cancellationToken);
            await rn3Service.TriggerValidation(datasetId);
            logger.LogInformation("Validation triggered for dataset {DatasetId}", datasetId);

            // 2. Poll until job finishes
            await SendProgress(connectionId, "validation", "Waiting for validation job…", 10, cancellationToken);
            await foreach (var progress in rn3Service.PollValidationJob(datasetId, cancellationToken: cancellationToken))
            {
                var pct = 10 + progress.Percent * 70 / 100; // scale to 10-80%
                await SendProgress(connectionId, "validation", $"Validation job: {progress.Status}", pct, cancellationToken);
            }

            // 3. Fetch results
            await SendProgress(connectionId, "validation", "Fetching validation results…", 85, cancellationToken);
            var results = await rn3Service.GetValidationResults(datasetId, dataflowId);
            logger.LogInformation("Validation complete for dataset {DatasetId}: {TableCount} tables", datasetId, results.Count);

            await SendProgress(connectionId, "validation", "Done.", 100, cancellationToken);
            await hub.Clients.Client(connectionId).SendAsync("WorkflowComplete", "validation", results, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "ValidateAsync failed for dataset {DatasetId}", datasetId);
            await hub.Clients.Client(connectionId).SendAsync("WorkflowError", "validation", ex.Message, cancellationToken);
        }
    }

    private async Task SendProgress(string connectionId, string step, string message, int percent, CancellationToken ct)
    {
        logger.LogDebug("[{Step}] {Percent}% — {Message}", step, percent, message);
        await hub.Clients.Client(connectionId).SendAsync("ProgressUpdate", step, message, percent, ct);
    }
}
