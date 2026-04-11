using HouseholdOps.Modules.Scheduling.Contracts;

namespace HouseholdOps.Modules.Scheduling;

public interface IScheduledEventManagementService
{
    Task<ScheduledEventMutationResult> CreateEventAsync(
        Guid householdId,
        CreateScheduledEventRequest request,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken);

    Task<ScheduledEventSeriesListResponse> ListEventsAsync(
        Guid householdId,
        CancellationToken cancellationToken);

    Task<ScheduledEventMutationResult> UpdateEventAsync(
        Guid householdId,
        Guid eventId,
        UpdateScheduledEventRequest request,
        CancellationToken cancellationToken);

    Task<bool> DeleteEventAsync(
        Guid householdId,
        Guid eventId,
        CancellationToken cancellationToken);
}
