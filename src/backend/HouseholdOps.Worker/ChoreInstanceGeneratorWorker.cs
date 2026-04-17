using HouseholdOps.Modules.Chores;
using HouseholdOps.SharedKernel.Time;

namespace HouseholdOps.Worker;

public sealed class ChoreInstanceGeneratorWorker(
    ILogger<ChoreInstanceGeneratorWorker> logger,
    IServiceScopeFactory serviceScopeFactory,
    IConfiguration configuration,
    IClock clock) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var pollSeconds = configuration.GetValue("Worker:ChoreInstanceGeneratorPollSeconds", 3600);
        var horizonDays = configuration.GetValue("Worker:ChoreInstanceGeneratorHorizonDays", 14);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = serviceScopeFactory.CreateAsyncScope();
                var choreService = scope.ServiceProvider
                    .GetRequiredService<IChoreManagementService>();

                var today = DateOnly.FromDateTime(clock.UtcNow.UtcDateTime);
                var generated = await choreService.GenerateDueInstancesAsync(
                    today,
                    horizonDays,
                    householdId: null,
                    stoppingToken);

                if (generated > 0)
                {
                    logger.LogInformation(
                        "Generated {GeneratedCount} chore instance(s) for the next {HorizonDays} day(s).",
                        generated,
                        horizonDays);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Chore instance generator worker iteration failed.");
            }

            await Task.Delay(TimeSpan.FromSeconds(pollSeconds), stoppingToken);
        }
    }
}
