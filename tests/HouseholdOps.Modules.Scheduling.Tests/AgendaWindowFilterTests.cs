using HouseholdOps.Modules.Scheduling;
using Xunit;

namespace HouseholdOps.Modules.Scheduling.Tests;

public class AgendaWindowFilterTests
{
    private static readonly DateTimeOffset WindowStart =
        new(2026, 4, 10, 0, 0, 0, TimeSpan.Zero);

    private static readonly DateTimeOffset WindowEnd =
        new(2026, 4, 17, 0, 0, 0, TimeSpan.Zero);

    [Fact]
    public void EventStartingAtWindowStart_IsIncluded()
    {
        Assert.True(AgendaWindowFilter.StartsInWindow(WindowStart, WindowStart, WindowEnd));
    }

    [Fact]
    public void EventStartingInsideWindow_IsIncluded()
    {
        var midWindow = WindowStart.AddDays(3);
        Assert.True(AgendaWindowFilter.StartsInWindow(midWindow, WindowStart, WindowEnd));
    }

    [Fact]
    public void EventStartingOneSecondBeforeWindowEnd_IsIncluded()
    {
        var oneSecondBefore = WindowEnd.AddSeconds(-1);
        Assert.True(AgendaWindowFilter.StartsInWindow(oneSecondBefore, WindowStart, WindowEnd));
    }

    [Fact]
    public void EventStartingAtWindowEnd_IsExcluded()
    {
        // Window end is exclusive
        Assert.False(AgendaWindowFilter.StartsInWindow(WindowEnd, WindowStart, WindowEnd));
    }

    [Fact]
    public void EventStartingAfterWindowEnd_IsExcluded()
    {
        var after = WindowEnd.AddDays(1);
        Assert.False(AgendaWindowFilter.StartsInWindow(after, WindowStart, WindowEnd));
    }

    [Fact]
    public void EventStartingBeforeWindowStart_IsExcluded()
    {
        var before = WindowStart.AddSeconds(-1);
        Assert.False(AgendaWindowFilter.StartsInWindow(before, WindowStart, WindowEnd));
    }

    [Fact]
    public void EventWithNullStartsAt_IsExcluded()
    {
        Assert.False(AgendaWindowFilter.StartsInWindow(null, WindowStart, WindowEnd));
    }

    [Fact]
    public void ZeroLengthWindow_ExcludesAllEvents()
    {
        var instant = WindowStart;
        // [windowStart, windowStart) is empty — nothing starts in it
        Assert.False(AgendaWindowFilter.StartsInWindow(instant, WindowStart, WindowStart));
    }
}
