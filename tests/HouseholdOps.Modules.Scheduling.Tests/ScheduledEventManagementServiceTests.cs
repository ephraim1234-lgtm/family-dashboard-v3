using HouseholdOps.Infrastructure.Notifications;
using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Infrastructure.Scheduling;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Integrations;
using HouseholdOps.Modules.Integrations.Contracts;
using HouseholdOps.Modules.Notifications;
using HouseholdOps.Modules.Notifications.Contracts;
using HouseholdOps.Modules.Scheduling;
using HouseholdOps.Modules.Scheduling.Contracts;
using HouseholdOps.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HouseholdOps.Modules.Scheduling.Tests;

public class ScheduledEventManagementServiceTests
{
    private static readonly Guid HouseholdId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    private static readonly DateTimeOffset CreatedAtUtc = new(2026, 4, 11, 12, 0, 0, TimeSpan.Zero);
    private static readonly IClock FixedClock = new FakeClock(new DateTimeOffset(2026, 4, 11, 6, 0, 0, TimeSpan.Zero));

    [Fact]
    public async Task OneTimeEvent_CanBeEdited_AndAgendaReflectsChanges()
    {
        await using var dbContext = CreateDbContext();
        var managementService = CreateManagementService(dbContext);
        var agendaQueryService = new AgendaQueryService(dbContext);

        var created = await managementService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Dentist",
                "Initial appointment",
                false,
                new DateTimeOffset(2026, 4, 15, 14, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 15, 15, 0, 0, TimeSpan.Zero),
                null),
            CreatedAtUtc,
            CancellationToken.None);

        var updated = await managementService.UpdateEventAsync(
            HouseholdId,
            created.Event!.Id,
            new UpdateScheduledEventRequest(
                "Dentist follow-up",
                "Updated details",
                false,
                new DateTimeOffset(2026, 4, 16, 16, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 16, 17, 0, 0, TimeSpan.Zero),
                null),
            CancellationToken.None);

        var agenda = await agendaQueryService.GetUpcomingEventsAsync(
            new UpcomingEventsRequest(
                HouseholdId,
                new DateTimeOffset(2026, 4, 15, 0, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 18, 0, 0, 0, TimeSpan.Zero),
                IsOwner: true),
            CancellationToken.None);

        Assert.Equal(ScheduledEventMutationStatus.Succeeded, updated.Status);
        var item = Assert.Single(agenda.Items);
        Assert.Equal("Dentist follow-up", item.Title);
        Assert.Equal(new DateTimeOffset(2026, 4, 16, 16, 0, 0, TimeSpan.Zero), item.StartsAtUtc);
    }

    [Fact]
    public async Task OneTimeEvent_CanBeDeleted_AndAgendaBecomesEmpty()
    {
        await using var dbContext = CreateDbContext();
        var managementService = CreateManagementService(dbContext);
        var agendaQueryService = new AgendaQueryService(dbContext);

        var created = await managementService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Vet visit",
                null,
                false,
                new DateTimeOffset(2026, 4, 15, 9, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 15, 10, 0, 0, TimeSpan.Zero),
                null),
            CreatedAtUtc,
            CancellationToken.None);

        var deleted = await managementService.DeleteEventAsync(
            HouseholdId,
            created.Event!.Id,
            CancellationToken.None);

        var agenda = await agendaQueryService.GetUpcomingEventsAsync(
            new UpcomingEventsRequest(
                HouseholdId,
                new DateTimeOffset(2026, 4, 15, 0, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 18, 0, 0, 0, TimeSpan.Zero),
                IsOwner: true),
            CancellationToken.None);

        Assert.Equal(ScheduledEventMutationStatus.Succeeded, deleted.Status);
        Assert.Empty(agenda.Items);
    }

    [Fact]
    public async Task UpdateEventAsync_ReconcilesAttachedReminderSchedule()
    {
        await using var dbContext = CreateDbContext();
        var managementService = CreateManagementService(dbContext);
        var reminderService = new EventReminderService(dbContext);

        var created = await managementService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Dentist",
                null,
                false,
                new DateTimeOffset(2026, 4, 15, 14, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 15, 15, 0, 0, TimeSpan.Zero),
                null),
            CreatedAtUtc,
            CancellationToken.None);

        await reminderService.CreateReminderAsync(
            HouseholdId,
            new CreateEventReminderRequest(created.Event!.Id, MinutesBefore: 30),
            CreatedAtUtc,
            CancellationToken.None);

        var updated = await managementService.UpdateEventAsync(
            HouseholdId,
            created.Event.Id,
            new UpdateScheduledEventRequest(
                "Dentist updated",
                null,
                false,
                new DateTimeOffset(2026, 4, 16, 16, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 16, 17, 0, 0, TimeSpan.Zero),
                null),
            CancellationToken.None);

        var reminder = await dbContext.EventReminders.SingleAsync();
        Assert.Equal(ScheduledEventMutationStatus.Succeeded, updated.Status);
        Assert.Equal("Dentist updated", reminder.EventTitle);
        Assert.Equal(new DateTimeOffset(2026, 4, 16, 15, 30, 0, TimeSpan.Zero), reminder.DueAtUtc);
        Assert.Equal(EventReminderStatuses.Pending, reminder.Status);
        Assert.Null(reminder.FiredAtUtc);
    }

    [Fact]
    public async Task DeleteEventAsync_RemovesAttachedReminders()
    {
        await using var dbContext = CreateDbContext();
        var managementService = CreateManagementService(dbContext);
        var reminderService = new EventReminderService(dbContext);

        var created = await managementService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Vet visit",
                null,
                false,
                new DateTimeOffset(2026, 4, 15, 9, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 15, 10, 0, 0, TimeSpan.Zero),
                null),
            CreatedAtUtc,
            CancellationToken.None);

        await reminderService.CreateReminderAsync(
            HouseholdId,
            new CreateEventReminderRequest(created.Event!.Id, MinutesBefore: 15),
            CreatedAtUtc,
            CancellationToken.None);

        var deleted = await managementService.DeleteEventAsync(
            HouseholdId,
            created.Event.Id,
            CancellationToken.None);

        Assert.Equal(ScheduledEventMutationStatus.Succeeded, deleted.Status);
        Assert.Empty(dbContext.EventReminders);
    }

    [Fact]
    public async Task DailyRecurringEvent_CanBeEdited_AtSeriesLevel()
    {
        await using var dbContext = CreateDbContext();
        var managementService = CreateManagementService(dbContext);
        var agendaQueryService = new AgendaQueryService(dbContext);

        var created = await managementService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Medication",
                "Original daily reminder",
                false,
                new DateTimeOffset(2026, 4, 11, 8, 30, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 11, 8, 45, 0, TimeSpan.Zero),
                new ScheduledEventRecurrenceRequest("Daily", null, new DateTimeOffset(2026, 4, 17, 8, 30, 0, TimeSpan.Zero))),
            CreatedAtUtc,
            CancellationToken.None);

        var updated = await managementService.UpdateEventAsync(
            HouseholdId,
            created.Event!.Id,
            new UpdateScheduledEventRequest(
                "Medication adjusted",
                "Series updated",
                false,
                new DateTimeOffset(2026, 4, 11, 7, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 11, 7, 15, 0, TimeSpan.Zero),
                new ScheduledEventRecurrenceRequest("Daily", null, new DateTimeOffset(2026, 4, 13, 7, 0, 0, TimeSpan.Zero))),
            CancellationToken.None);

        var agenda = await agendaQueryService.GetUpcomingEventsAsync(
            new UpcomingEventsRequest(
                HouseholdId,
                new DateTimeOffset(2026, 4, 11, 0, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 16, 0, 0, 0, TimeSpan.Zero),
                IsOwner: true),
            CancellationToken.None);

        Assert.Equal(ScheduledEventMutationStatus.Succeeded, updated.Status);
        Assert.Equal(3, agenda.Items.Count);
        Assert.All(agenda.Items, item => Assert.Equal("Medication adjusted", item.Title));
        Assert.Equal(new DateTimeOffset(2026, 4, 11, 7, 0, 0, TimeSpan.Zero), agenda.Items[0].StartsAtUtc);
        Assert.Equal(new DateTimeOffset(2026, 4, 13, 7, 0, 0, TimeSpan.Zero), agenda.Items[^1].StartsAtUtc);
    }

    [Fact]
    public async Task DailyRecurringEvent_CanBeDeleted_AtSeriesLevel()
    {
        await using var dbContext = CreateDbContext();
        var managementService = CreateManagementService(dbContext);
        var agendaQueryService = new AgendaQueryService(dbContext);

        var created = await managementService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Daily tidy",
                null,
                false,
                new DateTimeOffset(2026, 4, 11, 18, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 11, 18, 30, 0, TimeSpan.Zero),
                new ScheduledEventRecurrenceRequest("Daily", null, new DateTimeOffset(2026, 4, 14, 18, 0, 0, TimeSpan.Zero))),
            CreatedAtUtc,
            CancellationToken.None);

        var deleted = await managementService.DeleteEventAsync(
            HouseholdId,
            created.Event!.Id,
            CancellationToken.None);

        var agenda = await agendaQueryService.GetUpcomingEventsAsync(
            new UpcomingEventsRequest(
                HouseholdId,
                new DateTimeOffset(2026, 4, 11, 0, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 16, 0, 0, 0, TimeSpan.Zero),
                IsOwner: true),
            CancellationToken.None);

        Assert.Equal(ScheduledEventMutationStatus.Succeeded, deleted.Status);
        Assert.Empty(agenda.Items);
    }

    [Fact]
    public async Task WeeklyRecurringEvent_CanBeEdited_AndDeleted_AtSeriesLevel()
    {
        await using var dbContext = CreateDbContext();
        var managementService = CreateManagementService(dbContext);
        var agendaQueryService = new AgendaQueryService(dbContext);

        var created = await managementService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "School pickup",
                null,
                false,
                new DateTimeOffset(2026, 4, 6, 15, 30, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 6, 16, 0, 0, TimeSpan.Zero),
                new ScheduledEventRecurrenceRequest("Weekly", new[] { "Monday", "Wednesday" }, null)),
            CreatedAtUtc,
            CancellationToken.None);

        var updated = await managementService.UpdateEventAsync(
            HouseholdId,
            created.Event!.Id,
            new UpdateScheduledEventRequest(
                "Carpool",
                "Series-level weekly update",
                false,
                new DateTimeOffset(2026, 4, 6, 17, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 6, 17, 30, 0, TimeSpan.Zero),
                new ScheduledEventRecurrenceRequest("Weekly", new[] { "Tuesday", "Thursday" }, null)),
            CancellationToken.None);

        var updatedAgenda = await agendaQueryService.GetUpcomingEventsAsync(
            new UpcomingEventsRequest(
                HouseholdId,
                new DateTimeOffset(2026, 4, 13, 0, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 18, 0, 0, 0, TimeSpan.Zero),
                IsOwner: true),
            CancellationToken.None);

        var deleted = await managementService.DeleteEventAsync(
            HouseholdId,
            created.Event.Id,
            CancellationToken.None);

        var emptyAgenda = await agendaQueryService.GetUpcomingEventsAsync(
            new UpcomingEventsRequest(
                HouseholdId,
                new DateTimeOffset(2026, 4, 13, 0, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 18, 0, 0, 0, TimeSpan.Zero),
                IsOwner: true),
            CancellationToken.None);

        Assert.Equal(ScheduledEventMutationStatus.Succeeded, updated.Status);
        Assert.Equal(2, updatedAgenda.Items.Count);
        Assert.Equal(DayOfWeek.Tuesday, updatedAgenda.Items[0].StartsAtUtc!.Value.DayOfWeek);
        Assert.Equal(DayOfWeek.Thursday, updatedAgenda.Items[1].StartsAtUtc!.Value.DayOfWeek);
        Assert.All(updatedAgenda.Items, item => Assert.Equal("Carpool", item.Title));
        Assert.Equal(ScheduledEventMutationStatus.Succeeded, deleted.Status);
        Assert.Empty(emptyAgenda.Items);
    }

    [Fact]
    public async Task ListEventsAsync_ReturnsSeriesRatherThanExpandedOccurrences()
    {
        await using var dbContext = CreateDbContext();
        var managementService = CreateManagementService(dbContext);

        await managementService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Evening review",
                null,
                false,
                new DateTimeOffset(2026, 4, 10, 20, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 10, 20, 30, 0, TimeSpan.Zero),
                new ScheduledEventRecurrenceRequest("Daily", null, new DateTimeOffset(2026, 4, 14, 20, 0, 0, TimeSpan.Zero))),
            CreatedAtUtc,
            CancellationToken.None);

        var listed = await managementService.ListEventsAsync(HouseholdId, CancellationToken.None);

        var item = Assert.Single(listed.Items);
        Assert.True(item.IsRecurring);
        Assert.Equal("Daily", item.RecurrencePattern);
        Assert.Equal("Daily until Apr 14, 2026 8:00 PM UTC", item.RecurrenceSummary);
        Assert.Equal(new DateTimeOffset(2026, 4, 11, 20, 0, 0, TimeSpan.Zero), item.NextOccurrenceStartsAtUtc);
        Assert.Empty(item.WeeklyDays);
    }

    [Fact]
    public async Task BrowseQuery_GroupsOccurrencesByDay_AndIncludesRecurrenceMetadata()
    {
        await using var dbContext = CreateDbContext();
        var managementService = CreateManagementService(dbContext);
        var browseService = new ScheduleBrowseQueryService(dbContext);

        await managementService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Morning routine",
                "Daily household check-in",
                false,
                new DateTimeOffset(2026, 4, 11, 7, 30, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 11, 8, 0, 0, TimeSpan.Zero),
                new ScheduledEventRecurrenceRequest("Daily", null, new DateTimeOffset(2026, 4, 13, 7, 30, 0, TimeSpan.Zero))),
            CreatedAtUtc,
            CancellationToken.None);

        await managementService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Vet visit",
                null,
                false,
                new DateTimeOffset(2026, 4, 12, 15, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 12, 16, 0, 0, TimeSpan.Zero),
                null),
            CreatedAtUtc,
            CancellationToken.None);

        var browse = await browseService.GetUpcomingBrowseAsync(
            new ScheduleBrowseRequest(
                HouseholdId,
                new DateTimeOffset(2026, 4, 11, 0, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 15, 0, 0, 0, TimeSpan.Zero),
                4),
            CancellationToken.None);

        Assert.Equal(3, browse.Days.Count);
        Assert.Equal(4, browse.WindowDays);
        var firstItem = Assert.Single(browse.Days[0].Items);
        Assert.True(firstItem.IsRecurring);
        Assert.Equal("Daily", firstItem.RecurrencePattern);
        Assert.Equal("Daily until Apr 13, 2026 7:30 AM UTC", firstItem.RecurrenceSummary);

        Assert.Equal(2, browse.Days[1].Items.Count);
        var oneTimeItem = browse.Days[1].Items.Single(item => item.Title == "Vet visit");
        Assert.False(oneTimeItem.IsRecurring);
        Assert.Equal("One-time", oneTimeItem.RecurrenceSummary);
    }

    [Fact]
    public async Task BrowseQuery_HonorsExplicitWindowStartAndLength()
    {
        await using var dbContext = CreateDbContext();
        var managementService = CreateManagementService(dbContext);
        var browseService = new ScheduleBrowseQueryService(dbContext);

        await managementService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Daily prep",
                null,
                false,
                new DateTimeOffset(2026, 4, 11, 7, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 11, 7, 30, 0, TimeSpan.Zero),
                new ScheduledEventRecurrenceRequest("Daily", null, new DateTimeOffset(2026, 4, 18, 7, 0, 0, TimeSpan.Zero))),
            CreatedAtUtc,
            CancellationToken.None);

        var browse = await browseService.GetUpcomingBrowseAsync(
            new ScheduleBrowseRequest(
                HouseholdId,
                new DateTimeOffset(2026, 4, 14, 0, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 21, 0, 0, 0, TimeSpan.Zero),
                7),
            CancellationToken.None);

        Assert.Equal(new DateTimeOffset(2026, 4, 14, 0, 0, 0, TimeSpan.Zero), browse.WindowStartUtc);
        Assert.Equal(new DateTimeOffset(2026, 4, 21, 0, 0, 0, TimeSpan.Zero), browse.WindowEndUtc);
        Assert.Equal(7, browse.WindowDays);
        Assert.Equal(new DateOnly(2026, 4, 14), browse.Days[0].Date);
        Assert.Equal(new DateOnly(2026, 4, 18), browse.Days[^1].Date);
    }

    [Fact]
    public async Task AgendaQuery_UsesBackendOwnedCapabilityMetadata_ForOwnersAndMembers()
    {
        await using var dbContext = CreateDbContext();
        var managementService = CreateManagementService(dbContext);
        var agendaQueryService = new AgendaQueryService(dbContext);

        var created = await managementService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Family dinner",
                null,
                false,
                new DateTimeOffset(2026, 4, 15, 18, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 15, 19, 0, 0, TimeSpan.Zero),
                null),
            CreatedAtUtc,
            CancellationToken.None);

        var ownerAgenda = await agendaQueryService.GetUpcomingEventsAsync(
            new UpcomingEventsRequest(
                HouseholdId,
                new DateTimeOffset(2026, 4, 15, 0, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 16, 0, 0, 0, TimeSpan.Zero),
                IsOwner: true),
            CancellationToken.None);

        var memberAgenda = await agendaQueryService.GetUpcomingEventsAsync(
            new UpcomingEventsRequest(
                HouseholdId,
                new DateTimeOffset(2026, 4, 15, 0, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 16, 0, 0, 0, TimeSpan.Zero),
                IsOwner: false),
            CancellationToken.None);

        var ownerItem = Assert.Single(ownerAgenda.Items);
        Assert.True(ownerItem.CanEdit);
        Assert.True(ownerItem.CanDelete);
        Assert.True(ownerItem.CanCreateReminder);
        Assert.True(ownerItem.CanManageReminders);
        Assert.Null(ownerItem.ReminderEligibilityReason);

        var memberItem = Assert.Single(memberAgenda.Items);
        Assert.True(memberItem.IsReadOnly);
        Assert.False(memberItem.CanEdit);
        Assert.False(memberItem.CanDelete);
        Assert.False(memberItem.CanCreateReminder);
        Assert.False(memberItem.CanManageReminders);
        Assert.Equal("Only household owners can manage reminders.", memberItem.ReminderEligibilityReason);
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

    private static ScheduledEventManagementService CreateManagementService(
        HouseholdOpsDbContext dbContext) =>
        new(
            dbContext,
            FixedClock,
            new NoOpGoogleCalendarIntegrationService(),
            new EventReminderService(dbContext));

    private sealed class FakeClock(DateTimeOffset utcNow) : IClock
    {
        public DateTimeOffset UtcNow { get; } = utcNow;
    }

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
