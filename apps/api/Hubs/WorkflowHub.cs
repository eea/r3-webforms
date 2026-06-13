using Microsoft.AspNetCore.SignalR;

namespace Api.Hubs;

public class WorkflowHub(ILogger<WorkflowHub> logger) : Hub
{
    // Client → Server: called every 60s to keep lock alive
    public async Task Heartbeat(string datasetKey)
    {
        var username = Context.GetHttpContext()?.Session.GetString("username") ?? "unknown";
        logger.LogDebug("Heartbeat from {Username} for dataset {DatasetKey}", username, datasetKey);
        // LockService.RefreshHeartbeat will be wired here in 2.4
        await Task.CompletedTask;
    }

    // --- Server → Client helpers (called from services) ---

    public async Task SendProgress(string connectionId, string step, string message, int percentage)
        => await Clients.Client(connectionId).SendAsync("ProgressUpdate", step, message, percentage);

    public async Task SendJobStatus(string connectionId, string step, string status)
        => await Clients.Client(connectionId).SendAsync("JobStatusChanged", step, status);

    public async Task SendComplete(string connectionId, string step, object data)
        => await Clients.Client(connectionId).SendAsync("WorkflowComplete", step, data);

    public async Task SendError(string connectionId, string step, string error)
        => await Clients.Client(connectionId).SendAsync("WorkflowError", step, error);

    public async Task SendLockReleased(string connectionId, string datasetKey, string reason)
        => await Clients.Client(connectionId).SendAsync("LockReleased", datasetKey, reason);
}
