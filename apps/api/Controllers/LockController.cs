using Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/lock")]
public class LockController(ILockService lockService) : ControllerBase
{
    private string? UserId => HttpContext.Session.GetString("username");
    private string? UserEmail => HttpContext.Session.GetString("email");

    [HttpGet("{dataflowId}/{datasetId}")]
    public IActionResult GetLock(string dataflowId, string datasetId)
    {
        var key = DatasetKey(dataflowId, datasetId);
        var existing = lockService.GetLock(key);
        if (existing is null)
            return Ok(new { locked = false });

        return Ok(new
        {
            locked = true,
            lockedBy = existing.UserEmail,
            lockedAt = existing.LockedAt,
            expiresAt = existing.ExpiresAt,
            isOwnedByMe = existing.UserId == UserId
        });
    }

    [HttpPost("{dataflowId}/{datasetId}")]
    public IActionResult AcquireLock(string dataflowId, string datasetId)
    {
        var userId = UserId;
        var userEmail = UserEmail;
        if (userId is null || userEmail is null)
            return Unauthorized();

        var key = DatasetKey(dataflowId, datasetId);
        var result = lockService.TryAcquire(key, userId, userEmail);

        if (result.Status == Api.Models.LockResultStatus.Acquired)
            return Ok(new { acquired = true, lock_ = result.Lock });

        return Conflict(new
        {
            acquired = false,
            lockedBy = result.Lock!.UserEmail,
            lockedAt = result.Lock.LockedAt,
            expiresAt = result.Lock.ExpiresAt
        });
    }

    [HttpDelete("{dataflowId}/{datasetId}")]
    public IActionResult ReleaseLock(string dataflowId, string datasetId)
    {
        var userId = UserId;
        if (userId is null) return Unauthorized();

        var key = DatasetKey(dataflowId, datasetId);
        var released = lockService.Release(key, userId);
        return released ? NoContent() : NotFound(new { error = "Lock not found or not owned by you" });
    }

    [HttpDelete("{dataflowId}/{datasetId}/force")]
    public IActionResult ForceReleaseLock(string dataflowId, string datasetId)
    {
        var key = DatasetKey(dataflowId, datasetId);
        lockService.ForceRelease(key);
        return NoContent();
    }

    [HttpGet]
    public IActionResult GetAllLocks()
        => Ok(lockService.GetAllLocks());

    private static string DatasetKey(string dataflowId, string datasetId) => $"{dataflowId}:{datasetId}";
}
