using HouseholdOps.Modules.Notifications;
using HouseholdOps.SharedKernel.Time;

namespace HouseholdOps.Worker;

public sealed class EventReminderWorker(
    ILogger<EventReminderWorker> logger,
    IServiceScopeFactory serviceScopeFactory,
    IConfiguration configuration,
    IClock clock) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var pollSeconds = configuration.GetValue("Worker:EventReminderPollSeconds", 60);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = serviceScopeFactory.CreateAsyncScope();
                var reminderService = scope.ServiceProvider
                    .GetRequiredService<IEventReminderService>();

                var firedCount = await reminderService.FireDueRemindersAsync(
                    clock.UtcNow,
                    stoppingToken);

                if (firedCount > 0)
                {
                    logger.LogInformation(
                        "Fired {FiredCount} due event reminder(s).",
                        firedCount);
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
                    "Event reminder worker iteration failed.");
            }

            await Task.Delay(TimeSpan.FromSeconds(pollSeconds), stoppingToken);
        }
    }
}
