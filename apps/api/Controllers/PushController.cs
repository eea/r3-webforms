using Api.Models;
using Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/{dataflowId}/{datasetId}")]
public class PushController(
    IServiceScopeFactory scopeFactory,
    ILogger<PushController> logger) : ControllerBase
{
    private string UserId => HttpContext.Session.GetString("username") ?? string.Empty;
    private string? Rn3Token => HttpContext.Session.GetString("rn3_token");

    /// <summary>
    /// Push records to RN3. Caller must own the dataset lock.
    /// Returns 202 immediately; progress and result are delivered via SignalR.
    /// </summary>
    [HttpPost("push")]
    [ProducesResponseType(typeof(WorkflowAccepted), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public IActionResult Push(
        string dataflowId,
        string datasetId,
        [FromBody] PushRequest request)
    {
        if (string.IsNullOrEmpty(request.ConnectionId))
            return BadRequest(new { error = "connectionId is required" });

        if (request.Tables.Count == 0)
            return BadRequest(new { error = "tables must not be empty" });

        var userId = UserId;
        var token = Rn3Token;

        logger.LogInformation("Push requested for {DataflowId}/{DatasetId} by {UserId} ({TableCount} tables)",
            dataflowId, datasetId, userId, request.Tables.Count);

        _ = Task.Run(async () =>
        {
            using var scope = scopeFactory.CreateScope();
            try
            {
                scope.ServiceProvider.GetRequiredService<Rn3TokenStore>().Token = token;
                var svc = scope.ServiceProvider.GetRequiredService<IPushService>();
                await svc.PushAsync(dataflowId, datasetId, request.Tables, userId, request.ConnectionId);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Unhandled error in background push task");
            }
        });

        return Accepted(new WorkflowAccepted("Push started", request.ConnectionId));
    }
}
