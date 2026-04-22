using HouseholdOps.Modules.Integrations;
using HouseholdOps.SharedKernel.Time;

namespace HouseholdOps.Worker;

public sealed class GoogleCalendarSyncWorker(
    ILogger<GoogleCalendarSyncWorker> logger,
    IServiceScopeFactory serviceScopeFactory,
    IConfiguration configuration,
    IClock clock) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var pollSeconds = configuration.GetValue("Worker:GoogleCalendarSyncPollSeconds", 60);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = serviceScopeFactory.CreateAsyncScope();
                var integrationService = scope.ServiceProvider
                    .GetRequiredService<IGoogleCalendarIntegrationService>();

                var result = await integrationService.SyncDueLinksAsync(
                    clock.UtcNow,
                    stoppingToken);
                var outboundResult = await integrationService.SyncDueLocalEventsAsync(
                    clock.UtcNow,
                    stoppingToken);

                if (result.DueCount > 0)
                {
                    logger.LogInformation(
                        "Processed {DueCount} due Google Calendar sync links. Succeeded: {SucceededCount}. Failed: {FailedCount}.",
                        result.DueCount,
                        result.SucceededCount,
                        result.FailedCount);
                }

                if (outboundResult.DueCount > 0)
                {
                    logger.LogInformation(
                        "Processed {DueCount} due outbound Google local-event sync job(s). Succeeded: {SucceededCount}. Failed: {FailedCount}.",
                        outboundResult.DueCount,
                        outboundResult.SucceededCount,
                        outboundResult.FailedCount);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(
                    exception,
                    "Google Calendar sync worker iteration failed.");
            }

            await Task.Delay(TimeSpan.FromSeconds(pollSeconds), stoppingToken);
        }
    }
}
