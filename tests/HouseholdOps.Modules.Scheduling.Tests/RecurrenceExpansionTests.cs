using HouseholdOps.Modules.Scheduling;
using Xunit;

namespace HouseholdOps.Modules.Scheduling.Tests;

public class RecurrenceExpansionTests
{
    private static readonly Guid HouseholdId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly DateTimeOffset WindowStart = new(2026, 4, 13, 0, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset WindowEnd = new(2026, 4, 20, 0, 0, 0, TimeSpan.Zero);

    [Fact]
    public void NonRecurringEvent_OnlyReturnsSeedOccurrence()
    {
        var scheduledEvent = new ScheduledEvent
        {
            HouseholdId = HouseholdId,
            Title = "Dentist",
            StartsAtUtc = new DateTimeOffset(2026, 4, 15, 14, 0, 0, TimeSpan.Zero),
            EndsAtUtc = new DateTimeOffset(2026, 4, 15, 15, 0, 0, TimeSpan.Zero)
        };

        var items = RecurrenceExpansion.ExpandIntoWindow(scheduledEvent, WindowStart, WindowEnd);

        Assert.Single(items);
        Assert.Equal(scheduledEvent.StartsAtUtc, items[0].StartsAtUtc);
        Assert.Equal(scheduledEvent.EndsAtUtc, items[0].EndsAtUtc);
    }

    [Fact]
    public void DailyRecurringEvent_ExpandsAcrossWindow()
    {
        var scheduledEvent = new ScheduledEvent
        {
            HouseholdId = HouseholdId,
            Title = "Medication",
            StartsAtUtc = new DateTimeOffset(2026, 4, 11, 8, 30, 0, TimeSpan.Zero),
            EndsAtUtc = new DateTimeOffset(2026, 4, 11, 8, 45, 0, TimeSpan.Zero),
            RecurrencePattern = EventRecurrencePattern.Daily,
            RecursUntilUtc = new DateTimeOffset(2026, 4, 17, 8, 30, 0, TimeSpan.Zero)
        };

        var items = RecurrenceExpansion.ExpandIntoWindow(scheduledEvent, WindowStart, WindowEnd);

        Assert.Equal(5, items.Count);
        Assert.Equal(new DateTimeOffset(2026, 4, 13, 8, 30, 0, TimeSpan.Zero), items[0].StartsAtUtc);
        Assert.Equal(new DateTimeOffset(2026, 4, 17, 8, 30, 0, TimeSpan.Zero), items[^1].StartsAtUtc);
        Assert.All(items, item => Assert.Equal(TimeSpan.FromMinutes(15), item.EndsAtUtc - item.StartsAtUtc));
    }

    [Fact]
    public void WeeklyRecurringEvent_OnlyReturnsSelectedWeekdaysInWindow()
    {
        var scheduledEvent = new ScheduledEvent
        {
            HouseholdId = HouseholdId,
            Title = "School pickup",
            StartsAtUtc = new DateTimeOffset(2026, 4, 6, 15, 30, 0, TimeSpan.Zero),
            EndsAtUtc = new DateTimeOffset(2026, 4, 6, 16, 0, 0, TimeSpan.Zero),
            RecurrencePattern = EventRecurrencePattern.Weekly,
            WeeklyDaysMask = (int)(WeeklyDayMask.Monday | WeeklyDayMask.Wednesday | WeeklyDayMask.Friday)
        };

        var items = RecurrenceExpansion.ExpandIntoWindow(scheduledEvent, WindowStart, WindowEnd);

        Assert.Equal(3, items.Count);
        Assert.Equal(DayOfWeek.Monday, items[0].StartsAtUtc!.Value.DayOfWeek);
        Assert.Equal(DayOfWeek.Wednesday, items[1].StartsAtUtc!.Value.DayOfWeek);
        Assert.Equal(DayOfWeek.Friday, items[2].StartsAtUtc!.Value.DayOfWeek);
    }

    [Fact]
    public void WeeklyRecurringEvent_DoesNotReturnOccurrencesBeforeSeedStart()
    {
        var scheduledEvent = new ScheduledEvent
        {
            HouseholdId = HouseholdId,
            Title = "Afternoon walk",
            StartsAtUtc = new DateTimeOffset(2026, 4, 16, 18, 0, 0, TimeSpan.Zero),
            RecurrencePattern = EventRecurrencePattern.Weekly,
            WeeklyDaysMask = (int)(WeeklyDayMask.Monday | WeeklyDayMask.Thursday)
        };

        var items = RecurrenceExpansion.ExpandIntoWindow(
            scheduledEvent,
            new DateTimeOffset(2026, 4, 13, 0, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 4, 21, 0, 0, 0, TimeSpan.Zero));

        Assert.Equal(2, items.Count);
        Assert.Equal(new DateTimeOffset(2026, 4, 16, 18, 0, 0, TimeSpan.Zero), items[0].StartsAtUtc);
        Assert.Equal(new DateTimeOffset(2026, 4, 20, 18, 0, 0, TimeSpan.Zero), items[1].StartsAtUtc);
    }

    [Fact]
    public void RecurrenceEnd_IsExclusiveForLaterOccurrences()
    {
        var scheduledEvent = new ScheduledEvent
        {
            HouseholdId = HouseholdId,
            Title = "Hydrate",
            StartsAtUtc = new DateTimeOffset(2026, 4, 13, 9, 0, 0, TimeSpan.Zero),
            RecurrencePattern = EventRecurrencePattern.Daily,
            RecursUntilUtc = new DateTimeOffset(2026, 4, 14, 9, 0, 0, TimeSpan.Zero)
        };

        var items = RecurrenceExpansion.ExpandIntoWindow(scheduledEvent, WindowStart, WindowEnd);

        Assert.Equal(2, items.Count);
        Assert.DoesNotContain(items, item => item.StartsAtUtc == new DateTimeOffset(2026, 4, 15, 9, 0, 0, TimeSpan.Zero));
    }
}
