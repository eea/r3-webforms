using Api.Models;

namespace Api.Services;

public interface ILockService
{
    LockResult TryAcquire(string datasetKey, string userId, string userEmail);
    bool Release(string datasetKey, string userId);
    bool ForceRelease(string datasetKey);
    DatasetLock? GetLock(string datasetKey);
    void RefreshHeartbeat(string datasetKey, string userId);
    IReadOnlyList<DatasetLock> GetAllLocks();
}
