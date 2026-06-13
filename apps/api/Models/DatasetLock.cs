namespace Api.Models;

public class DatasetLock
{
    public string DatasetKey { get; set; } = string.Empty;  // "{dataflowId}:{datasetId}"
    public string UserId { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public DateTime LockedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime LastHeartbeat { get; set; }
}

public enum LockResultStatus { Acquired, AlreadyLocked }

public class LockResult
{
    public LockResultStatus Status { get; set; }
    public DatasetLock? Lock { get; set; }

    public static LockResult Acquired(DatasetLock l) => new() { Status = LockResultStatus.Acquired, Lock = l };
    public static LockResult Locked(DatasetLock l) => new() { Status = LockResultStatus.AlreadyLocked, Lock = l };
}
