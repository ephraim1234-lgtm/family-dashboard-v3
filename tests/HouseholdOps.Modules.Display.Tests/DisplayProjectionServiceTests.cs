using HouseholdOps.Infrastructure.Display;
using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Infrastructure.Scheduling;
using HouseholdOps.Modules.Display;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Scheduling;
using HouseholdOps.Modules.Scheduling.Contracts;
using HouseholdOps.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HouseholdOps.Modules.Display.Tests;

public class DisplayProjectionServiceTests
{
    private static readonly Guid HouseholdId = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");
    private static readonly DateTimeOffset ClockNow = new(2026, 4, 11, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task CreateDevice_DefaultsToBalancedPresentationMode()
    {
        await using var dbContext = CreateDbContext();
        var managementService = new DisplayManagementService(dbContext, new FakeClock(ClockNow));

        var created = await managementService.CreateDeviceAsync(
            HouseholdId,
            "Hallway Display",
            CancellationToken.None);

        var listed = await managementService.ListDevicesAsync(HouseholdId, CancellationToken.None);

        Assert.Equal("Balanced", created.PresentationMode);
        Assert.Equal("Comfortable", created.AgendaDensityMode);
        var device = Assert.Single(listed.Devices);
        Assert.Equal("Balanced", device.PresentationMode);
        Assert.Equal("Comfortable", device.AgendaDensityMode);
    }

    [Fact]
    public async Task Projection_IncludesDisplayOwnedDenseScheduleFraming()
    {
        await using var dbContext = CreateDbContext();
        var clock = new FakeClock(ClockNow);
        var managementService = new DisplayManagementService(dbContext, clock);
        var schedulingService = new ScheduledEventManagementService(dbContext, clock);

        var device = await managementService.CreateDeviceAsync(
            HouseholdId,
            "Kitchen Display",
            CancellationToken.None);

        var listed = await managementService.ListDevicesAsync(HouseholdId, CancellationToken.None);
        var deviceId = Assert.Single(listed.Devices).DeviceId;

        await managementService.UpdatePresentationModeAsync(
            HouseholdId,
            deviceId,
            DisplayPresentationMode.FocusNext,
            CancellationToken.None);

        await managementService.UpdateAgendaDensityModeAsync(
            HouseholdId,
            deviceId,
            DisplayAgendaDensityMode.Dense,
            CancellationToken.None);

        await schedulingService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Field day",
                "All-day school event",
                true,
                new DateTimeOffset(2026, 4, 12, 0, 0, 0, TimeSpan.Zero),
                null,
                null),
            ClockNow,
            CancellationToken.None);

        await schedulingService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Dinner prep",
                "Chop vegetables",
                false,
                new DateTimeOffset(2026, 4, 11, 17, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 11, 17, 30, 0, TimeSpan.Zero),
                null),
            ClockNow,
            CancellationToken.None);

        await schedulingService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Pickup groceries",
                "On the way home",
                false,
                new DateTimeOffset(2026, 4, 11, 14, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 11, 14, 30, 0, TimeSpan.Zero),
                null),
            ClockNow,
            CancellationToken.None);

        await schedulingService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Evening walk",
                "After dinner",
                false,
                new DateTimeOffset(2026, 4, 11, 21, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 11, 21, 30, 0, TimeSpan.Zero),
                null),
            ClockNow,
            CancellationToken.None);

        var projectionService = new DisplayProjectionService(
            dbContext,
            clock,
            new AgendaQueryService(dbContext));

        var projection = await projectionService.GetProjectionAsync(
            device.AccessToken,
            CancellationToken.None);

        Assert.NotNull(projection);
        Assert.Equal("FocusNext", projection!.PresentationMode);
        Assert.Equal("Dense", projection.AgendaDensityMode);
        Assert.NotNull(projection.AgendaSection.NextItem);
        Assert.Equal("Pickup groceries", projection.AgendaSection.NextItem!.Title);
        Assert.Single(projection.AgendaSection.SoonItems);
        Assert.Equal("Dinner prep", projection.AgendaSection.SoonItems[0].Title);
        Assert.Single(projection.AgendaSection.LaterTodayItems);
        Assert.Equal("Evening walk", projection.AgendaSection.LaterTodayItems[0].Title);
        Assert.Single(projection.AgendaSection.AllDayItems);
        Assert.Equal("Field day", projection.AgendaSection.AllDayItems[0].Title);
        Assert.True(projection.AgendaSection.UpcomingDays.Count >= 2);
        Assert.Equal("Today", projection.AgendaSection.UpcomingDays[0].Label);
    }

    private static HouseholdOpsDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<HouseholdOpsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;

        var dbContext = new HouseholdOpsDbContext(options);
        dbContext.Households.Add(new Household
        {
            Id = HouseholdId,
            Name = "Display Test Household",
            CreatedAtUtc = ClockNow
        });
        dbContext.SaveChanges();
        return dbContext;
    }

    private sealed class FakeClock(DateTimeOffset utcNow) : IClock
    {
        public DateTimeOffset UtcNow { get; } = utcNow;
    }
}
