using HouseholdOps.Infrastructure.Households;
using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Infrastructure.Scheduling;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Notifications;
using HouseholdOps.Modules.Scheduling;
using HouseholdOps.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HouseholdOps.Modules.Households.Tests;

public class HouseholdHomeServiceTests
{
    private static readonly Guid HouseholdId = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");
    private static readonly DateTimeOffset NowUtc = new(2026, 4, 16, 15, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task GetHomeAsync_Includes_Overdue_Pending_Reminders_Before_Upcoming_Ones()
    {
        await using var dbContext = CreateDbContext();
        var agendaQueryService = new AgendaQueryService(dbContext);
        var service = new HouseholdHomeService(
            dbContext,
            new FakeClock(NowUtc),
            agendaQueryService);

        dbContext.EventReminders.AddRange(
            new EventReminder
            {
                Id = Guid.NewGuid(),
                HouseholdId = HouseholdId,
                ScheduledEventId = Guid.NewGuid(),
                EventTitle = "Morning meds",
                MinutesBefore = 30,
                DueAtUtc = new DateTimeOffset(2026, 4, 16, 12, 0, 0, TimeSpan.Zero),
                Status = EventReminderStatuses.Pending,
                CreatedAtUtc = NowUtc.AddDays(-1)
            },
            new EventReminder
            {
                Id = Guid.NewGuid(),
                HouseholdId = HouseholdId,
                ScheduledEventId = Guid.NewGuid(),
                EventTitle = "School pickup",
                MinutesBefore = 15,
                DueAtUtc = new DateTimeOffset(2026, 4, 16, 18, 0, 0, TimeSpan.Zero),
                Status = EventReminderStatuses.Pending,
                CreatedAtUtc = NowUtc.AddHours(-2)
            });
        await dbContext.SaveChangesAsync();

        var home = await service.GetHomeAsync(HouseholdId, CancellationToken.None);

        Assert.Equal(2, home.PendingReminders.Count);
        Assert.Equal("Morning meds", home.PendingReminders[0].EventTitle);
        Assert.Equal("School pickup", home.PendingReminders[1].EventTitle);
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
            Name = "Test Household",
            TimeZoneId = "UTC",
            CreatedAtUtc = NowUtc.AddDays(-10)
        });
        dbContext.SaveChanges();
        return dbContext;
    }

    private sealed class FakeClock(DateTimeOffset utcNow) : IClock
    {
        public DateTimeOffset UtcNow { get; } = utcNow;
    }
}
