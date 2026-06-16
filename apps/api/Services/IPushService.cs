namespace Api.Services;

public interface IPushService
{
    /// <summary>
    /// Verifies the caller owns the lock, builds a ZIP of CSVs from the provided records,
    /// imports to RN3, polls for completion, releases the lock, and sends WorkflowComplete.
    /// On failure sends WorkflowError (lock is NOT auto-released — caller must decide).
    /// </summary>
    /// <param name="tables">Table name → list of flat record objects (field name → value).</param>
    Task PushAsync(
        string dataflowId,
        string datasetId,
        Dictionary<string, List<Dictionary<string, object?>>> tables,
        string userId,
        string connectionId,
        CancellationToken cancellationToken = default);
}
