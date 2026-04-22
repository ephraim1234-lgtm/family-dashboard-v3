using HouseholdOps.Infrastructure.Display;
using HouseholdOps.Infrastructure.Notifications;
using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Infrastructure.Scheduling;
using HouseholdOps.Modules.Display;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Integrations;
using HouseholdOps.Modules.Integrations.Contracts;
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
        var schedulingService = CreateManagementService(dbContext, clock);

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
            new AgendaQueryService(dbContext),
            new EventReminderService(dbContext));

        var projection = await projectionService.GetProjectionAsync(
            device.AccessToken,
            CancellationToken.None);

        Assert.NotNull(projection);
        Assert.Equal("FocusNext", projection!.PresentationMode);
        Assert.Equal("Dense", projection.AgendaDensityMode);
        Assert.Equal("UTC", projection.HouseholdTimeZoneId);
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

    [Fact]
    public async Task Projection_PreservesImportedMetadata_AndUsesHouseholdLocalDayLabels()
    {
        var chicagoNow = new DateTimeOffset(2026, 4, 11, 2, 0, 0, TimeSpan.Zero);
        await using var dbContext = CreateDbContext("America/Chicago", chicagoNow);
        var clock = new FakeClock(chicagoNow);
        var managementService = new DisplayManagementService(dbContext, clock);

        var device = await managementService.CreateDeviceAsync(
            HouseholdId,
            "Hallway Display",
            CancellationToken.None);

        dbContext.ScheduledEvents.Add(new ScheduledEvent
        {
            HouseholdId = HouseholdId,
            Title = "Imported practice",
            Description = "Pulled from Google Calendar",
            IsAllDay = false,
            StartsAtUtc = new DateTimeOffset(2026, 4, 11, 3, 0, 0, TimeSpan.Zero),
            EndsAtUtc = new DateTimeOffset(2026, 4, 11, 4, 0, 0, TimeSpan.Zero),
            SourceKind = "GoogleCalendarIcs",
            CreatedAtUtc = chicagoNow
        });
        await dbContext.SaveChangesAsync();

        var projectionService = new DisplayProjectionService(
            dbContext,
            clock,
            new AgendaQueryService(dbContext),
            new EventReminderService(dbContext));

        var projection = await projectionService.GetProjectionAsync(
            device.AccessToken,
            CancellationToken.None);

        Assert.NotNull(projection);
        Assert.Equal("America/Chicago", projection!.HouseholdTimeZoneId);
        var agendaItem = Assert.Single(projection.AgendaSection.Items);
        Assert.True(agendaItem.IsImported);
        Assert.Equal("GoogleCalendarIcs", agendaItem.SourceKind);
        Assert.Single(projection.AgendaSection.UpcomingDays);
        Assert.Equal("Today", projection.AgendaSection.UpcomingDays[0].Label);
    }

    [Fact]
    public async Task Projection_HidesLegacyRemindersForImportedEvents()
    {
        await using var dbContext = CreateDbContext();
        var clock = new FakeClock(ClockNow);
        var managementService = new DisplayManagementService(dbContext, clock);

        var device = await managementService.CreateDeviceAsync(
            HouseholdId,
            "Kitchen Display",
            CancellationToken.None);

        var importedEvent = new ScheduledEvent
        {
            Id = Guid.NewGuid(),
            HouseholdId = HouseholdId,
            Title = "Imported practice",
            IsAllDay = false,
            StartsAtUtc = ClockNow.AddMinutes(20),
            EndsAtUtc = ClockNow.AddMinutes(80),
            SourceKind = "GoogleCalendarIcs",
            CreatedAtUtc = ClockNow
        };
        dbContext.ScheduledEvents.Add(importedEvent);
        dbContext.EventReminders.Add(new Modules.Notifications.EventReminder
        {
            HouseholdId = HouseholdId,
            ScheduledEventId = importedEvent.Id,
            EventTitle = importedEvent.Title,
            MinutesBefore = 15,
            DueAtUtc = ClockNow.AddMinutes(5),
            Status = Modules.Notifications.EventReminderStatuses.Pending,
            CreatedAtUtc = ClockNow
        });
        await dbContext.SaveChangesAsync();

        var projectionService = new DisplayProjectionService(
            dbContext,
            clock,
            new AgendaQueryService(dbContext),
            new EventReminderService(dbContext));

        var projection = await projectionService.GetProjectionAsync(
            device.AccessToken,
            CancellationToken.None);

        Assert.NotNull(projection);
        Assert.Empty(projection!.UpcomingReminders);
    }

    private static HouseholdOpsDbContext CreateDbContext(
        string timeZoneId = "UTC",
        DateTimeOffset? createdAtUtc = null)
    {
        var options = new DbContextOptionsBuilder<HouseholdOpsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;

        var dbContext = new HouseholdOpsDbContext(options);
        dbContext.Households.Add(new Household
        {
            Id = HouseholdId,
            Name = "Display Test Household",
            TimeZoneId = timeZoneId,
            CreatedAtUtc = createdAtUtc ?? ClockNow
        });
        dbContext.SaveChanges();
        return dbContext;
    }

    private sealed class FakeClock(DateTimeOffset utcNow) : IClock
    {
        public DateTimeOffset UtcNow { get; } = utcNow;
    }

    private static ScheduledEventManagementService CreateManagementService(
        HouseholdOpsDbContext dbContext,
        IClock clock) =>
        new(
            dbContext,
            clock,
            new NoOpGoogleCalendarIntegrationService(),
            new EventReminderService(dbContext));

    private sealed class NoOpGoogleCalendarIntegrationService : IGoogleCalendarIntegrationService
    {
        public Task<GoogleCalendarLinkListResponse> ListAsync(Guid householdId, CancellationToken cancellationToken) =>
            Task.FromResult(new GoogleCalendarLinkListResponse([]));

        public GoogleOAuthReadinessResponse GetOAuthReadiness() =>
            new(false, false, false, false, null);

        public Task<GoogleOAuthAccountLinkListResponse> ListOAuthAccountsAsync(Guid householdId, CancellationToken cancellationToken) =>
            Task.FromResult(new GoogleOAuthAccountLinkListResponse([]));

        public Task<GoogleOAuthCalendarListResponse> ListOAuthCalendarsAsync(Guid householdId, CancellationToken cancellationToken) =>
            Task.FromResult(new GoogleOAuthCalendarListResponse([]));

        public GoogleOAuthStartResponse BeginOAuthLink(string state) =>
            new(string.Empty);

        public Task CompleteOAuthLinkAsync(Guid householdId, Guid linkedByUserId, string code, DateTimeOffset completedAtUtc, CancellationToken cancellationToken) =>
            Task.CompletedTask;

        public Task<GoogleCalendarLinkMutationResult> CreateAsync(Guid householdId, CreateGoogleCalendarLinkRequest request, DateTimeOffset createdAtUtc, CancellationToken cancellationToken) =>
            Task.FromResult(GoogleCalendarLinkMutationResult.ValidationFailure("Not used in this test."));

        public Task<GoogleCalendarLinkMutationResult> CreateManagedLinkAsync(Guid householdId, CreateManagedGoogleCalendarLinkRequest request, DateTimeOffset createdAtUtc, CancellationToken cancellationToken) =>
            Task.FromResult(GoogleCalendarLinkMutationResult.ValidationFailure("Not used in this test."));

        public Task<GoogleCalendarLinkMutationResult> DeleteAsync(Guid householdId, Guid linkId, CancellationToken cancellationToken) =>
            Task.FromResult(GoogleCalendarLinkMutationResult.NotFound());

        public Task<GoogleCalendarLinkMutationResult> UpdateSyncSettingsAsync(Guid householdId, Guid linkId, UpdateGoogleCalendarLinkSyncSettingsRequest request, DateTimeOffset requestedAtUtc, CancellationToken cancellationToken) =>
            Task.FromResult(GoogleCalendarLinkMutationResult.NotFound());

        public Task<GoogleCalendarSyncResult> SyncAsync(Guid householdId, Guid linkId, DateTimeOffset requestedAtUtc, CancellationToken cancellationToken) =>
            Task.FromResult(GoogleCalendarSyncResult.NotFound());

        public Task<GoogleCalendarAutoSyncRunResult> SyncDueLinksAsync(DateTimeOffset requestedAtUtc, CancellationToken cancellationToken) =>
            Task.FromResult(new GoogleCalendarAutoSyncRunResult(0, 0, 0));

        public Task QueueLocalEventUpsertAsync(Guid householdId, Guid scheduledEventId, DateTimeOffset queuedAtUtc, CancellationToken cancellationToken) =>
            Task.CompletedTask;

        public Task QueueLocalEventDeletionAsync(Guid householdId, Guid scheduledEventId, DateTimeOffset queuedAtUtc, CancellationToken cancellationToken) =>
            Task.CompletedTask;

        public Task<GoogleCalendarLocalEventSyncRunResult> SyncDueLocalEventsAsync(DateTimeOffset requestedAtUtc, CancellationToken cancellationToken) =>
            Task.FromResult(new GoogleCalendarLocalEventSyncRunResult(0, 0, 0));
    }
}
