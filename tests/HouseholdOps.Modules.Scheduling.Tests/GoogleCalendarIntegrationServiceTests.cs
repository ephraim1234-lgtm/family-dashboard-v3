using HouseholdOps.Infrastructure.Integrations;
using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Infrastructure.Scheduling;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Integrations;
using HouseholdOps.Modules.Integrations.Contracts;
using HouseholdOps.Modules.Scheduling;
using HouseholdOps.Modules.Scheduling.Contracts;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace HouseholdOps.Modules.Scheduling.Tests;

public class GoogleCalendarIntegrationServiceTests
{
    private static readonly Guid HouseholdId = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");
    private static readonly DateTimeOffset CreatedAtUtc = new(2026, 4, 11, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task SyncAsync_ImportsOneTimeEvents_AndSkipsRecurringEntries()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(
            dbContext,
            """
            BEGIN:VCALENDAR
            BEGIN:VEVENT
            UID:first-event
            SUMMARY:Imported dentist
            DESCRIPTION:Bring forms
            DTSTART:20260415T150000Z
            DTEND:20260415T160000Z
            END:VEVENT
            BEGIN:VEVENT
            UID:recurring-event
            SUMMARY:Monthly practice
            DTSTART:20260416T180000Z
            DTEND:20260416T190000Z
            RRULE:FREQ=MONTHLY
            END:VEVENT
            END:VCALENDAR
            """);

        var created = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "School calendar",
                "https://calendar.google.com/calendar/ical/test/basic.ics"),
            CreatedAtUtc,
            CancellationToken.None);

        var synced = await service.SyncAsync(
            HouseholdId,
            created.Link!.Id,
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarSyncResultStatus.Succeeded, synced.Status);
        Assert.Equal(1, synced.Link!.ImportedEventCount);
        Assert.Equal(1, synced.Link.SkippedRecurringEventCount);
        Assert.Equal(CreatedAtUtc.AddMinutes(35), synced.Link.NextSyncDueAtUtc);

        var imported = await dbContext.ScheduledEvents.SingleAsync();
        Assert.Equal("Imported dentist", imported.Title);
        Assert.Equal(EventSourceKinds.GoogleCalendarIcs, imported.SourceKind);
        Assert.Equal(created.Link.Id, imported.SourceCalendarId);
        Assert.Equal("first-event", imported.SourceEventId);
    }

    [Fact]
    public async Task CreateAsync_RejectsDuplicateFeedLink_ForSameHousehold()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(dbContext, "BEGIN:VCALENDAR\r\nEND:VCALENDAR");

        var first = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "School calendar",
                "https://calendar.google.com/calendar/ical/test/basic.ics?foo=1"),
            CreatedAtUtc,
            CancellationToken.None);

        var duplicate = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "School calendar copy",
                "https://calendar.google.com/calendar/ical/test/basic.ics?foo=2"),
            CreatedAtUtc.AddMinutes(1),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarLinkMutationStatus.Succeeded, first.Status);
        Assert.Equal(GoogleCalendarLinkMutationStatus.Duplicate, duplicate.Status);
        Assert.Single(dbContext.GoogleCalendarConnections);
    }

    [Fact]
    public async Task SyncAsync_IsIdempotent_AndRemovesStaleImportedEvents()
    {
        await using var dbContext = CreateDbContext();
        var feedFetcher = new MutableFeedFetcher(
            """
            BEGIN:VCALENDAR
            BEGIN:VEVENT
            UID:first-event
            SUMMARY:First import
            DTSTART:20260415T150000Z
            DTEND:20260415T160000Z
            END:VEVENT
            BEGIN:VEVENT
            UID:second-event
            SUMMARY:Second import
            DTSTART:20260416T170000Z
            DTEND:20260416T180000Z
            END:VEVENT
            END:VCALENDAR
            """);

        var service = new GoogleCalendarIntegrationService(
            dbContext,
            CreateConfiguration(),
            new FakeGoogleOAuthClient(),
            feedFetcher,
            new ImportedScheduledEventSyncService(dbContext));

        var created = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "School calendar",
                "https://calendar.google.com/calendar/ical/test/basic.ics"),
            CreatedAtUtc,
            CancellationToken.None);

        await service.SyncAsync(
            HouseholdId,
            created.Link!.Id,
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        feedFetcher.Content =
            """
            BEGIN:VCALENDAR
            BEGIN:VEVENT
            UID:first-event
            SUMMARY:First import updated
            DTSTART:20260415T153000Z
            DTEND:20260415T163000Z
            END:VEVENT
            END:VCALENDAR
            """;

        var secondSync = await service.SyncAsync(
            HouseholdId,
            created.Link.Id,
            CreatedAtUtc.AddMinutes(10),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarSyncResultStatus.Succeeded, secondSync.Status);
        Assert.Equal(1, secondSync.Link!.ImportedEventCount);

        var importedEvents = await dbContext.ScheduledEvents
            .OrderBy(item => item.Title)
            .ToListAsync();

        var remaining = Assert.Single(importedEvents);
        Assert.Equal("first-event", remaining.SourceEventId);
        Assert.Equal("First import updated", remaining.Title);
        Assert.Equal(new DateTimeOffset(2026, 4, 15, 15, 30, 0, TimeSpan.Zero), remaining.StartsAtUtc);
    }

    [Fact]
    public async Task SyncDueLinksAsync_OnlyProcessesLinksWhoseNextRunIsDue()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(
            dbContext,
            """
            BEGIN:VCALENDAR
            BEGIN:VEVENT
            UID:due-event
            SUMMARY:Due event
            DTSTART:20260415T150000Z
            DTEND:20260415T160000Z
            END:VEVENT
            END:VCALENDAR
            """);

        var dueLink = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "Due calendar",
                "https://calendar.google.com/calendar/ical/test/basic.ics"),
            CreatedAtUtc,
            CancellationToken.None);

        var laterLink = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "Later calendar",
                "https://calendar.google.com/calendar/ical/another/basic.ics"),
            CreatedAtUtc.AddMinutes(1),
            CancellationToken.None);

        var laterEntity = await dbContext.GoogleCalendarConnections
            .SingleAsync(item => item.Id == laterLink.Link!.Id);
        laterEntity.NextSyncDueAtUtc = CreatedAtUtc.AddHours(1);
        await dbContext.SaveChangesAsync();

        var result = await service.SyncDueLinksAsync(
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.Equal(1, result.DueCount);
        Assert.Equal(1, result.SucceededCount);
        Assert.Equal(0, result.FailedCount);
    }

    [Fact]
    public async Task UpdateSyncSettingsAsync_DisablesAutoSync_AndClearsNextDueTime()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(dbContext, "BEGIN:VCALENDAR\r\nEND:VCALENDAR");

        var created = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "School calendar",
                "https://calendar.google.com/calendar/ical/test/basic.ics"),
            CreatedAtUtc,
            CancellationToken.None);

        var updated = await service.UpdateSyncSettingsAsync(
            HouseholdId,
            created.Link!.Id,
            new UpdateGoogleCalendarLinkSyncSettingsRequest(false, 60, false),
            CreatedAtUtc.AddMinutes(2),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarLinkMutationStatus.Succeeded, updated.Status);
        Assert.False(updated.Link!.AutoSyncEnabled);
        Assert.Equal(60, updated.Link.SyncIntervalMinutes);
        Assert.Null(updated.Link.NextSyncDueAtUtc);
    }

    [Fact]
    public async Task UpdateSyncSettingsAsync_EnableAutoSync_ReschedulesNextDueTime()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(dbContext, "BEGIN:VCALENDAR\r\nEND:VCALENDAR");

        var created = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "School calendar",
                "https://calendar.google.com/calendar/ical/test/basic.ics"),
            CreatedAtUtc,
            CancellationToken.None);

        await service.UpdateSyncSettingsAsync(
            HouseholdId,
            created.Link!.Id,
            new UpdateGoogleCalendarLinkSyncSettingsRequest(false, 30, false),
            CreatedAtUtc.AddMinutes(1),
            CancellationToken.None);

        var updated = await service.UpdateSyncSettingsAsync(
            HouseholdId,
            created.Link.Id,
            new UpdateGoogleCalendarLinkSyncSettingsRequest(true, 15, false),
            CreatedAtUtc.AddMinutes(3),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarLinkMutationStatus.Succeeded, updated.Status);
        Assert.True(updated.Link!.AutoSyncEnabled);
        Assert.Equal(15, updated.Link.SyncIntervalMinutes);
        Assert.Equal(CreatedAtUtc.AddMinutes(3), updated.Link.NextSyncDueAtUtc);
    }

    [Fact]
    public async Task SyncDueLinksAsync_IgnoresDisabledAutoSyncLinks()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(
            dbContext,
            """
            BEGIN:VCALENDAR
            BEGIN:VEVENT
            UID:due-event
            SUMMARY:Due event
            DTSTART:20260415T150000Z
            DTEND:20260415T160000Z
            END:VEVENT
            END:VCALENDAR
            """);

        var created = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "Disabled calendar",
                "https://calendar.google.com/calendar/ical/test/basic.ics"),
            CreatedAtUtc,
            CancellationToken.None);

        await service.UpdateSyncSettingsAsync(
            HouseholdId,
            created.Link!.Id,
            new UpdateGoogleCalendarLinkSyncSettingsRequest(false, 30, false),
            CreatedAtUtc.AddMinutes(1),
            CancellationToken.None);

        var result = await service.SyncDueLinksAsync(
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.Equal(0, result.DueCount);
        Assert.Empty(dbContext.ScheduledEvents);
    }

    [Fact]
    public async Task SyncAsync_ParsesTZIDTimesIntoUtc()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(
            dbContext,
            """
            BEGIN:VCALENDAR
            BEGIN:VEVENT
            UID:tzid-event
            SUMMARY:Chicago event
            DTSTART;TZID=America/Chicago:20260415T090000
            DTEND;TZID=America/Chicago:20260415T100000
            END:VEVENT
            END:VCALENDAR
            """);

        var created = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "Chicago calendar",
                "https://calendar.google.com/calendar/ical/test/basic.ics"),
            CreatedAtUtc,
            CancellationToken.None);

        var synced = await service.SyncAsync(
            HouseholdId,
            created.Link!.Id,
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarSyncResultStatus.Succeeded, synced.Status);
        var imported = await dbContext.ScheduledEvents.SingleAsync();
        Assert.Equal(new DateTimeOffset(2026, 4, 15, 14, 0, 0, TimeSpan.Zero), imported.StartsAtUtc);
        Assert.Equal(new DateTimeOffset(2026, 4, 15, 15, 0, 0, TimeSpan.Zero), imported.EndsAtUtc);
    }

    [Fact]
    public async Task SyncAsync_UsesCalendarLevelTimeZone_ForFloatingTimes()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(
            dbContext,
            """
            BEGIN:VCALENDAR
            X-WR-TIMEZONE:America/New_York
            BEGIN:VEVENT
            UID:floating-event
            SUMMARY:Floating eastern event
            DTSTART:20260415T090000
            DTEND:20260415T100000
            END:VEVENT
            END:VCALENDAR
            """);

        var created = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "Eastern calendar",
                "https://calendar.google.com/calendar/ical/test/basic.ics"),
            CreatedAtUtc,
            CancellationToken.None);

        var synced = await service.SyncAsync(
            HouseholdId,
            created.Link!.Id,
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarSyncResultStatus.Succeeded, synced.Status);
        var imported = await dbContext.ScheduledEvents.SingleAsync();
        Assert.Equal(new DateTimeOffset(2026, 4, 15, 13, 0, 0, TimeSpan.Zero), imported.StartsAtUtc);
        Assert.Equal(new DateTimeOffset(2026, 4, 15, 14, 0, 0, TimeSpan.Zero), imported.EndsAtUtc);
    }

    [Fact]
    public async Task SyncAsync_NormalizesPrefixedTZIDFormats()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(
            dbContext,
            """
            BEGIN:VCALENDAR
            BEGIN:VEVENT
            UID:prefixed-tzid-event
            SUMMARY:Prefixed pacific event
            DTSTART;TZID=/freeassociation.sourceforge.net/Tzfile/America/Los_Angeles:20260415T090000
            DTEND;TZID=/freeassociation.sourceforge.net/Tzfile/America/Los_Angeles:20260415T100000
            END:VEVENT
            END:VCALENDAR
            """);

        var created = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "Pacific calendar",
                "https://calendar.google.com/calendar/ical/test/basic.ics"),
            CreatedAtUtc,
            CancellationToken.None);

        var synced = await service.SyncAsync(
            HouseholdId,
            created.Link!.Id,
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarSyncResultStatus.Succeeded, synced.Status);
        var imported = await dbContext.ScheduledEvents.SingleAsync();
        Assert.Equal(new DateTimeOffset(2026, 4, 15, 16, 0, 0, TimeSpan.Zero), imported.StartsAtUtc);
        Assert.Equal(new DateTimeOffset(2026, 4, 15, 17, 0, 0, TimeSpan.Zero), imported.EndsAtUtc);
    }

    [Fact]
    public async Task SyncAsync_ResolvesCommonUsTimeZoneAliases()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(
            dbContext,
            """
            BEGIN:VCALENDAR
            BEGIN:VEVENT
            UID:alias-tzid-event
            SUMMARY:Alias eastern event
            DTSTART;TZID="US/Eastern":20260415T090000
            DTEND;TZID="US/Eastern":20260415T100000
            END:VEVENT
            END:VCALENDAR
            """);

        var created = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "Alias calendar",
                "https://calendar.google.com/calendar/ical/test/basic.ics"),
            CreatedAtUtc,
            CancellationToken.None);

        var synced = await service.SyncAsync(
            HouseholdId,
            created.Link!.Id,
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarSyncResultStatus.Succeeded, synced.Status);
        var imported = await dbContext.ScheduledEvents.SingleAsync();
        Assert.Equal(new DateTimeOffset(2026, 4, 15, 13, 0, 0, TimeSpan.Zero), imported.StartsAtUtc);
        Assert.Equal(new DateTimeOffset(2026, 4, 15, 14, 0, 0, TimeSpan.Zero), imported.EndsAtUtc);
    }

    [Fact]
    public async Task SyncAsync_FailsForInvalidFeed_AndPersistsErrorStatus()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(
            dbContext,
            """
            BEGIN:VCALENDAR
            BEGIN:VEVENT
            UID:broken
            SUMMARY:Broken event
            END:VEVENT
            END:VCALENDAR
            """);

        var created = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "Broken calendar",
                "https://calendar.google.com/calendar/ical/test/basic.ics"),
            CreatedAtUtc,
            CancellationToken.None);

        var synced = await service.SyncAsync(
            HouseholdId,
            created.Link!.Id,
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarSyncResultStatus.Failed, synced.Status);
        Assert.Equal(GoogleCalendarSyncStatuses.Failed, synced.Link!.LastSyncStatus);
        Assert.Contains("none could be imported", synced.Link.LastSyncError!, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("invalid_feed", synced.Link.LastSyncFailureCategory);
        Assert.Contains("iCal URL", synced.Link.LastSyncRecoveryHint!, StringComparison.OrdinalIgnoreCase);
        Assert.Empty(dbContext.ScheduledEvents);
        Assert.Equal(CreatedAtUtc.AddMinutes(35), synced.Link.NextSyncDueAtUtc);
    }

    [Fact]
    public async Task SyncAsync_ClassifiesNetworkFailures_ForRecoveryGuidance()
    {
        await using var dbContext = CreateDbContext();
        var service = new GoogleCalendarIntegrationService(
            dbContext,
            CreateConfiguration(),
            new FakeGoogleOAuthClient(),
            new ThrowingFeedFetcher(new HttpRequestException("Network connection timed out.")),
            new ImportedScheduledEventSyncService(dbContext));

        var created = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "Network calendar",
                "https://calendar.google.com/calendar/ical/test/basic.ics"),
            CreatedAtUtc,
            CancellationToken.None);

        var synced = await service.SyncAsync(
            HouseholdId,
            created.Link!.Id,
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarSyncResultStatus.Failed, synced.Status);
        Assert.Equal("network", synced.Link!.LastSyncFailureCategory);
        Assert.Contains("Retry now", synced.Link.LastSyncRecoveryHint!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateEventAsync_ReturnsReadOnly_ForImportedSeries()
    {
        await using var dbContext = CreateDbContext();
        var importSyncService = new ImportedScheduledEventSyncService(dbContext);
        var schedulingService = new ScheduledEventManagementService(
            dbContext,
            new FakeClock(CreatedAtUtc),
            new NoOpGoogleCalendarIntegrationService());

        await importSyncService.SyncAsync(
            HouseholdId,
            EventSourceKinds.GoogleCalendarIcs,
            Guid.Parse("11111111-1111-1111-1111-111111111111"),
            [
                new ImportedScheduledEvent(
                    "google-1",
                    "Imported concert",
                    null,
                    false,
                    new DateTimeOffset(2026, 4, 20, 19, 0, 0, TimeSpan.Zero),
                    new DateTimeOffset(2026, 4, 20, 21, 0, 0, TimeSpan.Zero),
                    EventRecurrencePattern.None,
                    0,
                    null)
            ],
            CreatedAtUtc,
            CancellationToken.None);

        var imported = await dbContext.ScheduledEvents.SingleAsync();

        var updated = await schedulingService.UpdateEventAsync(
            HouseholdId,
            imported.Id,
            new UpdateScheduledEventRequest(
                "Changed locally",
                null,
                false,
                imported.StartsAtUtc,
                imported.EndsAtUtc,
                null),
            CancellationToken.None);

        Assert.Equal(ScheduledEventMutationStatus.ReadOnly, updated.Status);
    }

    [Fact]
    public async Task DeleteEventAsync_ReturnsReadOnly_ForImportedSeries()
    {
        await using var dbContext = CreateDbContext();
        var importSyncService = new ImportedScheduledEventSyncService(dbContext);
        var schedulingService = new ScheduledEventManagementService(
            dbContext,
            new FakeClock(CreatedAtUtc),
            new NoOpGoogleCalendarIntegrationService());

        await importSyncService.SyncAsync(
            HouseholdId,
            EventSourceKinds.GoogleCalendarIcs,
            Guid.Parse("22222222-2222-2222-2222-222222222222"),
            [
                new ImportedScheduledEvent(
                    "google-2",
                    "Imported festival",
                    null,
                    false,
                    new DateTimeOffset(2026, 4, 21, 19, 0, 0, TimeSpan.Zero),
                    new DateTimeOffset(2026, 4, 21, 21, 0, 0, TimeSpan.Zero),
                    EventRecurrencePattern.None,
                    0,
                    null)
            ],
            CreatedAtUtc,
            CancellationToken.None);

        var imported = await dbContext.ScheduledEvents.SingleAsync();

        var deleted = await schedulingService.DeleteEventAsync(
            HouseholdId,
            imported.Id,
            CancellationToken.None);

        Assert.Equal(ScheduledEventMutationStatus.ReadOnly, deleted.Status);
        Assert.Single(dbContext.ScheduledEvents);
    }

    [Fact]
    public async Task CreateEventAsync_QueuesOutboundSync_AndWorkerCreatesGoogleEvent()
    {
        await using var dbContext = CreateDbContext();
        var oauthClient = new FakeGoogleOAuthClient();
        var service = new GoogleCalendarIntegrationService(
            dbContext,
            CreateConfiguration(),
            oauthClient,
            new FakeFeedFetcher("BEGIN:VCALENDAR\r\nEND:VCALENDAR"),
            new ImportedScheduledEventSyncService(dbContext));
        var managementService = new ScheduledEventManagementService(
            dbContext,
            new FakeClock(CreatedAtUtc),
            service);

        var accountLinkId = await SeedWritableAccountAsync(dbContext);
        var managedLink = await service.CreateManagedLinkAsync(
            HouseholdId,
            new CreateManagedGoogleCalendarLinkRequest(
                accountLinkId,
                "family@example.com",
                "Family Calendar",
                "America/Chicago"),
            CreatedAtUtc,
            CancellationToken.None);

        await service.UpdateSyncSettingsAsync(
            HouseholdId,
            managedLink.Link!.Id,
            new UpdateGoogleCalendarLinkSyncSettingsRequest(true, 30, true),
            CreatedAtUtc,
            CancellationToken.None);

        var created = await managementService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Daily prep",
                "Kitchen reset",
                false,
                new DateTimeOffset(2026, 4, 24, 12, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 24, 12, 30, 0, TimeSpan.Zero),
                new ScheduledEventRecurrenceRequest(
                    "Daily",
                    null,
                    new DateTimeOffset(2026, 4, 26, 12, 0, 0, TimeSpan.Zero))),
            CreatedAtUtc,
            CancellationToken.None);

        var queued = await dbContext.GoogleCalendarLocalEventSyncs.SingleAsync();
        Assert.Equal(GoogleCalendarSyncStatuses.Pending, queued.SyncStatus);
        Assert.Equal(GoogleCalendarSyncOperations.Upsert, queued.PendingOperation);
        Assert.Equal(created.Event!.Id, queued.ScheduledEventId);

        var result = await service.SyncDueLocalEventsAsync(
            CreatedAtUtc.AddMinutes(1),
            CancellationToken.None);

        Assert.Equal(1, result.DueCount);
        Assert.Equal(1, result.SucceededCount);

        var remoteCreate = Assert.Single(oauthClient.CreatedEvents);
        Assert.Equal($"hhops{created.Event.Id:N}", remoteCreate.EventId);
        Assert.Contains(remoteCreate.Recurrence, item => item.Contains("RRULE:FREQ=DAILY", StringComparison.Ordinal));
        Assert.Equal("UTC", remoteCreate.TimeZoneId);
        Assert.Equal(created.Event.Id.ToString("D"), remoteCreate.PrivateExtendedProperties["householdopsScheduledEventId"]);

        var persisted = await dbContext.GoogleCalendarLocalEventSyncs.SingleAsync();
        Assert.Equal(GoogleCalendarSyncStatuses.Succeeded, persisted.SyncStatus);
        Assert.Equal(GoogleCalendarSyncOperations.None, persisted.PendingOperation);
        Assert.NotNull(persisted.LastSucceededAtUtc);
        Assert.Null(persisted.LastError);
    }

    [Fact]
    public async Task UpdateEventAsync_QueuesOutboundSync_AndWorkerUpdatesGoogleEvent()
    {
        await using var dbContext = CreateDbContext();
        var oauthClient = new FakeGoogleOAuthClient();
        var service = new GoogleCalendarIntegrationService(
            dbContext,
            CreateConfiguration(),
            oauthClient,
            new FakeFeedFetcher("BEGIN:VCALENDAR\r\nEND:VCALENDAR"),
            new ImportedScheduledEventSyncService(dbContext));
        var managementService = new ScheduledEventManagementService(
            dbContext,
            new FakeClock(CreatedAtUtc),
            service);

        var accountLinkId = await SeedWritableAccountAsync(dbContext);
        var managedLink = await service.CreateManagedLinkAsync(
            HouseholdId,
            new CreateManagedGoogleCalendarLinkRequest(
                accountLinkId,
                "family@example.com",
                "Family Calendar",
                "America/Chicago"),
            CreatedAtUtc,
            CancellationToken.None);

        await service.UpdateSyncSettingsAsync(
            HouseholdId,
            managedLink.Link!.Id,
            new UpdateGoogleCalendarLinkSyncSettingsRequest(true, 30, true),
            CreatedAtUtc,
            CancellationToken.None);

        var created = await managementService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "School pickup",
                null,
                false,
                new DateTimeOffset(2026, 4, 24, 20, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 24, 20, 30, 0, TimeSpan.Zero),
                null),
            CreatedAtUtc,
            CancellationToken.None);

        await service.SyncDueLocalEventsAsync(
            CreatedAtUtc.AddMinutes(1),
            CancellationToken.None);

        oauthClient.CreatedEvents.Clear();

        var updated = await managementService.UpdateEventAsync(
            HouseholdId,
            created.Event!.Id,
            new UpdateScheduledEventRequest(
                "School pickup updated",
                "Bring snacks",
                false,
                new DateTimeOffset(2026, 4, 24, 20, 30, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 24, 21, 0, 0, TimeSpan.Zero),
                null),
            CancellationToken.None);

        var queued = await dbContext.GoogleCalendarLocalEventSyncs.SingleAsync();
        Assert.Equal(GoogleCalendarSyncStatuses.Pending, queued.SyncStatus);
        Assert.Equal(GoogleCalendarSyncOperations.Upsert, queued.PendingOperation);

        var result = await service.SyncDueLocalEventsAsync(
            CreatedAtUtc.AddMinutes(2),
            CancellationToken.None);

        Assert.Equal(1, result.DueCount);
        Assert.Equal(1, result.SucceededCount);
        Assert.Empty(oauthClient.CreatedEvents);
        var persisted = await dbContext.GoogleCalendarLocalEventSyncs.SingleAsync();
        Assert.Equal(GoogleCalendarSyncStatuses.Succeeded, persisted.SyncStatus);
        Assert.Equal($"hhops{updated.Event!.Id:N}", persisted.RemoteEventId);
    }

    [Fact]
    public async Task DeleteEventAsync_QueuesOutboundDelete_AndWorkerDeletesGoogleEvent()
    {
        await using var dbContext = CreateDbContext();
        var oauthClient = new FakeGoogleOAuthClient();
        var service = new GoogleCalendarIntegrationService(
            dbContext,
            CreateConfiguration(),
            oauthClient,
            new FakeFeedFetcher("BEGIN:VCALENDAR\r\nEND:VCALENDAR"),
            new ImportedScheduledEventSyncService(dbContext));
        var managementService = new ScheduledEventManagementService(
            dbContext,
            new FakeClock(CreatedAtUtc),
            service);

        var accountLinkId = await SeedWritableAccountAsync(dbContext);
        var managedLink = await service.CreateManagedLinkAsync(
            HouseholdId,
            new CreateManagedGoogleCalendarLinkRequest(
                accountLinkId,
                "family@example.com",
                "Family Calendar",
                "America/Chicago"),
            CreatedAtUtc,
            CancellationToken.None);

        await service.UpdateSyncSettingsAsync(
            HouseholdId,
            managedLink.Link!.Id,
            new UpdateGoogleCalendarLinkSyncSettingsRequest(true, 30, true),
            CreatedAtUtc,
            CancellationToken.None);

        var created = await managementService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Dentist",
                null,
                false,
                new DateTimeOffset(2026, 4, 24, 14, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 24, 15, 0, 0, TimeSpan.Zero),
                null),
            CreatedAtUtc,
            CancellationToken.None);

        await service.SyncDueLocalEventsAsync(
            CreatedAtUtc.AddMinutes(1),
            CancellationToken.None);

        var deleted = await managementService.DeleteEventAsync(
            HouseholdId,
            created.Event!.Id,
            CancellationToken.None);

        Assert.Equal(ScheduledEventMutationStatus.Succeeded, deleted.Status);
        var pendingDelete = await dbContext.GoogleCalendarLocalEventSyncs.SingleAsync();
        Assert.Equal(GoogleCalendarSyncOperations.Delete, pendingDelete.PendingOperation);

        var result = await service.SyncDueLocalEventsAsync(
            CreatedAtUtc.AddMinutes(2),
            CancellationToken.None);

        Assert.Equal(1, result.DueCount);
        Assert.Equal(1, result.SucceededCount);
        Assert.Empty(dbContext.GoogleCalendarLocalEventSyncs);
    }

    [Fact]
    public async Task SyncDueLocalEventsAsync_TreatsMissingRemoteDelete_AsSuccessfulCleanup()
    {
        await using var dbContext = CreateDbContext();
        var oauthClient = new FakeGoogleOAuthClient(
            deleteCalendarEventException: new GoogleOAuthClientException("missing", 404));
        var service = new GoogleCalendarIntegrationService(
            dbContext,
            CreateConfiguration(),
            oauthClient,
            new FakeFeedFetcher("BEGIN:VCALENDAR\r\nEND:VCALENDAR"),
            new ImportedScheduledEventSyncService(dbContext));
        var managementService = new ScheduledEventManagementService(
            dbContext,
            new FakeClock(CreatedAtUtc),
            service);

        var accountLinkId = await SeedWritableAccountAsync(dbContext);
        var managedLink = await service.CreateManagedLinkAsync(
            HouseholdId,
            new CreateManagedGoogleCalendarLinkRequest(
                accountLinkId,
                "family@example.com",
                "Family Calendar",
                "America/Chicago"),
            CreatedAtUtc,
            CancellationToken.None);

        await service.UpdateSyncSettingsAsync(
            HouseholdId,
            managedLink.Link!.Id,
            new UpdateGoogleCalendarLinkSyncSettingsRequest(true, 30, true),
            CreatedAtUtc,
            CancellationToken.None);

        var created = await managementService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Doctor",
                null,
                false,
                new DateTimeOffset(2026, 4, 24, 18, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 24, 18, 30, 0, TimeSpan.Zero),
                null),
            CreatedAtUtc,
            CancellationToken.None);

        await service.SyncDueLocalEventsAsync(
            CreatedAtUtc.AddMinutes(1),
            CancellationToken.None);

        await managementService.DeleteEventAsync(
            HouseholdId,
            created.Event!.Id,
            CancellationToken.None);

        var result = await service.SyncDueLocalEventsAsync(
            CreatedAtUtc.AddMinutes(2),
            CancellationToken.None);

        Assert.Equal(1, result.DueCount);
        Assert.Equal(1, result.SucceededCount);
        Assert.Empty(dbContext.GoogleCalendarLocalEventSyncs);
    }

    [Fact]
    public async Task SyncDueLocalEventsAsync_PersistsFailure_ForRetry()
    {
        await using var dbContext = CreateDbContext();
        var oauthClient = new FakeGoogleOAuthClient(
            createCalendarEventException: new InvalidOperationException("temporary network failure"));
        var service = new GoogleCalendarIntegrationService(
            dbContext,
            CreateConfiguration(),
            oauthClient,
            new FakeFeedFetcher("BEGIN:VCALENDAR\r\nEND:VCALENDAR"),
            new ImportedScheduledEventSyncService(dbContext));
        var managementService = new ScheduledEventManagementService(
            dbContext,
            new FakeClock(CreatedAtUtc),
            service);

        var accountLinkId = await SeedWritableAccountAsync(dbContext);
        var managedLink = await service.CreateManagedLinkAsync(
            HouseholdId,
            new CreateManagedGoogleCalendarLinkRequest(
                accountLinkId,
                "family@example.com",
                "Family Calendar",
                "America/Chicago"),
            CreatedAtUtc,
            CancellationToken.None);

        await service.UpdateSyncSettingsAsync(
            HouseholdId,
            managedLink.Link!.Id,
            new UpdateGoogleCalendarLinkSyncSettingsRequest(true, 30, true),
            CreatedAtUtc,
            CancellationToken.None);

        await managementService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Bus stop",
                null,
                false,
                new DateTimeOffset(2026, 4, 24, 11, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 24, 11, 15, 0, TimeSpan.Zero),
                null),
            CreatedAtUtc,
            CancellationToken.None);

        var result = await service.SyncDueLocalEventsAsync(
            CreatedAtUtc.AddMinutes(1),
            CancellationToken.None);

        Assert.Equal(1, result.FailedCount);
        var failed = await dbContext.GoogleCalendarLocalEventSyncs.SingleAsync();
        Assert.Equal(GoogleCalendarSyncStatuses.Failed, failed.SyncStatus);
        Assert.Equal(GoogleCalendarSyncOperations.Upsert, failed.PendingOperation);
        Assert.Contains("temporary network failure", failed.LastError!, StringComparison.OrdinalIgnoreCase);
        Assert.NotNull(failed.NextAttemptAtUtc);
        Assert.True(failed.NextAttemptAtUtc > CreatedAtUtc.AddMinutes(1));
    }

    [Fact]
    public async Task UpdateSyncSettingsAsync_RejectsOutboundTarget_WhenLinkedAccountLacksWriteScope()
    {
        await using var dbContext = CreateDbContext();
        var accountLinkId = await SeedReadonlyAccountAsync(dbContext);
        var service = CreateService(dbContext, "BEGIN:VCALENDAR\r\nEND:VCALENDAR");

        var managedLink = await service.CreateManagedLinkAsync(
            HouseholdId,
            new CreateManagedGoogleCalendarLinkRequest(
                accountLinkId,
                "readonly@example.com",
                "Read-only Calendar",
                "America/Chicago"),
            CreatedAtUtc,
            CancellationToken.None);

        var updated = await service.UpdateSyncSettingsAsync(
            HouseholdId,
            managedLink.Link!.Id,
            new UpdateGoogleCalendarLinkSyncSettingsRequest(true, 30, true),
            CreatedAtUtc.AddMinutes(1),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarLinkMutationStatus.ValidationFailed, updated.Status);
        Assert.Contains("Reconnect", updated.Error!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SyncDueLocalEventsAsync_ExportsWeeklyRecurrenceRule_ForLocalSeries()
    {
        await using var dbContext = CreateDbContext();
        var oauthClient = new FakeGoogleOAuthClient();
        var service = new GoogleCalendarIntegrationService(
            dbContext,
            CreateConfiguration(),
            oauthClient,
            new FakeFeedFetcher("BEGIN:VCALENDAR\r\nEND:VCALENDAR"),
            new ImportedScheduledEventSyncService(dbContext));
        var managementService = new ScheduledEventManagementService(
            dbContext,
            new FakeClock(CreatedAtUtc),
            service);

        var household = await dbContext.Households.SingleAsync();
        household.TimeZoneId = "America/Chicago";
        await dbContext.SaveChangesAsync();

        var accountLinkId = await SeedWritableAccountAsync(dbContext);
        var managedLink = await service.CreateManagedLinkAsync(
            HouseholdId,
            new CreateManagedGoogleCalendarLinkRequest(
                accountLinkId,
                "family@example.com",
                "Family Calendar",
                "America/Chicago"),
            CreatedAtUtc,
            CancellationToken.None);

        await service.UpdateSyncSettingsAsync(
            HouseholdId,
            managedLink.Link!.Id,
            new UpdateGoogleCalendarLinkSyncSettingsRequest(true, 30, true),
            CreatedAtUtc,
            CancellationToken.None);

        await managementService.CreateEventAsync(
            HouseholdId,
            new CreateScheduledEventRequest(
                "Carpool",
                null,
                false,
                new DateTimeOffset(2026, 4, 27, 21, 0, 0, TimeSpan.Zero),
                new DateTimeOffset(2026, 4, 27, 21, 30, 0, TimeSpan.Zero),
                new ScheduledEventRecurrenceRequest("Weekly", ["Monday", "Wednesday"], null)),
            CreatedAtUtc,
            CancellationToken.None);

        await service.SyncDueLocalEventsAsync(
            CreatedAtUtc.AddMinutes(1),
            CancellationToken.None);

        var remoteCreate = Assert.Single(oauthClient.CreatedEvents);
        Assert.Contains("RRULE:FREQ=WEEKLY;BYDAY=MO,WE", remoteCreate.Recurrence);
        Assert.Equal("America/Chicago", remoteCreate.TimeZoneId);
    }

    [Fact]
    public async Task SyncAsync_ImportsSupportedDailyRecurringEvents()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(
            dbContext,
            """
            BEGIN:VCALENDAR
            BEGIN:VEVENT
            UID:daily-event
            SUMMARY:Daily prep
            DTSTART:20260415T070000Z
            DTEND:20260415T073000Z
            RRULE:FREQ=DAILY;UNTIL=20260417T070000Z
            END:VEVENT
            END:VCALENDAR
            """);

        var created = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "Daily calendar",
                "https://calendar.google.com/calendar/ical/test/basic.ics"),
            CreatedAtUtc,
            CancellationToken.None);

        var synced = await service.SyncAsync(
            HouseholdId,
            created.Link!.Id,
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarSyncResultStatus.Succeeded, synced.Status);
        Assert.Equal(0, synced.Link!.SkippedRecurringEventCount);

        var imported = await dbContext.ScheduledEvents.SingleAsync();
        Assert.Equal(EventRecurrencePattern.Daily, imported.RecurrencePattern);
        Assert.Equal(new DateTimeOffset(2026, 4, 17, 7, 0, 0, TimeSpan.Zero), imported.RecursUntilUtc);
    }

    [Fact]
    public async Task SyncAsync_ImportsSupportedDailyRecurringEvents_WithCount()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(
            dbContext,
            """
            BEGIN:VCALENDAR
            BEGIN:VEVENT
            UID:daily-count-event
            SUMMARY:Daily count prep
            DTSTART:20260415T070000Z
            DTEND:20260415T073000Z
            RRULE:FREQ=DAILY;COUNT=3
            END:VEVENT
            END:VCALENDAR
            """);

        var created = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "Daily count calendar",
                "https://calendar.google.com/calendar/ical/test/basic.ics"),
            CreatedAtUtc,
            CancellationToken.None);

        var synced = await service.SyncAsync(
            HouseholdId,
            created.Link!.Id,
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarSyncResultStatus.Succeeded, synced.Status);
        var imported = await dbContext.ScheduledEvents.SingleAsync();
        Assert.Equal(EventRecurrencePattern.Daily, imported.RecurrencePattern);
        Assert.Equal(new DateTimeOffset(2026, 4, 17, 7, 0, 0, TimeSpan.Zero), imported.RecursUntilUtc);
    }

    [Fact]
    public async Task SyncAsync_ImportsSupportedWeeklyRecurringEvents()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(
            dbContext,
            """
            BEGIN:VCALENDAR
            BEGIN:VEVENT
            UID:weekly-event
            SUMMARY:Pickup
            DTSTART:20260413T210000Z
            DTEND:20260413T213000Z
            RRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20260422T210000Z
            END:VEVENT
            END:VCALENDAR
            """);

        var created = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "Weekly calendar",
                "https://calendar.google.com/calendar/ical/test/basic.ics"),
            CreatedAtUtc,
            CancellationToken.None);

        var synced = await service.SyncAsync(
            HouseholdId,
            created.Link!.Id,
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarSyncResultStatus.Succeeded, synced.Status);
        var imported = await dbContext.ScheduledEvents.SingleAsync();
        Assert.Equal(EventRecurrencePattern.Weekly, imported.RecurrencePattern);
        Assert.Equal(
            (int)(WeeklyDayMask.Monday | WeeklyDayMask.Wednesday),
            imported.WeeklyDaysMask);
    }

    [Fact]
    public async Task SyncAsync_ImportsSupportedWeeklyRecurringEvents_WithCount()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(
            dbContext,
            """
            BEGIN:VCALENDAR
            BEGIN:VEVENT
            UID:weekly-count-event
            SUMMARY:Pickup count
            DTSTART:20260413T210000Z
            DTEND:20260413T213000Z
            RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4
            END:VEVENT
            END:VCALENDAR
            """);

        var created = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "Weekly count calendar",
                "https://calendar.google.com/calendar/ical/test/basic.ics"),
            CreatedAtUtc,
            CancellationToken.None);

        var synced = await service.SyncAsync(
            HouseholdId,
            created.Link!.Id,
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarSyncResultStatus.Succeeded, synced.Status);
        var imported = await dbContext.ScheduledEvents.SingleAsync();
        Assert.Equal(EventRecurrencePattern.Weekly, imported.RecurrencePattern);
        Assert.Equal(
            (int)(WeeklyDayMask.Monday | WeeklyDayMask.Wednesday),
            imported.WeeklyDaysMask);
        Assert.Equal(new DateTimeOffset(2026, 4, 22, 21, 0, 0, TimeSpan.Zero), imported.RecursUntilUtc);
    }

    [Fact]
    public async Task SyncAsync_UsesEarlierUntilWhenCountAndUntilAreBothPresent()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(
            dbContext,
            """
            BEGIN:VCALENDAR
            BEGIN:VEVENT
            UID:daily-count-until-event
            SUMMARY:Daily capped prep
            DTSTART:20260415T070000Z
            DTEND:20260415T073000Z
            RRULE:FREQ=DAILY;COUNT=10;UNTIL=20260417T070000Z
            END:VEVENT
            END:VCALENDAR
            """);

        var created = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "Daily capped calendar",
                "https://calendar.google.com/calendar/ical/test/basic.ics"),
            CreatedAtUtc,
            CancellationToken.None);

        var synced = await service.SyncAsync(
            HouseholdId,
            created.Link!.Id,
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarSyncResultStatus.Succeeded, synced.Status);
        var imported = await dbContext.ScheduledEvents.SingleAsync();
        Assert.Equal(new DateTimeOffset(2026, 4, 17, 7, 0, 0, TimeSpan.Zero), imported.RecursUntilUtc);
    }

    [Fact]
    public async Task SyncAsync_SkipsUnsupportedRecurringPatterns()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(
            dbContext,
            """
            BEGIN:VCALENDAR
            BEGIN:VEVENT
            UID:monthly-event
            SUMMARY:Monthly event
            DTSTART:20260415T150000Z
            DTEND:20260415T160000Z
            RRULE:FREQ=MONTHLY
            END:VEVENT
            END:VCALENDAR
            """);

        var created = await service.CreateAsync(
            HouseholdId,
            new CreateGoogleCalendarLinkRequest(
                "Monthly calendar",
                "https://calendar.google.com/calendar/ical/test/basic.ics"),
            CreatedAtUtc,
            CancellationToken.None);

        var synced = await service.SyncAsync(
            HouseholdId,
            created.Link!.Id,
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarSyncResultStatus.Succeeded, synced.Status);
        Assert.Equal(0, synced.Link!.ImportedEventCount);
        Assert.Equal(1, synced.Link.SkippedRecurringEventCount);
        Assert.Empty(dbContext.ScheduledEvents);
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
            Name = "Integration Test Household",
            CreatedAtUtc = CreatedAtUtc
        });
        dbContext.SaveChanges();
        return dbContext;
    }

    private static GoogleCalendarIntegrationService CreateService(
        HouseholdOpsDbContext dbContext,
        string feedContent)
    {
        return new GoogleCalendarIntegrationService(
            dbContext,
            CreateConfiguration(),
            new FakeGoogleOAuthClient(),
            new FakeFeedFetcher(feedContent),
            new ImportedScheduledEventSyncService(dbContext));
    }

    private static async Task<Guid> SeedWritableAccountAsync(HouseholdOpsDbContext dbContext)
    {
        var accountLinkId = Guid.NewGuid();
        dbContext.GoogleOAuthAccountLinks.Add(new GoogleOAuthAccountLink
        {
            Id = accountLinkId,
            HouseholdId = HouseholdId,
            LinkedByUserId = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            GoogleUserId = $"google-user-{accountLinkId:N}",
            Email = $"owner-{accountLinkId:N}@example.com",
            DisplayName = "Owner Example",
            AccessToken = "access-token",
            RefreshToken = "refresh-token",
            TokenType = "Bearer",
            Scope = "openid email profile https://www.googleapis.com/auth/calendar",
            AccessTokenExpiresAtUtc = CreatedAtUtc.AddHours(1),
            CreatedAtUtc = CreatedAtUtc,
            UpdatedAtUtc = CreatedAtUtc
        });
        await dbContext.SaveChangesAsync();
        return accountLinkId;
    }

    private static async Task<Guid> SeedReadonlyAccountAsync(HouseholdOpsDbContext dbContext)
    {
        var accountLinkId = Guid.NewGuid();
        dbContext.GoogleOAuthAccountLinks.Add(new GoogleOAuthAccountLink
        {
            Id = accountLinkId,
            HouseholdId = HouseholdId,
            LinkedByUserId = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            GoogleUserId = $"google-user-{accountLinkId:N}",
            Email = $"owner-{accountLinkId:N}@example.com",
            DisplayName = "Owner Example",
            AccessToken = "access-token",
            RefreshToken = "refresh-token",
            TokenType = "Bearer",
            Scope = "openid email profile https://www.googleapis.com/auth/calendar.readonly",
            AccessTokenExpiresAtUtc = CreatedAtUtc.AddHours(1),
            CreatedAtUtc = CreatedAtUtc,
            UpdatedAtUtc = CreatedAtUtc
        });
        await dbContext.SaveChangesAsync();
        return accountLinkId;
    }

    [Fact]
    public void GetOAuthReadiness_ReflectsConfiguredEnvironmentValues()
    {
        using var dbContext = CreateDbContext();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["GOOGLE_CLIENT_ID"] = "client-id",
                ["GOOGLE_CLIENT_SECRET"] = "client-secret",
                ["GOOGLE_OAUTH_REDIRECT_URI"] = "http://localhost:3000/api/integrations/google-oauth/callback"
            })
            .Build();

        var service = new GoogleCalendarIntegrationService(
            dbContext,
            configuration,
            new FakeGoogleOAuthClient(),
            new FakeFeedFetcher("BEGIN:VCALENDAR\r\nEND:VCALENDAR"),
            new ImportedScheduledEventSyncService(dbContext));

        var readiness = service.GetOAuthReadiness();

        Assert.True(readiness.HasClientId);
        Assert.True(readiness.HasClientSecret);
        Assert.True(readiness.HasRedirectUri);
        Assert.True(readiness.IsReady);
        Assert.Equal(
            "http://localhost:3000/api/integrations/google-oauth/callback",
            readiness.ConfiguredRedirectUri);
    }

    [Fact]
    public async Task CompleteOAuthLinkAsync_CreatesOrUpdatesLinkedGoogleAccount()
    {
        await using var dbContext = CreateDbContext();
        var service = new GoogleCalendarIntegrationService(
            dbContext,
            CreateConfiguration(),
            new FakeGoogleOAuthClient(
                new GoogleOAuthTokenResult(
                    "access-token",
                    "Bearer",
                    3600,
                    "openid email profile https://www.googleapis.com/auth/calendar.readonly",
                    "refresh-token"),
                new GoogleOAuthUserProfile(
                    "google-user-1",
                    "owner@example.com",
                    "Owner Example")),
            new FakeFeedFetcher("BEGIN:VCALENDAR\r\nEND:VCALENDAR"),
            new ImportedScheduledEventSyncService(dbContext));

        await service.CompleteOAuthLinkAsync(
            HouseholdId,
            Guid.Parse("33333333-3333-3333-3333-333333333333"),
            "auth-code",
            CreatedAtUtc,
            CancellationToken.None);

        var linked = await dbContext.GoogleOAuthAccountLinks.SingleAsync();
        Assert.Equal(HouseholdId, linked.HouseholdId);
        Assert.Equal("google-user-1", linked.GoogleUserId);
        Assert.Equal("owner@example.com", linked.Email);
        Assert.Equal("refresh-token", linked.RefreshToken);
    }

    [Fact]
    public async Task ListOAuthCalendarsAsync_UsesLinkedAccountAndRefreshesExpiredToken()
    {
        await using var dbContext = CreateDbContext();
        dbContext.GoogleOAuthAccountLinks.Add(new GoogleOAuthAccountLink
        {
            HouseholdId = HouseholdId,
            LinkedByUserId = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            GoogleUserId = "google-user-1",
            Email = "owner@example.com",
            DisplayName = "Owner Example",
            AccessToken = "expired-access-token",
            RefreshToken = "refresh-token",
            TokenType = "Bearer",
            Scope = "openid email profile https://www.googleapis.com/auth/calendar.readonly",
            AccessTokenExpiresAtUtc = CreatedAtUtc.AddMinutes(-5),
            CreatedAtUtc = CreatedAtUtc,
            UpdatedAtUtc = CreatedAtUtc
        });
        await dbContext.SaveChangesAsync();

        var oauthClient = new FakeGoogleOAuthClient(
            new GoogleOAuthTokenResult(
                "fresh-access-token",
                "Bearer",
                3600,
                "openid email profile https://www.googleapis.com/auth/calendar.readonly",
                "refresh-token"),
            new GoogleOAuthUserProfile(
                "google-user-1",
                "owner@example.com",
                "Owner Example"),
            [
                new GoogleOAuthCalendarSummary(
                    "primary-calendar",
                    "Family Calendar",
                    true,
                    "owner",
                    "America/Chicago")
            ]);

        var service = new GoogleCalendarIntegrationService(
            dbContext,
            CreateConfiguration(),
            oauthClient,
            new FakeFeedFetcher("BEGIN:VCALENDAR\r\nEND:VCALENDAR"),
            new ImportedScheduledEventSyncService(dbContext));

        var calendars = await service.ListOAuthCalendarsAsync(
            HouseholdId,
            CancellationToken.None);

        var calendar = Assert.Single(calendars.Items);
        Assert.Equal("owner@example.com", calendar.AccountEmail);
        Assert.Equal("Family Calendar", calendar.DisplayName);
        Assert.True(calendar.IsPrimary);

        var linked = await dbContext.GoogleOAuthAccountLinks.SingleAsync();
        Assert.Equal("fresh-access-token", linked.AccessToken);
        Assert.Equal(1, oauthClient.RefreshCalls);
    }

    [Fact]
    public async Task CreateManagedLinkAsync_CreatesManagedGoogleCalendarLink_AndRejectsDuplicates()
    {
        await using var dbContext = CreateDbContext();
        var accountLinkId = Guid.Parse("55555555-5555-5555-5555-555555555555");
        dbContext.GoogleOAuthAccountLinks.Add(new GoogleOAuthAccountLink
        {
            Id = accountLinkId,
            HouseholdId = HouseholdId,
            LinkedByUserId = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            GoogleUserId = "google-user-1",
            Email = "owner@example.com",
            DisplayName = "Owner Example",
            AccessToken = "access-token",
            RefreshToken = "refresh-token",
            TokenType = "Bearer",
            Scope = "openid email profile https://www.googleapis.com/auth/calendar.readonly",
            AccessTokenExpiresAtUtc = CreatedAtUtc.AddHours(1),
            CreatedAtUtc = CreatedAtUtc,
            UpdatedAtUtc = CreatedAtUtc
        });
        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext, "BEGIN:VCALENDAR\r\nEND:VCALENDAR");

        var created = await service.CreateManagedLinkAsync(
            HouseholdId,
            new CreateManagedGoogleCalendarLinkRequest(
                accountLinkId,
                "family@example.com",
                "Family Calendar",
                "America/Chicago"),
            CreatedAtUtc,
            CancellationToken.None);

        var duplicate = await service.CreateManagedLinkAsync(
            HouseholdId,
            new CreateManagedGoogleCalendarLinkRequest(
                accountLinkId,
                "family@example.com",
                "Family Calendar",
                "America/Chicago"),
            CreatedAtUtc.AddMinutes(1),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarLinkMutationStatus.Succeeded, created.Status);
        Assert.Equal("OAuthCalendar", created.Link!.LinkMode);
        Assert.Equal(accountLinkId, created.Link.GoogleOAuthAccountLinkId);
        Assert.Equal("family@example.com", created.Link.GoogleCalendarId);
        Assert.Equal(GoogleCalendarLinkMutationStatus.Duplicate, duplicate.Status);
    }

    [Fact]
    public async Task SyncAsync_ImportsManagedOAuthCalendarEvents()
    {
        await using var dbContext = CreateDbContext();
        var accountLinkId = Guid.Parse("66666666-6666-6666-6666-666666666666");
        dbContext.GoogleOAuthAccountLinks.Add(new GoogleOAuthAccountLink
        {
            Id = accountLinkId,
            HouseholdId = HouseholdId,
            LinkedByUserId = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            GoogleUserId = "google-user-2",
            Email = "owner@example.com",
            DisplayName = "Owner Example",
            AccessToken = "access-token",
            RefreshToken = "refresh-token",
            TokenType = "Bearer",
            Scope = "openid email profile https://www.googleapis.com/auth/calendar.readonly",
            AccessTokenExpiresAtUtc = CreatedAtUtc.AddHours(1),
            CreatedAtUtc = CreatedAtUtc,
            UpdatedAtUtc = CreatedAtUtc
        });
        await dbContext.SaveChangesAsync();

        var oauthClient = new FakeGoogleOAuthClient(
            calendars:
            [
                new GoogleOAuthCalendarSummary(
                    "family@example.com",
                    "Family Calendar",
                    true,
                    "owner",
                    "America/Chicago")
            ],
            events:
            [
                new GoogleOAuthCalendarEvent(
                    "event-1",
                    "School pickup",
                    "Bring snacks",
                    "confirmed",
                    null,
                    "2026-04-15T15:00:00Z",
                    null,
                    null,
                    "2026-04-15T15:30:00Z",
                    null,
                    [],
                    null),
                new GoogleOAuthCalendarEvent(
                    "event-2",
                    "Daily prep",
                    null,
                    "confirmed",
                    null,
                    "2026-04-16T07:00:00Z",
                    null,
                    null,
                    "2026-04-16T07:30:00Z",
                    null,
                    ["RRULE:FREQ=DAILY;COUNT=2"],
                    null),
                new GoogleOAuthCalendarEvent(
                    "event-2-instance",
                    "Daily prep instance",
                    null,
                    "confirmed",
                    null,
                    "2026-04-17T07:00:00Z",
                    null,
                    null,
                    "2026-04-17T07:30:00Z",
                    null,
                    [],
                    "event-2")
            ]);

        var service = new GoogleCalendarIntegrationService(
            dbContext,
            CreateConfiguration(),
            oauthClient,
            new FakeFeedFetcher("BEGIN:VCALENDAR\r\nEND:VCALENDAR"),
            new ImportedScheduledEventSyncService(dbContext));

        var created = await service.CreateManagedLinkAsync(
            HouseholdId,
            new CreateManagedGoogleCalendarLinkRequest(
                accountLinkId,
                "family@example.com",
                "Family Calendar",
                "America/Chicago"),
            CreatedAtUtc,
            CancellationToken.None);

        var synced = await service.SyncAsync(
            HouseholdId,
            created.Link!.Id,
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarSyncResultStatus.Succeeded, synced.Status);
        Assert.Equal(2, synced.Link!.ImportedEventCount);
        Assert.Equal(0, synced.Link.SkippedRecurringEventCount);
        Assert.Equal(1, synced.Link.SkippedRecurringOverrideCount);

        var importedEvents = await dbContext.ScheduledEvents
            .OrderBy(item => item.Title)
            .ToListAsync();

        Assert.Equal(2, importedEvents.Count);
        Assert.All(importedEvents, item => Assert.Equal(EventSourceKinds.GoogleCalendarIcs, item.SourceKind));
        Assert.Contains(importedEvents, item => item.Title == "School pickup");
        Assert.Contains(importedEvents, item => item.RecurrencePattern == EventRecurrencePattern.Daily);
    }

    [Fact]
    public async Task SyncAsync_ClassifiesMissingManagedGoogleAccount_ForRecoveryGuidance()
    {
        await using var dbContext = CreateDbContext();
        var accountLinkId = Guid.Parse("77777777-7777-7777-7777-777777777777");
        var service = new GoogleCalendarIntegrationService(
            dbContext,
            CreateConfiguration(),
            new FakeGoogleOAuthClient(),
            new FakeFeedFetcher("BEGIN:VCALENDAR\r\nEND:VCALENDAR"),
            new ImportedScheduledEventSyncService(dbContext));

        var created = await service.CreateManagedLinkAsync(
            HouseholdId,
            new CreateManagedGoogleCalendarLinkRequest(
                accountLinkId,
                "family@example.com",
                "Family Calendar",
                "America/Chicago"),
            CreatedAtUtc,
            CancellationToken.None);

        Assert.Equal(GoogleCalendarLinkMutationStatus.ValidationFailed, created.Status);

        dbContext.GoogleCalendarConnections.Add(new GoogleCalendarConnection
        {
            Id = Guid.Parse("88888888-8888-8888-8888-888888888888"),
            HouseholdId = HouseholdId,
            DisplayName = "Managed family calendar",
            LinkMode = GoogleCalendarConnection.LinkModeOAuthCalendar,
            GoogleOAuthAccountLinkId = accountLinkId,
            GoogleCalendarId = "family@example.com",
            GoogleCalendarTimeZone = "America/Chicago",
            CreatedAtUtc = CreatedAtUtc,
            AutoSyncEnabled = true,
            SyncIntervalMinutes = 30,
            NextSyncDueAtUtc = CreatedAtUtc
        });
        await dbContext.SaveChangesAsync();

        var synced = await service.SyncAsync(
            HouseholdId,
            Guid.Parse("88888888-8888-8888-8888-888888888888"),
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarSyncResultStatus.Failed, synced.Status);
        Assert.Equal("linked_account_missing", synced.Link!.LastSyncFailureCategory);
        Assert.Contains("Relink", synced.Link.LastSyncRecoveryHint!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SyncAsync_ClassifiesManagedGoogleAccessFailures_WithoutFeedGuidance()
    {
        await using var dbContext = CreateDbContext();
        var accountLinkId = Guid.Parse("99999999-9999-9999-9999-999999999999");
        dbContext.GoogleOAuthAccountLinks.Add(new GoogleOAuthAccountLink
        {
            Id = accountLinkId,
            HouseholdId = HouseholdId,
            LinkedByUserId = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            GoogleUserId = "google-user-3",
            Email = "owner@example.com",
            DisplayName = "Owner Example",
            AccessToken = "access-token",
            RefreshToken = "refresh-token",
            TokenType = "Bearer",
            Scope = "openid email profile https://www.googleapis.com/auth/calendar.readonly",
            AccessTokenExpiresAtUtc = CreatedAtUtc.AddHours(1),
            CreatedAtUtc = CreatedAtUtc,
            UpdatedAtUtc = CreatedAtUtc
        });
        await dbContext.SaveChangesAsync();

        var service = new GoogleCalendarIntegrationService(
            dbContext,
            CreateConfiguration(),
            new FakeGoogleOAuthClient(
                getCalendarEventsException: new InvalidOperationException(
                    "Google Calendar event lookup failed with 403.")),
            new FakeFeedFetcher("BEGIN:VCALENDAR\r\nEND:VCALENDAR"),
            new ImportedScheduledEventSyncService(dbContext));

        var created = await service.CreateManagedLinkAsync(
            HouseholdId,
            new CreateManagedGoogleCalendarLinkRequest(
                accountLinkId,
                "family@example.com",
                "Family Calendar",
                "America/Chicago"),
            CreatedAtUtc,
            CancellationToken.None);

        var synced = await service.SyncAsync(
            HouseholdId,
            created.Link!.Id,
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarSyncResultStatus.Failed, synced.Status);
        Assert.Equal("oauth_access", synced.Link!.LastSyncFailureCategory);
        Assert.Contains("linked Google account", synced.Link.LastSyncRecoveryHint!, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("iCal URL", synced.Link.LastSyncRecoveryHint!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SyncAsync_ClassifiesManagedGoogleTokenFailures_AsReconnectRequired()
    {
        await using var dbContext = CreateDbContext();
        var accountLinkId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        dbContext.GoogleOAuthAccountLinks.Add(new GoogleOAuthAccountLink
        {
            Id = accountLinkId,
            HouseholdId = HouseholdId,
            LinkedByUserId = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            GoogleUserId = "google-user-4",
            Email = "owner@example.com",
            DisplayName = "Owner Example",
            AccessToken = "stale-access-token",
            RefreshToken = "refresh-token",
            TokenType = "Bearer",
            Scope = "openid email profile https://www.googleapis.com/auth/calendar.readonly",
            AccessTokenExpiresAtUtc = CreatedAtUtc.AddMinutes(-5),
            CreatedAtUtc = CreatedAtUtc,
            UpdatedAtUtc = CreatedAtUtc
        });
        await dbContext.SaveChangesAsync();

        var service = new GoogleCalendarIntegrationService(
            dbContext,
            CreateConfiguration(),
            new FakeGoogleOAuthClient(
                refreshAccessTokenException: new InvalidOperationException("invalid_grant")),
            new FakeFeedFetcher("BEGIN:VCALENDAR\r\nEND:VCALENDAR"),
            new ImportedScheduledEventSyncService(dbContext));

        var created = await service.CreateManagedLinkAsync(
            HouseholdId,
            new CreateManagedGoogleCalendarLinkRequest(
                accountLinkId,
                "family@example.com",
                "Family Calendar",
                "America/Chicago"),
            CreatedAtUtc,
            CancellationToken.None);

        var synced = await service.SyncAsync(
            HouseholdId,
            created.Link!.Id,
            CreatedAtUtc.AddMinutes(5),
            CancellationToken.None);

        Assert.Equal(GoogleCalendarSyncResultStatus.Failed, synced.Status);
        Assert.Equal("oauth_reauth_required", synced.Link!.LastSyncFailureCategory);
        Assert.Contains("Reconnect", synced.Link.LastSyncRecoveryHint!, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class FakeFeedFetcher(string feedContent) : IGoogleCalendarFeedFetcher
    {
        public Task<string> FetchAsync(
            string feedUrl,
            CancellationToken cancellationToken) => Task.FromResult(feedContent);
    }

    private sealed class MutableFeedFetcher(string initialContent) : IGoogleCalendarFeedFetcher
    {
        public string Content { get; set; } = initialContent;

        public Task<string> FetchAsync(
            string feedUrl,
            CancellationToken cancellationToken) => Task.FromResult(Content);
    }

    private sealed class ThrowingFeedFetcher(Exception exception) : IGoogleCalendarFeedFetcher
    {
        public Task<string> FetchAsync(
            string feedUrl,
            CancellationToken cancellationToken) => Task.FromException<string>(exception);
    }

    private sealed class FakeGoogleOAuthClient(
        GoogleOAuthTokenResult? tokenResult = null,
        GoogleOAuthUserProfile? userProfile = null,
        IReadOnlyList<GoogleOAuthCalendarSummary>? calendars = null,
        IReadOnlyList<GoogleOAuthCalendarEvent>? events = null,
        Exception? createCalendarEventException = null,
        Exception? updateCalendarEventException = null,
        Exception? deleteCalendarEventException = null,
        Exception? refreshAccessTokenException = null,
        Exception? getCalendarsException = null,
        Exception? getCalendarEventsException = null) : IGoogleOAuthClient
    {
        private readonly GoogleOAuthTokenResult token =
            tokenResult
            ?? new GoogleOAuthTokenResult(
                "token",
                "Bearer",
                3600,
                "openid email profile",
                "refresh");

        private readonly GoogleOAuthUserProfile profile =
            userProfile
            ?? new GoogleOAuthUserProfile(
                "google-user",
                "user@example.com",
                "User Example");

        private readonly IReadOnlyList<GoogleOAuthCalendarSummary> discoveredCalendars =
            calendars
            ?? [];

        private readonly IReadOnlyList<GoogleOAuthCalendarEvent> discoveredEvents =
            events
            ?? [];

        public int RefreshCalls { get; private set; }

        public List<GoogleOAuthCalendarEventUpsertRequest> CreatedEvents { get; } = [];

        public List<(string EventId, GoogleOAuthCalendarEventUpsertRequest Request)> UpdatedEvents { get; } = [];

        public List<string> DeletedEventIds { get; } = [];

        public string BuildAuthorizationUrl(string state) =>
            $"https://accounts.google.com/o/oauth2/v2/auth?state={state}";

        public Task<GoogleOAuthTokenResult> ExchangeCodeAsync(
            string code,
            CancellationToken cancellationToken) => Task.FromResult(token);

        public Task<GoogleOAuthTokenResult> RefreshAccessTokenAsync(
            string refreshToken,
            CancellationToken cancellationToken)
        {
            RefreshCalls++;
            if (refreshAccessTokenException is not null)
            {
                return Task.FromException<GoogleOAuthTokenResult>(refreshAccessTokenException);
            }

            return Task.FromResult(token);
        }

        public Task<GoogleOAuthUserProfile> GetUserProfileAsync(
            string accessToken,
            CancellationToken cancellationToken) => Task.FromResult(profile);

        public Task<IReadOnlyList<GoogleOAuthCalendarSummary>> GetCalendarsAsync(
            string accessToken,
            CancellationToken cancellationToken) =>
            getCalendarsException is null
                ? Task.FromResult(discoveredCalendars)
                : Task.FromException<IReadOnlyList<GoogleOAuthCalendarSummary>>(getCalendarsException);

        public Task<IReadOnlyList<GoogleOAuthCalendarEvent>> GetCalendarEventsAsync(
            string accessToken,
            string calendarId,
            CancellationToken cancellationToken) =>
            getCalendarEventsException is null
                ? Task.FromResult(discoveredEvents)
                : Task.FromException<IReadOnlyList<GoogleOAuthCalendarEvent>>(getCalendarEventsException);

        public Task<GoogleOAuthCalendarEvent> CreateCalendarEventAsync(
            string accessToken,
            string calendarId,
            GoogleOAuthCalendarEventUpsertRequest request,
            CancellationToken cancellationToken)
        {
            CreatedEvents.Add(request);

            if (createCalendarEventException is not null)
            {
                return Task.FromException<GoogleOAuthCalendarEvent>(createCalendarEventException);
            }

            return Task.FromResult(new GoogleOAuthCalendarEvent(
                request.EventId,
                request.Summary,
                request.Description,
                "confirmed",
                request.IsAllDay ? request.StartsAtUtc.UtcDateTime.ToString("yyyy-MM-dd") : null,
                request.IsAllDay ? null : request.StartsAtUtc.UtcDateTime.ToString("O"),
                request.TimeZoneId,
                request.IsAllDay
                    ? (request.EndsAtUtc ?? request.StartsAtUtc).UtcDateTime.Date.AddDays(1).ToString("yyyy-MM-dd")
                    : null,
                request.IsAllDay ? null : (request.EndsAtUtc ?? request.StartsAtUtc).UtcDateTime.ToString("O"),
                request.TimeZoneId,
                request.Recurrence,
                null));
        }

        public Task<GoogleOAuthCalendarEvent> UpdateCalendarEventAsync(
            string accessToken,
            string calendarId,
            string eventId,
            GoogleOAuthCalendarEventUpsertRequest request,
            CancellationToken cancellationToken)
        {
            UpdatedEvents.Add((eventId, request));

            if (updateCalendarEventException is not null)
            {
                return Task.FromException<GoogleOAuthCalendarEvent>(updateCalendarEventException);
            }

            return Task.FromResult(new GoogleOAuthCalendarEvent(
                eventId,
                request.Summary,
                request.Description,
                "confirmed",
                request.IsAllDay ? request.StartsAtUtc.UtcDateTime.ToString("yyyy-MM-dd") : null,
                request.IsAllDay ? null : request.StartsAtUtc.UtcDateTime.ToString("O"),
                request.TimeZoneId,
                request.IsAllDay
                    ? (request.EndsAtUtc ?? request.StartsAtUtc).UtcDateTime.Date.AddDays(1).ToString("yyyy-MM-dd")
                    : null,
                request.IsAllDay ? null : (request.EndsAtUtc ?? request.StartsAtUtc).UtcDateTime.ToString("O"),
                request.TimeZoneId,
                request.Recurrence,
                null));
        }

        public Task DeleteCalendarEventAsync(
            string accessToken,
            string calendarId,
            string eventId,
            CancellationToken cancellationToken)
        {
            DeletedEventIds.Add(eventId);

            return deleteCalendarEventException is null
                ? Task.CompletedTask
                : Task.FromException(deleteCalendarEventException);
        }
    }

    private sealed class FakeClock(DateTimeOffset utcNow) : HouseholdOps.SharedKernel.Time.IClock
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

    private static IConfiguration CreateConfiguration() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>())
            .Build();
}
