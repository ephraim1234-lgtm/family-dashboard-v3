using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Scheduling;
using Microsoft.EntityFrameworkCore;

namespace HouseholdOps.Infrastructure.Scheduling;

public sealed class ImportedScheduledEventSyncService(
    HouseholdOpsDbContext dbContext) : IImportedScheduledEventSyncService
{
    public async Task<ImportedScheduledEventSyncResult> SyncAsync(
        Guid householdId,
        string sourceKind,
        Guid sourceCalendarId,
        IReadOnlyCollection<ImportedScheduledEvent> importedEvents,
        DateTimeOffset syncedAtUtc,
        CancellationToken cancellationToken)
    {
        var existingEvents = await dbContext.ScheduledEvents
            .Where(eventItem =>
                eventItem.HouseholdId == householdId
                && eventItem.SourceKind == sourceKind
                && eventItem.SourceCalendarId == sourceCalendarId)
            .ToListAsync(cancellationToken);

        var existingBySourceId = existingEvents
            .Where(item => !string.IsNullOrWhiteSpace(item.SourceEventId))
            .ToDictionary(item => item.SourceEventId!, StringComparer.Ordinal);

        var incomingBySourceId = importedEvents
            .GroupBy(item => item.SourceEventId, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.Last(), StringComparer.Ordinal);

        var createdCount = 0;
        var updatedCount = 0;

        foreach (var imported in incomingBySourceId.Values)
        {
            if (existingBySourceId.TryGetValue(imported.SourceEventId, out var existing))
            {
                existing.Title = imported.Title;
                existing.Description = imported.Description;
                existing.IsAllDay = imported.IsAllDay;
                existing.StartsAtUtc = imported.StartsAtUtc;
                existing.EndsAtUtc = imported.EndsAtUtc;
                existing.RecurrencePattern = imported.RecurrencePattern;
                existing.WeeklyDaysMask = imported.WeeklyDaysMask;
                existing.RecursUntilUtc = imported.RecursUntilUtc;
                existing.LastImportedAtUtc = syncedAtUtc;
                updatedCount++;
                continue;
            }

            dbContext.ScheduledEvents.Add(new ScheduledEvent
            {
                HouseholdId = householdId,
                Title = imported.Title,
                Description = imported.Description,
                IsAllDay = imported.IsAllDay,
                StartsAtUtc = imported.StartsAtUtc,
                EndsAtUtc = imported.EndsAtUtc,
                RecurrencePattern = imported.RecurrencePattern,
                WeeklyDaysMask = imported.WeeklyDaysMask,
                RecursUntilUtc = imported.RecursUntilUtc,
                SourceKind = sourceKind,
                SourceCalendarId = sourceCalendarId,
                SourceEventId = imported.SourceEventId,
                LastImportedAtUtc = syncedAtUtc,
                CreatedAtUtc = syncedAtUtc
            });
            createdCount++;
        }

        var removed = existingEvents
            .Where(existing => existing.SourceEventId is not null
                && !incomingBySourceId.ContainsKey(existing.SourceEventId))
            .ToList();

        if (removed.Count > 0)
        {
            dbContext.ScheduledEvents.RemoveRange(removed);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return new ImportedScheduledEventSyncResult(
            createdCount,
            updatedCount,
            removed.Count,
            incomingBySourceId.Count);
    }

    public async Task DeleteSourceAsync(
        Guid householdId,
        string sourceKind,
        Guid sourceCalendarId,
        CancellationToken cancellationToken)
    {
        var existingEvents = await dbContext.ScheduledEvents
            .Where(eventItem =>
                eventItem.HouseholdId == householdId
                && eventItem.SourceKind == sourceKind
                && eventItem.SourceCalendarId == sourceCalendarId)
            .ToListAsync(cancellationToken);

        if (existingEvents.Count == 0)
        {
            return;
        }

        dbContext.ScheduledEvents.RemoveRange(existingEvents);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
