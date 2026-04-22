using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Integrations;
using HouseholdOps.Modules.Scheduling;
using HouseholdOps.Modules.Scheduling.Contracts;
using HouseholdOps.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Scheduling;

public sealed class AgendaQueryService(HouseholdOpsDbContext dbContext) : IAgendaQueryService
{
    public async Task<UpcomingEventsResponse> GetUpcomingEventsAsync(
        UpcomingEventsRequest request,
        CancellationToken cancellationToken)
    {
        var scheduledEvents = await dbContext.ScheduledEvents
            .Where(e =>
                e.HouseholdId == request.HouseholdId
                && e.StartsAtUtc.HasValue
                && (e.RecurrencePattern == EventRecurrencePattern.None
                    ? e.StartsAtUtc.Value < request.WindowEndUtc
                    : true))
            .OrderBy(e => e.StartsAtUtc)
            .ToListAsync(cancellationToken);

        var localSyncInfo = await LoadLocalGoogleSyncInfoAsync(
            request.HouseholdId,
            scheduledEvents
                .Where(item => string.IsNullOrWhiteSpace(item.SourceKind))
                .Select(item => item.Id)
                .ToArray(),
            cancellationToken);

        var items = scheduledEvents
            .SelectMany(e => RecurrenceExpansion.ExpandIntoWindow(
                e,
                request.WindowStartUtc,
                request.WindowEndUtc))
            .Select(item =>
            {
                var syncInfo = localSyncInfo.TryGetValue(item.Id, out var info)
                    ? info
                    : null;

                return new UpcomingEventItem(
                    item.Id,
                    item.Title,
                    item.Description,
                    item.IsAllDay,
                    item.StartsAtUtc,
                    item.EndsAtUtc,
                    item.IsImported,
                    item.SourceKind,
                    syncInfo is not null,
                    syncInfo?.SyncStatus,
                    syncInfo?.LastError,
                    syncInfo?.TargetDisplayName,
                    syncInfo?.LastSucceededAtUtc);
            })
            .OrderBy(e => e.StartsAtUtc)
            .ToList();

        return new UpcomingEventsResponse(
            request.WindowStartUtc,
            request.WindowEndUtc,
            items);
    }

    private async Task<Dictionary<Guid, LocalGoogleSyncInfo>> LoadLocalGoogleSyncInfoAsync(
        Guid householdId,
        IReadOnlyCollection<Guid> eventIds,
        CancellationToken cancellationToken)
    {
        if (eventIds.Count == 0)
        {
            return [];
        }

        return await dbContext.GoogleCalendarLocalEventSyncs
            .Where(item => item.HouseholdId == householdId && eventIds.Contains(item.ScheduledEventId))
            .Join(
                dbContext.GoogleCalendarConnections,
                sync => sync.GoogleCalendarConnectionId,
                link => link.Id,
                (sync, link) => new
                {
                    sync.ScheduledEventId,
                    sync.SyncStatus,
                    sync.LastError,
                    sync.LastSucceededAtUtc,
                    link.DisplayName
                })
            .ToDictionaryAsync(
                item => item.ScheduledEventId,
                item => new LocalGoogleSyncInfo(
                    item.SyncStatus,
                    item.LastError,
                    item.DisplayName,
                    item.LastSucceededAtUtc),
                cancellationToken);
    }
}

public sealed class ScheduleBrowseQueryService(
    HouseholdOpsDbContext dbContext) : IScheduleBrowseQueryService
{
    public async Task<ScheduleBrowseResponse> GetUpcomingBrowseAsync(
        ScheduleBrowseRequest request,
        CancellationToken cancellationToken)
    {
        var scheduledEvents = await dbContext.ScheduledEvents
            .Where(e =>
                e.HouseholdId == request.HouseholdId
                && e.StartsAtUtc.HasValue
                && (e.RecurrencePattern == EventRecurrencePattern.None
                    ? e.StartsAtUtc.Value < request.WindowEndUtc
                    : true))
            .OrderBy(e => e.StartsAtUtc)
            .ToListAsync(cancellationToken);

        var dayGroups = scheduledEvents
            .SelectMany(e => RecurrenceExpansion.ExpandIntoWindow(
                e,
                request.WindowStartUtc,
                request.WindowEndUtc)
                .Select(item => new ScheduleBrowseItem(
                    e.Id,
                    item.Title,
                    item.Description,
                    item.IsAllDay,
                    item.StartsAtUtc,
                    item.EndsAtUtc,
                    e.RecurrencePattern != EventRecurrencePattern.None,
                    e.RecurrencePattern.ToString(),
                    RecurrenceRequestMapper.ToSummary(
                        e.RecurrencePattern,
                        e.WeeklyDaysMask,
                        e.RecursUntilUtc),
                    !string.IsNullOrWhiteSpace(e.SourceKind),
                    e.SourceKind)))
            .OrderBy(item => item.StartsAtUtc)
            .GroupBy(item => DateOnly.FromDateTime(
                item.StartsAtUtc?.UtcDateTime.Date ?? request.WindowStartUtc.UtcDateTime.Date))
            .Select(group => new ScheduleBrowseDayGroup(
                group.Key,
                group.ToList()))
            .ToList();

        return new ScheduleBrowseResponse(
            request.WindowStartUtc,
            request.WindowEndUtc,
            request.WindowDays,
            dayGroups);
    }
}

public sealed class ScheduledEventManagementService(
    HouseholdOpsDbContext dbContext,
    IClock clock,
    IGoogleCalendarIntegrationService googleCalendarIntegrationService) : IScheduledEventManagementService
{
    public async Task<ScheduledEventMutationResult> CreateEventAsync(
        Guid householdId,
        CreateScheduledEventRequest request,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken)
    {
        var validated = ValidateRequest(
            request.Title,
            request.Description,
            request.IsAllDay,
            request.StartsAtUtc,
            request.EndsAtUtc,
            request.Recurrence);

        if (validated.Error is not null)
        {
            return ScheduledEventMutationResult.ValidationFailure(validated.Error);
        }

        var scheduledEvent = new ScheduledEvent
        {
            HouseholdId = householdId,
            Title = validated.Title,
            Description = validated.Description,
            IsAllDay = validated.IsAllDay,
            StartsAtUtc = validated.StartsAtUtc,
            EndsAtUtc = validated.EndsAtUtc,
            RecurrencePattern = validated.RecurrencePattern,
            WeeklyDaysMask = validated.WeeklyDaysMask,
            RecursUntilUtc = validated.RecursUntilUtc,
            CreatedAtUtc = createdAtUtc
        };

        dbContext.ScheduledEvents.Add(scheduledEvent);
        await googleCalendarIntegrationService.QueueLocalEventUpsertAsync(
            householdId,
            scheduledEvent.Id,
            createdAtUtc,
            cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        var syncInfo = await LoadLocalGoogleSyncInfoAsync(
            householdId,
            [scheduledEvent.Id],
            cancellationToken);

        return ScheduledEventMutationResult.Success(MapSeriesItem(
            scheduledEvent,
            syncInfo.TryGetValue(scheduledEvent.Id, out var localSync) ? localSync : null));
    }

    public async Task<ScheduledEventSeriesListResponse> ListEventsAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var scheduledEvents = await dbContext.ScheduledEvents
            .Where(e => e.HouseholdId == householdId)
            .OrderBy(e => e.StartsAtUtc)
            .ThenBy(e => e.Title)
            .ToListAsync(cancellationToken);

        var syncInfo = await LoadLocalGoogleSyncInfoAsync(
            householdId,
            scheduledEvents
                .Where(item => string.IsNullOrWhiteSpace(item.SourceKind))
                .Select(item => item.Id)
                .ToArray(),
            cancellationToken);

        var items = scheduledEvents
            .Select(item => MapSeriesItem(
                item,
                syncInfo.TryGetValue(item.Id, out var localSync) ? localSync : null))
            .ToList();

        return new ScheduledEventSeriesListResponse(items);
    }

    public async Task<ScheduledEventMutationResult> UpdateEventAsync(
        Guid householdId,
        Guid eventId,
        UpdateScheduledEventRequest request,
        CancellationToken cancellationToken)
    {
        var scheduledEvent = await dbContext.ScheduledEvents
            .SingleOrDefaultAsync(
                e => e.HouseholdId == householdId && e.Id == eventId,
                cancellationToken);

        if (scheduledEvent is null)
        {
            return ScheduledEventMutationResult.NotFound();
        }

        if (!string.IsNullOrWhiteSpace(scheduledEvent.SourceKind))
        {
            return ScheduledEventMutationResult.ReadOnly(
                "Imported calendar events are read-only in Scheduling. Resync or remove the linked calendar instead.");
        }

        var validated = ValidateRequest(
            request.Title,
            request.Description,
            request.IsAllDay,
            request.StartsAtUtc,
            request.EndsAtUtc,
            request.Recurrence);

        if (validated.Error is not null)
        {
            return ScheduledEventMutationResult.ValidationFailure(validated.Error);
        }

        scheduledEvent.Title = validated.Title;
        scheduledEvent.Description = validated.Description;
        scheduledEvent.IsAllDay = validated.IsAllDay;
        scheduledEvent.StartsAtUtc = validated.StartsAtUtc;
        scheduledEvent.EndsAtUtc = validated.EndsAtUtc;
        scheduledEvent.RecurrencePattern = validated.RecurrencePattern;
        scheduledEvent.WeeklyDaysMask = validated.WeeklyDaysMask;
        scheduledEvent.RecursUntilUtc = validated.RecursUntilUtc;

        await googleCalendarIntegrationService.QueueLocalEventUpsertAsync(
            householdId,
            scheduledEvent.Id,
            clock.UtcNow,
            cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        var syncInfo = await LoadLocalGoogleSyncInfoAsync(
            householdId,
            [scheduledEvent.Id],
            cancellationToken);

        return ScheduledEventMutationResult.Success(MapSeriesItem(
            scheduledEvent,
            syncInfo.TryGetValue(scheduledEvent.Id, out var localSync) ? localSync : null));
    }

    public async Task<ScheduledEventMutationResult> DeleteEventAsync(
        Guid householdId,
        Guid eventId,
        CancellationToken cancellationToken)
    {
        var scheduledEvent = await dbContext.ScheduledEvents
            .SingleOrDefaultAsync(
                e => e.HouseholdId == householdId && e.Id == eventId,
                cancellationToken);

        if (scheduledEvent is null)
        {
            return ScheduledEventMutationResult.NotFound();
        }

        if (!string.IsNullOrWhiteSpace(scheduledEvent.SourceKind))
        {
            return ScheduledEventMutationResult.ReadOnly(
                "Imported calendar events are read-only in Scheduling. Resync or remove the linked calendar instead.");
        }

        await googleCalendarIntegrationService.QueueLocalEventDeletionAsync(
            householdId,
            scheduledEvent.Id,
            clock.UtcNow,
            cancellationToken);
        dbContext.ScheduledEvents.Remove(scheduledEvent);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ScheduledEventMutationResult.Success(MapSeriesItem(scheduledEvent));
    }

    private ScheduledEventSeriesItem MapSeriesItem(
        ScheduledEvent scheduledEvent,
        LocalGoogleSyncInfo? localGoogleSync = null) =>
        new(
            scheduledEvent.Id,
            scheduledEvent.Title,
            scheduledEvent.Description,
            scheduledEvent.IsAllDay,
            scheduledEvent.StartsAtUtc,
            scheduledEvent.EndsAtUtc,
            scheduledEvent.RecurrencePattern != EventRecurrencePattern.None,
            scheduledEvent.RecurrencePattern.ToString(),
            RecurrenceRequestMapper.ToSummary(
                scheduledEvent.RecurrencePattern,
                scheduledEvent.WeeklyDaysMask,
                scheduledEvent.RecursUntilUtc),
            RecurrenceRequestMapper.ToWeekdayNames(scheduledEvent.WeeklyDaysMask),
            scheduledEvent.RecursUntilUtc,
            !string.IsNullOrWhiteSpace(scheduledEvent.SourceKind),
            scheduledEvent.SourceKind,
            localGoogleSync is not null,
            localGoogleSync?.SyncStatus,
            localGoogleSync?.LastError,
            localGoogleSync?.TargetDisplayName,
            localGoogleSync?.LastSucceededAtUtc,
            GetNextOccurrenceStartsAtUtc(scheduledEvent, clock.UtcNow),
            scheduledEvent.CreatedAtUtc);

    private static ValidatedScheduledEvent ValidateRequest(
        string title,
        string? description,
        bool isAllDay,
        DateTimeOffset? startsAtUtc,
        DateTimeOffset? endsAtUtc,
        ScheduledEventRecurrenceRequest? recurrence)
    {
        if (!startsAtUtc.HasValue)
        {
            return ValidatedScheduledEvent.Failure("Start time is required.");
        }

        if (endsAtUtc.HasValue && endsAtUtc <= startsAtUtc)
        {
            return ValidatedScheduledEvent.Failure("End time must be after start time.");
        }

        if (!RecurrenceRequestMapper.TryMap(
            recurrence,
            out var recurrencePattern,
            out var weeklyDaysMask,
            out var recursUntilUtc,
            out var recurrenceError))
        {
            return ValidatedScheduledEvent.Failure(recurrenceError!);
        }

        if (recursUntilUtc.HasValue && recursUntilUtc < startsAtUtc)
        {
            return ValidatedScheduledEvent.Failure("Recurrence end must be on or after the event start.");
        }

        return ValidatedScheduledEvent.Success(
            title.Trim(),
            description?.Trim(),
            isAllDay,
            startsAtUtc,
            endsAtUtc,
            recurrencePattern,
            weeklyDaysMask,
            recursUntilUtc);
    }

    private sealed record ValidatedScheduledEvent(
        string Title,
        string? Description,
        bool IsAllDay,
        DateTimeOffset? StartsAtUtc,
        DateTimeOffset? EndsAtUtc,
        EventRecurrencePattern RecurrencePattern,
        int WeeklyDaysMask,
        DateTimeOffset? RecursUntilUtc,
        string? Error)
    {
        public static ValidatedScheduledEvent Success(
            string title,
            string? description,
            bool isAllDay,
            DateTimeOffset? startsAtUtc,
            DateTimeOffset? endsAtUtc,
            EventRecurrencePattern recurrencePattern,
            int weeklyDaysMask,
            DateTimeOffset? recursUntilUtc) =>
            new(
                title,
                description,
                isAllDay,
                startsAtUtc,
                endsAtUtc,
                recurrencePattern,
                weeklyDaysMask,
                recursUntilUtc,
                null);

        public static ValidatedScheduledEvent Failure(string error) =>
            new(
                string.Empty,
                null,
                false,
                null,
                null,
                EventRecurrencePattern.None,
                0,
                null,
                error);
    }

    private static DateTimeOffset? GetNextOccurrenceStartsAtUtc(
        ScheduledEvent scheduledEvent,
        DateTimeOffset nowUtc)
    {
        var nextWindowEnd = nowUtc.AddDays(60);

        return RecurrenceExpansion.ExpandIntoWindow(
                scheduledEvent,
                nowUtc,
                nextWindowEnd)
            .Select(item => item.StartsAtUtc)
            .FirstOrDefault(startsAtUtc => startsAtUtc.HasValue);
    }

    private async Task<Dictionary<Guid, LocalGoogleSyncInfo>> LoadLocalGoogleSyncInfoAsync(
        Guid householdId,
        IReadOnlyCollection<Guid> eventIds,
        CancellationToken cancellationToken)
    {
        if (eventIds.Count == 0)
        {
            return [];
        }

        return await dbContext.GoogleCalendarLocalEventSyncs
            .Where(item => item.HouseholdId == householdId && eventIds.Contains(item.ScheduledEventId))
            .Join(
                dbContext.GoogleCalendarConnections,
                sync => sync.GoogleCalendarConnectionId,
                link => link.Id,
                (sync, link) => new
                {
                    sync.ScheduledEventId,
                    sync.SyncStatus,
                    sync.LastError,
                    sync.LastSucceededAtUtc,
                    link.DisplayName
                })
            .ToDictionaryAsync(
                item => item.ScheduledEventId,
                item => new LocalGoogleSyncInfo(
                    item.SyncStatus,
                    item.LastError,
                    item.DisplayName,
                    item.LastSucceededAtUtc),
                cancellationToken);
    }
}

internal sealed record LocalGoogleSyncInfo(
    string SyncStatus,
    string? LastError,
    string TargetDisplayName,
    DateTimeOffset? LastSucceededAtUtc);
