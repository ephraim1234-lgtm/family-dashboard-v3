using HouseholdOps.Modules.Scheduling.Contracts;

namespace HouseholdOps.Modules.Scheduling;

public enum ScheduledEventMutationStatus
{
    Succeeded,
    ValidationFailed,
    NotFound,
    ReadOnly
}

public sealed record ScheduledEventMutationResult(
    ScheduledEventMutationStatus Status,
    string? Error,
    ScheduledEventSeriesItem? Event)
{
    public static ScheduledEventMutationResult Success(ScheduledEventSeriesItem item) =>
        new(ScheduledEventMutationStatus.Succeeded, null, item);

    public static ScheduledEventMutationResult ValidationFailure(string error) =>
        new(ScheduledEventMutationStatus.ValidationFailed, error, null);

    public static ScheduledEventMutationResult NotFound() =>
        new(ScheduledEventMutationStatus.NotFound, null, null);

    public static ScheduledEventMutationResult ReadOnly(string error) =>
        new(ScheduledEventMutationStatus.ReadOnly, error, null);
}
