namespace HouseholdOps.Worker;

public sealed class WorkerHeartbeatService(
    ILogger<WorkerHeartbeatService> logger,
    IConfiguration configuration) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var heartbeatSeconds = configuration.GetValue("Worker:HeartbeatSeconds", 30);

        while (!stoppingToken.IsCancellationRequested)
        {
            logger.LogInformation(
                "Worker heartbeat at {Timestamp}. Placeholder for scheduled jobs, recurrence expansion windows, and future integration sync.",
                DateTimeOffset.UtcNow);

            await Task.Delay(TimeSpan.FromSeconds(heartbeatSeconds), stoppingToken);
        }
    }
}
