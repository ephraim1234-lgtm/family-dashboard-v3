using HouseholdOps.Infrastructure.Notifications;
using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Integrations;
using HouseholdOps.Modules.Notifications;
using HouseholdOps.Modules.Notifications.Contracts;
using HouseholdOps.Modules.Scheduling;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HouseholdOps.Modules.Notifications.Tests;

public class EventReminderServiceTests
{
    private static readonly Guid HouseholdId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly DateTimeOffset CreatedAtUtc = new(2026, 4, 12, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task CreateReminder_WithValidEvent_SetsCorrectDueTime()
    {
        await using var dbContext = CreateDbContext();
        var eventStart = new DateTimeOffset(2026, 4, 15, 14, 0, 0, TimeSpan.Zero);
        var scheduledEvent = AddEvent(dbContext, "Doctor", isAllDay: false, startsAt: eventStart);

        var service = new EventReminderService(dbContext);
        var result = await service.CreateReminderAsync(
            HouseholdId,
            new CreateEventReminderRequest(scheduledEvent.Id, MinutesBefore: 30),
            CreatedAtUtc,
            CancellationToken.None);

        Assert.Equal(EventReminderMutationStatus.Succeeded, result.Status);
        Assert.NotNull(result.Reminder);
        Assert.Equal(eventStart.AddMinutes(-30), result.Reminder.DueAtUtc);
        Assert.Equal(EventReminderStatuses.Pending, result.Reminder.Status);
        Assert.Equal("Doctor", result.Reminder.EventTitle);
        Assert.Equal(30, result.Reminder.MinutesBefore);
    }

    [Fact]
    public async Task CreateReminder_WithAllDayEvent_ReturnsValidationError()
    {
        await using var dbContext = CreateDbContext();
        var scheduledEvent = AddEvent(dbContext, "Holiday", isAllDay: true, startsAt: null);

        var service = new EventReminderService(dbContext);
        var result = await service.CreateReminderAsync(
            HouseholdId,
            new CreateEventReminderRequest(scheduledEvent.Id, MinutesBefore: 60),
            CreatedAtUtc,
            CancellationToken.None);

        Assert.Equal(EventReminderMutationStatus.ValidationFailed, result.Status);
        Assert.NotNull(result.Error);
    }

    [Fact]
    public async Task CreateReminder_WithNoStartTime_ReturnsValidationError()
    {
        await using var dbContext = CreateDbContext();
        var scheduledEvent = AddEvent(dbContext, "TBD", isAllDay: false, startsAt: null);

        var service = new EventReminderService(dbContext);
        var result = await service.CreateReminderAsync(
            HouseholdId,
            new CreateEventReminderRequest(scheduledEvent.Id, MinutesBefore: 15),
            CreatedAtUtc,
            CancellationToken.None);

        Assert.Equal(EventReminderMutationStatus.ValidationFailed, result.Status);
        Assert.NotNull(result.Error);
    }

    [Fact]
    public async Task CreateReminder_WithRecurringEvent_ReturnsValidationError()
    {
        await using var dbContext = CreateDbContext();
        var scheduledEvent = AddEvent(
            dbContext,
            "Medication",
            isAllDay: false,
            startsAt: new DateTimeOffset(2026, 4, 15, 9, 0, 0, TimeSpan.Zero),
            recurrencePattern: EventRecurrencePattern.Daily);

        var service = new EventReminderService(dbContext);
        var result = await service.CreateReminderAsync(
            HouseholdId,
            new CreateEventReminderRequest(scheduledEvent.Id, MinutesBefore: 15),
            CreatedAtUtc,
            CancellationToken.None);

        Assert.Equal(EventReminderMutationStatus.ValidationFailed, result.Status);
        Assert.Equal("Recurring events cannot have reminders in this cleanup pass.", result.Error);
    }

    [Fact]
    public async Task CreateReminder_WithImportedEvent_ReturnsValidationError()
    {
        await using var dbContext = CreateDbContext();
        var scheduledEvent = AddEvent(
            dbContext,
            "Imported practice",
            isAllDay: false,
            startsAt: new DateTimeOffset(2026, 4, 15, 9, 0, 0, TimeSpan.Zero),
            sourceKind: EventSourceKinds.GoogleCalendarIcs);

        var service = new EventReminderService(dbContext);
        var result = await service.CreateReminderAsync(
            HouseholdId,
            new CreateEventReminderRequest(scheduledEvent.Id, MinutesBefore: 15),
            CreatedAtUtc,
            CancellationToken.None);

        Assert.Equal(EventReminderMutationStatus.ValidationFailed, result.Status);
        Assert.Equal("Imported calendar events are read-only and cannot have local reminders.", result.Error);
    }

    [Fact]
    public async Task CreateReminder_WithZeroMinutesBefore_ReturnsValidationError()
    {
        await using var dbContext = CreateDbContext();
        var scheduledEvent = AddEvent(dbContext, "Meeting", isAllDay: false,
            startsAt: new DateTimeOffset(2026, 4, 15, 9, 0, 0, TimeSpan.Zero));

        var service = new EventReminderService(dbContext);
        var result = await service.CreateReminderAsync(
            HouseholdId,
            new CreateEventReminderRequest(scheduledEvent.Id, MinutesBefore: 0),
            CreatedAtUtc,
            CancellationToken.None);

        Assert.Equal(EventReminderMutationStatus.ValidationFailed, result.Status);
    }

    [Fact]
    public async Task CreateReminder_WithLeadTimeExceedingMax_ReturnsValidationError()
    {
        await using var dbContext = CreateDbContext();
        var scheduledEvent = AddEvent(dbContext, "Meeting", isAllDay: false,
            startsAt: new DateTimeOffset(2026, 4, 15, 9, 0, 0, TimeSpan.Zero));

        var service = new EventReminderService(dbContext);
        var result = await service.CreateReminderAsync(
            HouseholdId,
            new CreateEventReminderRequest(scheduledEvent.Id, MinutesBefore: 10081),
            CreatedAtUtc,
            CancellationToken.None);

        Assert.Equal(EventReminderMutationStatus.ValidationFailed, result.Status);
    }

    [Fact]
    public async Task CreateReminder_ForEventInDifferentHousehold_ReturnsValidationError()
    {
        await using var dbContext = CreateDbContext();
        var otherHouseholdId = Guid.NewGuid();
        dbContext.Households.Add(new Household
        {
            Id = otherHouseholdId,
            Name = "Other",
            CreatedAtUtc = CreatedAtUtc
        });
        var scheduledEvent = new ScheduledEvent
        {
            Id = Guid.NewGuid(),
            HouseholdId = otherHouseholdId,
            Title = "Private event",
            IsAllDay = false,
            StartsAtUtc = new DateTimeOffset(2026, 4, 15, 9, 0, 0, TimeSpan.Zero),
            CreatedAtUtc = CreatedAtUtc
        };
        dbContext.ScheduledEvents.Add(scheduledEvent);
        dbContext.SaveChanges();

        var service = new EventReminderService(dbContext);
        var result = await service.CreateReminderAsync(
            HouseholdId,
            new CreateEventReminderRequest(scheduledEvent.Id, MinutesBefore: 15),
            CreatedAtUtc,
            CancellationToken.None);

        Assert.Equal(EventReminderMutationStatus.ValidationFailed, result.Status);
    }

    [Fact]
    public async Task FireDueReminders_MarksPendingDueRemindersAsFired()
    {
        await using var dbContext = CreateDbContext();
        var eventStart = new DateTimeOffset(2026, 4, 12, 10, 0, 0, TimeSpan.Zero);
        var scheduledEvent = AddEvent(dbContext, "Checkup", isAllDay: false, startsAt: eventStart);

        var service = new EventReminderService(dbContext);
        await service.CreateReminderAsync(
            HouseholdId,
            new CreateEventReminderRequest(scheduledEvent.Id, MinutesBefore: 30),
            CreatedAtUtc,
            CancellationToken.None);

        // DueAtUtc = 09:30. Fire at 09:30 exactly.
        var asOf = eventStart.AddMinutes(-30);
        var firedCount = await service.FireDueRemindersAsync(asOf, CancellationToken.None);

        Assert.Equal(1, firedCount);
        var reminder = await dbContext.EventReminders.SingleAsync();
        Assert.Equal(EventReminderStatuses.Fired, reminder.Status);
        Assert.Equal(asOf, reminder.FiredAtUtc);
    }

    [Fact]
    public async Task FireDueReminders_IgnoresFutureReminders()
    {
        await using var dbContext = CreateDbContext();
        var eventStart = new DateTimeOffset(2026, 4, 12, 10, 0, 0, TimeSpan.Zero);
        var scheduledEvent = AddEvent(dbContext, "Checkup", isAllDay: false, startsAt: eventStart);

        var service = new EventReminderService(dbContext);
        await service.CreateReminderAsync(
            HouseholdId,
            new CreateEventReminderRequest(scheduledEvent.Id, MinutesBefore: 30),
            CreatedAtUtc,
            CancellationToken.None);

        // DueAtUtc = 09:30. Fire one second before.
        var asOf = eventStart.AddMinutes(-30).AddSeconds(-1);
        var firedCount = await service.FireDueRemindersAsync(asOf, CancellationToken.None);

        Assert.Equal(0, firedCount);
        var reminder = await dbContext.EventReminders.SingleAsync();
        Assert.Equal(EventReminderStatuses.Pending, reminder.Status);
        Assert.Null(reminder.FiredAtUtc);
    }

    [Fact]
    public async Task FireDueReminders_DoesNotRefireAlreadyFiredReminders()
    {
        await using var dbContext = CreateDbContext();
        var eventStart = new DateTimeOffset(2026, 4, 12, 10, 0, 0, TimeSpan.Zero);
        var scheduledEvent = AddEvent(dbContext, "Meeting", isAllDay: false, startsAt: eventStart);

        var service = new EventReminderService(dbContext);
        await service.CreateReminderAsync(
            HouseholdId,
            new CreateEventReminderRequest(scheduledEvent.Id, MinutesBefore: 15),
            CreatedAtUtc,
            CancellationToken.None);

        var asOf = eventStart.AddMinutes(-15);
        await service.FireDueRemindersAsync(asOf, CancellationToken.None);

        // Second call at a later time — already Fired reminder must be ignored.
        var secondFiredCount = await service.FireDueRemindersAsync(
            asOf.AddMinutes(5), CancellationToken.None);

        Assert.Equal(0, secondFiredCount);
    }

    [Fact]
    public async Task FireDueReminders_RemovesOrphanedReminderWithoutFiring()
    {
        await using var dbContext = CreateDbContext();
        dbContext.EventReminders.Add(new EventReminder
        {
            HouseholdId = HouseholdId,
            ScheduledEventId = Guid.NewGuid(),
            EventTitle = "Legacy orphan",
            MinutesBefore = 15,
            DueAtUtc = CreatedAtUtc,
            Status = EventReminderStatuses.Pending,
            CreatedAtUtc = CreatedAtUtc.AddMinutes(-5)
        });
        await dbContext.SaveChangesAsync();

        var service = new EventReminderService(dbContext);
        var firedCount = await service.FireDueRemindersAsync(
            CreatedAtUtc,
            CancellationToken.None);

        Assert.Equal(0, firedCount);
        Assert.Empty(dbContext.EventReminders);
    }

    [Fact]
    public async Task ReconcileEventReminders_WithUpdatedTimedEvent_ResetsReminderSchedule()
    {
        await using var dbContext = CreateDbContext();
        var scheduledEvent = AddEvent(
            dbContext,
            "Dentist",
            isAllDay: false,
            startsAt: new DateTimeOffset(2026, 4, 15, 14, 0, 0, TimeSpan.Zero));

        dbContext.EventReminders.Add(new EventReminder
        {
            HouseholdId = HouseholdId,
            ScheduledEventId = scheduledEvent.Id,
            EventTitle = scheduledEvent.Title,
            MinutesBefore = 30,
            DueAtUtc = scheduledEvent.StartsAtUtc!.Value.AddMinutes(-30),
            Status = EventReminderStatuses.Fired,
            FiredAtUtc = scheduledEvent.StartsAtUtc.Value.AddMinutes(-30),
            CreatedAtUtc = CreatedAtUtc
        });
        await dbContext.SaveChangesAsync();

        scheduledEvent.Title = "Dentist follow-up";
        scheduledEvent.StartsAtUtc = new DateTimeOffset(2026, 4, 16, 16, 0, 0, TimeSpan.Zero);
        await dbContext.SaveChangesAsync();

        var service = new EventReminderService(dbContext);
        await service.ReconcileEventRemindersAsync(
            HouseholdId,
            scheduledEvent.Id,
            CancellationToken.None);

        var reminder = await dbContext.EventReminders.SingleAsync();
        Assert.Equal("Dentist follow-up", reminder.EventTitle);
        Assert.Equal(new DateTimeOffset(2026, 4, 16, 15, 30, 0, TimeSpan.Zero), reminder.DueAtUtc);
        Assert.Equal(EventReminderStatuses.Pending, reminder.Status);
        Assert.Null(reminder.FiredAtUtc);
    }

    [Fact]
    public async Task ReconcileEventReminders_WithUnsupportedEvent_RemovesReminder()
    {
        await using var dbContext = CreateDbContext();
        var scheduledEvent = AddEvent(
            dbContext,
            "Field day",
            isAllDay: false,
            startsAt: new DateTimeOffset(2026, 4, 15, 14, 0, 0, TimeSpan.Zero));

        dbContext.EventReminders.Add(new EventReminder
        {
            HouseholdId = HouseholdId,
            ScheduledEventId = scheduledEvent.Id,
            EventTitle = scheduledEvent.Title,
            MinutesBefore = 30,
            DueAtUtc = scheduledEvent.StartsAtUtc!.Value.AddMinutes(-30),
            Status = EventReminderStatuses.Pending,
            CreatedAtUtc = CreatedAtUtc
        });
        await dbContext.SaveChangesAsync();

        scheduledEvent.IsAllDay = true;
        await dbContext.SaveChangesAsync();

        var service = new EventReminderService(dbContext);
        await service.ReconcileEventRemindersAsync(
            HouseholdId,
            scheduledEvent.Id,
            CancellationToken.None);

        Assert.Empty(dbContext.EventReminders);
    }

    [Fact]
    public async Task ListRemindersAsync_UsesOwnerAwareCapabilities_AndPrunesInvalidRows()
    {
        await using var dbContext = CreateDbContext();
        var scheduledEvent = AddEvent(
            dbContext,
            "Errand",
            isAllDay: false,
            startsAt: new DateTimeOffset(2026, 4, 15, 9, 0, 0, TimeSpan.Zero));

        dbContext.EventReminders.AddRange(
            new EventReminder
            {
                HouseholdId = HouseholdId,
                ScheduledEventId = scheduledEvent.Id,
                EventTitle = scheduledEvent.Title,
                MinutesBefore = 10,
                DueAtUtc = scheduledEvent.StartsAtUtc!.Value.AddMinutes(-10),
                Status = EventReminderStatuses.Pending,
                CreatedAtUtc = CreatedAtUtc
            },
            new EventReminder
            {
                HouseholdId = HouseholdId,
                ScheduledEventId = Guid.NewGuid(),
                EventTitle = "Legacy imported",
                MinutesBefore = 15,
                DueAtUtc = CreatedAtUtc.AddMinutes(15),
                Status = EventReminderStatuses.Pending,
                CreatedAtUtc = CreatedAtUtc
            });
        await dbContext.SaveChangesAsync();

        var service = new EventReminderService(dbContext);
        var ownerList = await service.ListRemindersAsync(
            HouseholdId,
            isOwner: true,
            CancellationToken.None);
        var memberList = await service.ListRemindersAsync(
            HouseholdId,
            isOwner: false,
            CancellationToken.None);

        var ownerReminder = Assert.Single(ownerList.Items);
        Assert.True(ownerReminder.CanDismiss);
        Assert.True(ownerReminder.CanSnooze);
        Assert.True(ownerReminder.CanDelete);

        var memberReminder = Assert.Single(memberList.Items);
        Assert.True(memberReminder.IsReadOnly);
        Assert.False(memberReminder.CanDismiss);
        Assert.False(memberReminder.CanSnooze);
        Assert.False(memberReminder.CanDelete);
        Assert.Single(dbContext.EventReminders);
    }

    [Fact]
    public async Task DeleteReminder_RemovesIt_AndReturnsNotFoundForMissing()
    {
        await using var dbContext = CreateDbContext();
        var eventStart = new DateTimeOffset(2026, 4, 15, 9, 0, 0, TimeSpan.Zero);
        var scheduledEvent = AddEvent(dbContext, "Errand", isAllDay: false, startsAt: eventStart);

        var service = new EventReminderService(dbContext);
        var created = await service.CreateReminderAsync(
            HouseholdId,
            new CreateEventReminderRequest(scheduledEvent.Id, MinutesBefore: 10),
            CreatedAtUtc,
            CancellationToken.None);

        var deleted = await service.DeleteReminderAsync(
            HouseholdId, created.Reminder!.Id, CancellationToken.None);
        var notFound = await service.DeleteReminderAsync(
            HouseholdId, created.Reminder.Id, CancellationToken.None);

        Assert.Equal(EventReminderMutationStatus.Succeeded, deleted.Status);
        Assert.Equal(EventReminderMutationStatus.NotFound, notFound.Status);
        Assert.Empty(dbContext.EventReminders);
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
            CreatedAtUtc = CreatedAtUtc
        });
        dbContext.SaveChanges();
        return dbContext;
    }

    private static ScheduledEvent AddEvent(
        HouseholdOpsDbContext dbContext,
        string title,
        bool isAllDay,
        DateTimeOffset? startsAt,
        EventRecurrencePattern recurrencePattern = EventRecurrencePattern.None,
        string? sourceKind = null)
    {
        var scheduledEvent = new ScheduledEvent
        {
            Id = Guid.NewGuid(),
            HouseholdId = HouseholdId,
            Title = title,
            IsAllDay = isAllDay,
            StartsAtUtc = startsAt,
            RecurrencePattern = recurrencePattern,
            SourceKind = sourceKind,
            CreatedAtUtc = CreatedAtUtc
        };
        dbContext.ScheduledEvents.Add(scheduledEvent);
        dbContext.SaveChanges();
        return scheduledEvent;
    }
}
