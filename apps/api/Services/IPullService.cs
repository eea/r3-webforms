namespace Api.Services;

public interface IPullService
{
    /// <summary>
    /// Acquires the dataset lock, exports from RN3, streams progress via SignalR,
    /// and sends WorkflowComplete with the parsed JSON data.
    /// On failure sends WorkflowError and releases the lock.
    /// </summary>
    Task PullAsync(string dataflowId, string datasetId, string userId, string userEmail, string connectionId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Same as PullAsync but does NOT acquire or release the lock.
    /// </summary>
    Task PullReadOnlyAsync(string dataflowId, string datasetId, string connectionId, CancellationToken cancellationToken = default);
}
