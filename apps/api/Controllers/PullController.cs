using Api.Models;
using Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/{dataflowId}/{datasetId}")]
public class PullController(
    IRn3Service rn3Service,
    IServiceScopeFactory scopeFactory,
    ILogger<PullController> logger) : ControllerBase
{
    private string UserId => HttpContext.Session.GetString("username") ?? string.Empty;
    private string UserEmail => HttpContext.Session.GetString("email") ?? string.Empty;
    private string? Rn3Token => HttpContext.Session.GetString("rn3_token");

    /// <summary>
    /// Trigger a full pull (acquires lock) or read-only pull.
    /// Returns 202 immediately; progress and result are delivered via SignalR.
    /// </summary>
    [HttpPost("pull")]
    [ProducesResponseType(typeof(WorkflowAccepted), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public IActionResult Pull(
        string dataflowId,
        string datasetId,
        [FromBody] PullRequest request,
        [FromQuery] bool @readonly = false)
    {
        if (string.IsNullOrEmpty(request.ConnectionId))
            return BadRequest(new { error = "connectionId is required" });

        var userId = UserId;
        var userEmail = UserEmail;
        var token = Rn3Token;

        logger.LogInformation("Pull requested for {DataflowId}/{DatasetId} by {UserId} (readonly={Readonly})",
            dataflowId, datasetId, userId, @readonly);

        _ = RunInBackground(async (scope, ct) =>
        {
            // Populate token store so Rn3Service works outside the HTTP request
            scope.ServiceProvider.GetRequiredService<Rn3TokenStore>().Token = token;
            var svc = scope.ServiceProvider.GetRequiredService<IPullService>();

            if (@readonly)
                await svc.PullReadOnlyAsync(dataflowId, datasetId, request.ConnectionId, ct);
            else
                await svc.PullAsync(dataflowId, datasetId, userId, userEmail, request.ConnectionId, ct);
        });

        return Accepted(new WorkflowAccepted("Pull started", request.ConnectionId));
    }

    /// <summary>
    /// Returns the simple schema for a dataset (field names and types per table).
    /// </summary>
    [HttpGet("schema")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSchema(string dataflowId, string datasetId)
    {
        var schema = await rn3Service.GetSimpleSchema(datasetId, dataflowId);
        return Ok(schema);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private Task RunInBackground(Func<IServiceScope, CancellationToken, Task> work)
    {
        return Task.Run(async () =>
        {
            using var scope = scopeFactory.CreateScope();
            try
            {
                await work(scope, CancellationToken.None);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Unhandled error in background pull task");
            }
        });
    }
}
