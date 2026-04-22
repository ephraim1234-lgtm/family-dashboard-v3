using HouseholdOps.Modules.Scheduling.Contracts;

namespace HouseholdOps.Modules.Scheduling;

public static class RecurrenceExpansion
{
    public static IReadOnlyList<UpcomingEventItem> ExpandIntoWindow(
        ScheduledEvent scheduledEvent,
        DateTimeOffset windowStartUtc,
        DateTimeOffset windowEndUtc)
    {
        if (!scheduledEvent.StartsAtUtc.HasValue || windowEndUtc <= windowStartUtc)
        {
            return [];
        }

        return scheduledEvent.RecurrencePattern switch
        {
            EventRecurrencePattern.None => ExpandSingle(scheduledEvent, windowStartUtc, windowEndUtc),
            EventRecurrencePattern.Daily => ExpandDaily(scheduledEvent, windowStartUtc, windowEndUtc),
            EventRecurrencePattern.Weekly => ExpandWeekly(scheduledEvent, windowStartUtc, windowEndUtc),
            _ => []
        };
    }

    private static IReadOnlyList<UpcomingEventItem> ExpandSingle(
        ScheduledEvent scheduledEvent,
        DateTimeOffset windowStartUtc,
        DateTimeOffset windowEndUtc)
        => AgendaWindowFilter.StartsInWindow(
            scheduledEvent.StartsAtUtc,
            windowStartUtc,
            windowEndUtc)
            ? [CreateOccurrence(scheduledEvent, scheduledEvent.StartsAtUtc!.Value)]
            : [];

    private static IReadOnlyList<UpcomingEventItem> ExpandDaily(
        ScheduledEvent scheduledEvent,
        DateTimeOffset windowStartUtc,
        DateTimeOffset windowEndUtc)
    {
        var start = scheduledEvent.StartsAtUtc!.Value;
        var occurrences = new List<UpcomingEventItem>();
        var current = start;

        if (current < windowStartUtc)
        {
            var daysBetween = (windowStartUtc.Date - current.Date).Days;
            current = current.AddDays(daysBetween);

            if (current < windowStartUtc)
            {
                current = current.AddDays(1);
            }
        }

        while (current < windowEndUtc)
        {
            if (scheduledEvent.RecursUntilUtc.HasValue && current > scheduledEvent.RecursUntilUtc.Value)
            {
                break;
            }

            if (current >= start)
            {
                occurrences.Add(CreateOccurrence(scheduledEvent, current));
            }

            current = current.AddDays(1);
        }

        return occurrences;
    }

    private static IReadOnlyList<UpcomingEventItem> ExpandWeekly(
        ScheduledEvent scheduledEvent,
        DateTimeOffset windowStartUtc,
        DateTimeOffset windowEndUtc)
    {
        var start = scheduledEvent.StartsAtUtc!.Value;
        var days = ResolveWeeklyDays(scheduledEvent);

        if (days.Count == 0)
        {
            return [];
        }

        var duration = scheduledEvent.EndsAtUtc - scheduledEvent.StartsAtUtc;
        var occurrences = new List<UpcomingEventItem>();
        var cursorDate = start.Date > windowStartUtc.Date ? start.Date : windowStartUtc.Date;

        while (cursorDate < windowEndUtc.Date.AddDays(1))
        {
            if (scheduledEvent.RecursUntilUtc.HasValue && cursorDate > scheduledEvent.RecursUntilUtc.Value.Date)
            {
                break;
            }

            if (days.Contains(cursorDate.DayOfWeek))
            {
                var occurrenceStart = new DateTimeOffset(
                    cursorDate.Year,
                    cursorDate.Month,
                    cursorDate.Day,
                    0,
                    0,
                    0,
                    start.Offset)
                    .Add(start.TimeOfDay);

                if (occurrenceStart >= start
                    && (!scheduledEvent.RecursUntilUtc.HasValue
                        || occurrenceStart <= scheduledEvent.RecursUntilUtc.Value)
                    && AgendaWindowFilter.StartsInWindow(occurrenceStart, windowStartUtc, windowEndUtc))
                {
                occurrences.Add(new UpcomingEventItem(
                    scheduledEvent.Id,
                    scheduledEvent.Title,
                    scheduledEvent.Description,
                    scheduledEvent.IsAllDay,
                    occurrenceStart,
                    duration.HasValue ? occurrenceStart.Add(duration.Value) : null,
                    !string.IsNullOrWhiteSpace(scheduledEvent.SourceKind),
                    scheduledEvent.SourceKind,
                    false,
                    null,
                    null,
                    null,
                    null));
                }
            }

            cursorDate = cursorDate.AddDays(1);
        }

        return occurrences;
    }

    private static UpcomingEventItem CreateOccurrence(
        ScheduledEvent scheduledEvent,
        DateTimeOffset occurrenceStart)
    {
        var duration = scheduledEvent.EndsAtUtc - scheduledEvent.StartsAtUtc;

        return new UpcomingEventItem(
            scheduledEvent.Id,
            scheduledEvent.Title,
            scheduledEvent.Description,
            scheduledEvent.IsAllDay,
            occurrenceStart,
            duration.HasValue ? occurrenceStart.Add(duration.Value) : null,
            !string.IsNullOrWhiteSpace(scheduledEvent.SourceKind),
            scheduledEvent.SourceKind,
            false,
            null,
            null,
            null,
            null);
    }

    private static HashSet<DayOfWeek> ResolveWeeklyDays(ScheduledEvent scheduledEvent)
    {
        var mask = (WeeklyDayMask)scheduledEvent.WeeklyDaysMask;
        var days = new HashSet<DayOfWeek>();

        if (mask.HasFlag(WeeklyDayMask.Sunday)) days.Add(DayOfWeek.Sunday);
        if (mask.HasFlag(WeeklyDayMask.Monday)) days.Add(DayOfWeek.Monday);
        if (mask.HasFlag(WeeklyDayMask.Tuesday)) days.Add(DayOfWeek.Tuesday);
        if (mask.HasFlag(WeeklyDayMask.Wednesday)) days.Add(DayOfWeek.Wednesday);
        if (mask.HasFlag(WeeklyDayMask.Thursday)) days.Add(DayOfWeek.Thursday);
        if (mask.HasFlag(WeeklyDayMask.Friday)) days.Add(DayOfWeek.Friday);
        if (mask.HasFlag(WeeklyDayMask.Saturday)) days.Add(DayOfWeek.Saturday);

        return days;
    }
}
