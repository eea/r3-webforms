using Api.Models;
using Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/{dataflowId}/{datasetId}")]
public class ValidationController(
    IServiceScopeFactory scopeFactory,
    ILogger<ValidationController> logger) : ControllerBase
{
    private string? Rn3Token => HttpContext.Session.GetString("rn3_token");

    /// <summary>
    /// Trigger dataset validation on RN3.
    /// Returns 202 immediately; progress and results are delivered via SignalR.
    /// </summary>
    [HttpPost("validate")]
    [ProducesResponseType(typeof(WorkflowAccepted), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public IActionResult Validate(
        string dataflowId,
        string datasetId,
        [FromBody] ValidateRequest request)
    {
        if (string.IsNullOrEmpty(request.ConnectionId))
            return BadRequest(new { error = "connectionId is required" });

        var token = Rn3Token;

        logger.LogInformation("Validation requested for {DataflowId}/{DatasetId}", dataflowId, datasetId);

        _ = Task.Run(async () =>
        {
            using var scope = scopeFactory.CreateScope();
            try
            {
                scope.ServiceProvider.GetRequiredService<Rn3TokenStore>().Token = token;
                var svc = scope.ServiceProvider.GetRequiredService<IValidationService>();
                await svc.ValidateAsync(dataflowId, datasetId, request.ConnectionId);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Unhandled error in background validation task");
            }
        });

        return Accepted(new WorkflowAccepted("Validation started", request.ConnectionId));
    }
}
