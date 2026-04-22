using HouseholdOps.Modules.Scheduling;
using Xunit;

namespace HouseholdOps.Modules.Scheduling.Tests;

public class ScheduleWindowQueryParserTests
{
    private static readonly DateTimeOffset FallbackUtcNow =
        new(2026, 4, 20, 15, 30, 0, TimeSpan.Zero);

    [Fact]
    public void ParseWindowDays_ReturnsFallbackForMissingValue()
    {
        Assert.Equal(14, ScheduleWindowQueryParser.ParseWindowDays(null));
    }

    [Fact]
    public void ParseWindowDays_AllowsSupportedCalendarWindows()
    {
        Assert.Equal(7, ScheduleWindowQueryParser.ParseWindowDays("7"));
        Assert.Equal(14, ScheduleWindowQueryParser.ParseWindowDays("14"));
        Assert.Equal(30, ScheduleWindowQueryParser.ParseWindowDays("30"));
        Assert.Equal(42, ScheduleWindowQueryParser.ParseWindowDays("42"));
    }

    [Fact]
    public void ParseWindowDays_RejectsUnsupportedWindows()
    {
        Assert.Equal(14, ScheduleWindowQueryParser.ParseWindowDays("9"));
    }

    [Fact]
    public void ParseWindowStartUtc_NormalizesToUtcDayBoundary()
    {
        var parsed = ScheduleWindowQueryParser.ParseWindowStartUtc(
            "2026-04-24T18:45:00+02:00",
            FallbackUtcNow);

        Assert.Equal(new DateTimeOffset(2026, 4, 24, 0, 0, 0, TimeSpan.Zero), parsed);
    }

    [Fact]
    public void ParseWindowStartUtc_UsesFallbackDateWhenMissing()
    {
        var parsed = ScheduleWindowQueryParser.ParseWindowStartUtc(
            null,
            FallbackUtcNow);

        Assert.Equal(new DateTimeOffset(2026, 4, 20, 0, 0, 0, TimeSpan.Zero), parsed);
    }
}
