using HouseholdOps.Infrastructure.Households;
using HouseholdOps.Infrastructure.Notifications;
using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Infrastructure.Scheduling;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Notifications;
using HouseholdOps.Modules.Notifications.Contracts;
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
            agendaQueryService,
            new EventReminderService(dbContext));

        var morningEventId = Guid.NewGuid();
        var pickupEventId = Guid.NewGuid();
        dbContext.ScheduledEvents.AddRange(
            new ScheduledEvent
            {
                Id = morningEventId,
                HouseholdId = HouseholdId,
                Title = "Morning meds",
                IsAllDay = false,
                StartsAtUtc = new DateTimeOffset(2026, 4, 16, 12, 30, 0, TimeSpan.Zero),
                CreatedAtUtc = NowUtc.AddDays(-1)
            },
            new ScheduledEvent
            {
                Id = pickupEventId,
                HouseholdId = HouseholdId,
                Title = "School pickup",
                IsAllDay = false,
                StartsAtUtc = new DateTimeOffset(2026, 4, 16, 18, 15, 0, TimeSpan.Zero),
                CreatedAtUtc = NowUtc.AddHours(-3)
            });

        dbContext.EventReminders.AddRange(
            new EventReminder
            {
                Id = Guid.NewGuid(),
                HouseholdId = HouseholdId,
                ScheduledEventId = morningEventId,
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
                ScheduledEventId = pickupEventId,
                EventTitle = "School pickup",
                MinutesBefore = 15,
                DueAtUtc = new DateTimeOffset(2026, 4, 16, 18, 0, 0, TimeSpan.Zero),
                Status = EventReminderStatuses.Pending,
                CreatedAtUtc = NowUtc.AddHours(-2)
            });
        await dbContext.SaveChangesAsync();

        var home = await service.GetHomeAsync(HouseholdId, isOwner: true, CancellationToken.None);

        Assert.Equal(2, home.PendingReminders.Count);
        Assert.Equal("Morning meds", home.PendingReminders[0].EventTitle);
        Assert.Equal("School pickup", home.PendingReminders[1].EventTitle);
    }

    [Fact]
    public async Task GetHomeAsync_UsesBackendCapabilityMetadata_ForMembers()
    {
        await using var dbContext = CreateDbContext();
        var agendaQueryService = new AgendaQueryService(dbContext);
        var reminderService = new EventReminderService(dbContext);
        var service = new HouseholdHomeService(
            dbContext,
            new FakeClock(NowUtc),
            agendaQueryService,
            reminderService);

        var upcomingEvent = new ScheduledEvent
        {
            Id = Guid.NewGuid(),
            HouseholdId = HouseholdId,
            Title = "Family dinner",
            IsAllDay = false,
            StartsAtUtc = new DateTimeOffset(2026, 4, 17, 18, 0, 0, TimeSpan.Zero),
            CreatedAtUtc = NowUtc.AddDays(-1)
        };
        dbContext.ScheduledEvents.Add(upcomingEvent);
        await dbContext.SaveChangesAsync();

        await reminderService.CreateReminderAsync(
            HouseholdId,
            new CreateEventReminderRequest(upcomingEvent.Id, MinutesBefore: 30),
            NowUtc,
            CancellationToken.None);

        var home = await service.GetHomeAsync(HouseholdId, isOwner: false, CancellationToken.None);

        var reminder = Assert.Single(home.PendingReminders);
        Assert.True(reminder.IsReadOnly);
        Assert.False(reminder.CanDismiss);
        Assert.False(reminder.CanSnooze);
        Assert.False(reminder.CanDelete);

        var upcoming = Assert.Single(home.UpcomingDays.SelectMany(day => day.Events));
        Assert.True(upcoming.IsReadOnly);
        Assert.False(upcoming.CanEdit);
        Assert.False(upcoming.CanDelete);
        Assert.False(upcoming.CanCreateReminder);
        Assert.False(upcoming.CanManageReminders);
        Assert.Equal("Only household owners can manage reminders.", upcoming.ReminderEligibilityReason);
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
