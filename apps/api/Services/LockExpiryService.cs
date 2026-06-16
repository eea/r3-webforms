using Api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace Api.Services;

public class LockExpiryService(
    IServiceProvider services,
    IHubContext<WorkflowHub> hub,
    ILogger<LockExpiryService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken);

            using var scope = services.CreateScope();
            var lockService = scope.ServiceProvider.GetRequiredService<InMemoryLockService>();

            var expired = lockService.PurgeExpired().ToList();
            foreach (var datasetKey in expired)
            {
                logger.LogInformation("Lock expired for dataset {DatasetKey}", datasetKey);
                await hub.Clients.All.SendAsync("LockReleased", datasetKey, "heartbeat_timeout", stoppingToken);
            }
        }
    }
}
