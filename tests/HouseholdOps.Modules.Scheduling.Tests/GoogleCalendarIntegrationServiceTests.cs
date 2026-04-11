using HouseholdOps.Infrastructure.Integrations;
using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Infrastructure.Scheduling;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Integrations;
using HouseholdOps.Modules.Integrations.Contracts;
using HouseholdOps.Modules.Scheduling;
using HouseholdOps.Modules.Scheduling.Contracts;
using Microsoft.EntityFrameworkCore;
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
            new UpdateGoogleCalendarLinkSyncSettingsRequest(false, 60),
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
            new UpdateGoogleCalendarLinkSyncSettingsRequest(false, 30),
            CreatedAtUtc.AddMinutes(1),
            CancellationToken.None);

        var updated = await service.UpdateSyncSettingsAsync(
            HouseholdId,
            created.Link.Id,
            new UpdateGoogleCalendarLinkSyncSettingsRequest(true, 15),
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
            new UpdateGoogleCalendarLinkSyncSettingsRequest(false, 30),
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
        Assert.Empty(dbContext.ScheduledEvents);
        Assert.Equal(CreatedAtUtc.AddMinutes(35), synced.Link.NextSyncDueAtUtc);
    }

    [Fact]
    public async Task UpdateEventAsync_ReturnsReadOnly_ForImportedSeries()
    {
        await using var dbContext = CreateDbContext();
        var importSyncService = new ImportedScheduledEventSyncService(dbContext);
        var schedulingService = new ScheduledEventManagementService(
            dbContext,
            new FakeClock(CreatedAtUtc));

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
            new FakeClock(CreatedAtUtc));

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
            new FakeFeedFetcher(feedContent),
            new ImportedScheduledEventSyncService(dbContext));
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

    private sealed class FakeClock(DateTimeOffset utcNow) : HouseholdOps.SharedKernel.Time.IClock
    {
        public DateTimeOffset UtcNow { get; } = utcNow;
    }
}
