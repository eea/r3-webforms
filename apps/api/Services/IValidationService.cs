namespace Api.Services;

public interface IValidationService
{
    /// <summary>
    /// Triggers a validation job on RN3, polls until complete,
    /// fetches the results, and sends them via SignalR WorkflowComplete.
    /// </summary>
    Task ValidateAsync(
        string dataflowId,
        string datasetId,
        string connectionId,
        CancellationToken cancellationToken = default);
}
