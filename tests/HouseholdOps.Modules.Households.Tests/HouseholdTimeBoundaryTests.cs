using HouseholdOps.Modules.Households;
using Xunit;

namespace HouseholdOps.Modules.Households.Tests;

public class HouseholdTimeBoundaryTests
{
    [Fact]
    public void Utc_Window_Is_Midnight_To_Midnight()
    {
        var tz = TimeZoneInfo.Utc;
        var now = new DateTimeOffset(2026, 4, 14, 14, 30, 0, TimeSpan.Zero);

        var (start, end) = HouseholdTimeBoundary.GetTodayWindowUtc(now, tz);

        Assert.Equal(new DateTimeOffset(2026, 4, 14, 0, 0, 0, TimeSpan.Zero), start);
        Assert.Equal(new DateTimeOffset(2026, 4, 15, 0, 0, 0, TimeSpan.Zero), end);
    }

    [Fact]
    public void Non_Utc_Window_Reflects_Local_Midnight()
    {
        // America/New_York at 2026-04-14 03:30 UTC is 2026-04-13 23:30 local (EDT, -04:00).
        // So "today" in the household's local time is still the 13th.
        var tz = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");
        var now = new DateTimeOffset(2026, 4, 14, 3, 30, 0, TimeSpan.Zero);

        var (start, end) = HouseholdTimeBoundary.GetTodayWindowUtc(now, tz);

        // Start should be 2026-04-13 00:00 local = 2026-04-13 04:00 UTC
        Assert.Equal(new DateTimeOffset(2026, 4, 13, 4, 0, 0, TimeSpan.Zero), start);
        // End should be 2026-04-14 00:00 local = 2026-04-14 04:00 UTC
        Assert.Equal(new DateTimeOffset(2026, 4, 14, 4, 0, 0, TimeSpan.Zero), end);
    }

    [Fact]
    public void ToLocalDate_Groups_Late_Evening_To_Correct_Local_Day()
    {
        // A completion at 2026-04-14 02:00 UTC in New York is 2026-04-13 22:00 local.
        // The streak and agenda grouping should bucket this under April 13, not April 14.
        var tz = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");
        var instant = new DateTimeOffset(2026, 4, 14, 2, 0, 0, TimeSpan.Zero);

        var date = HouseholdTimeBoundary.ToLocalDate(instant, tz);

        Assert.Equal(new DateOnly(2026, 4, 13), date);
    }

    [Fact]
    public void ResolveTimeZone_Falls_Back_To_Utc_For_Unknown_Id()
    {
        var tz = HouseholdTimeBoundary.ResolveTimeZone("Not/A_Zone");
        Assert.Equal(TimeZoneInfo.Utc.Id, tz.Id);
    }

    [Fact]
    public void ResolveTimeZone_Falls_Back_To_Utc_For_Empty()
    {
        Assert.Equal(TimeZoneInfo.Utc.Id, HouseholdTimeBoundary.ResolveTimeZone(null).Id);
        Assert.Equal(TimeZoneInfo.Utc.Id, HouseholdTimeBoundary.ResolveTimeZone("").Id);
        Assert.Equal(TimeZoneInfo.Utc.Id, HouseholdTimeBoundary.ResolveTimeZone("   ").Id);
    }
}
