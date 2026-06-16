using System.Collections.Concurrent;
using Api.Configuration;
using Api.Models;
using Microsoft.Extensions.Options;

namespace Api.Services;

public class InMemoryLockService(IOptions<LockOptions> options) : ILockService
{
    private readonly ConcurrentDictionary<string, DatasetLock> _locks = new();
    private readonly LockOptions _options = options.Value;

    public LockResult TryAcquire(string datasetKey, string userId, string userEmail)
    {
        var now = DateTime.UtcNow;
        var newLock = new DatasetLock
        {
            DatasetKey = datasetKey,
            UserId = userId,
            UserEmail = userEmail,
            LockedAt = now,
            ExpiresAt = now.AddHours(_options.DefaultTtlHours),
            LastHeartbeat = now
        };

        var acquired = _locks.AddOrUpdate(
            datasetKey,
            addValueFactory: _ => newLock,
            updateValueFactory: (_, existing) =>
            {
                // Replace if expired
                if (IsExpired(existing)) return newLock;
                return existing;
            });

        return acquired.UserId == userId && acquired.LockedAt == newLock.LockedAt
            ? LockResult.Acquired(acquired)
            : LockResult.Locked(acquired);
    }

    public bool Release(string datasetKey, string userId)
    {
        if (_locks.TryGetValue(datasetKey, out var existing) && existing.UserId == userId)
            return _locks.TryRemove(new KeyValuePair<string, DatasetLock>(datasetKey, existing));
        return false;
    }

    public bool ForceRelease(string datasetKey)
        => _locks.TryRemove(datasetKey, out _);

    public DatasetLock? GetLock(string datasetKey)
    {
        if (_locks.TryGetValue(datasetKey, out var existing) && !IsExpired(existing))
            return existing;
        return null;
    }

    public void RefreshHeartbeat(string datasetKey, string userId)
    {
        if (_locks.TryGetValue(datasetKey, out var existing) && existing.UserId == userId)
        {
            var now = DateTime.UtcNow;
            var updated = new DatasetLock
            {
                DatasetKey = existing.DatasetKey,
                UserId = existing.UserId,
                UserEmail = existing.UserEmail,
                LockedAt = existing.LockedAt,
                LastHeartbeat = now,
                ExpiresAt = now.AddHours(_options.DefaultTtlHours)
            };
            _locks.TryUpdate(datasetKey, updated, existing);
        }
    }

    public IReadOnlyList<DatasetLock> GetAllLocks()
        => _locks.Values.Where(l => !IsExpired(l)).ToList().AsReadOnly();

    public IEnumerable<string> PurgeExpired()
    {
        var expired = _locks.Where(kvp => IsExpired(kvp.Value)).ToList();
        foreach (var kvp in expired)
            _locks.TryRemove(kvp);
        return expired.Select(kvp => kvp.Key);
    }

    private bool IsExpired(DatasetLock l)
        => l.LastHeartbeat < DateTime.UtcNow.AddMinutes(-_options.HeartbeatTimeoutMinutes);
}
